import os
import json
import time
import urllib.parse
import httpx
from fastapi import APIRouter, HTTPException, Query, Header, Body
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from bson import ObjectId

from db.mng import db
from services.google_meet_service import fetch_meet_transcript, get_valid_google_token_for_doctor
from controllers.transcript_controller import process_transcript
from models.transcript import Transcript

router = APIRouter(tags=["Google Meet"])


class GoogleMeetRequest(BaseModel):
    meet_url: str | None = None
    access_token: str | None = None


@router.get("/auth/google/login")
async def google_login(
    doctor_id: str | None = None,
    consultation_id: str | None = None,
    meet_url: str | None = None
):
    """
    Redirects user/doctor to Google OAuth consent screen to authenticate for Google Meet API.
    Can attach doctor_id, consultation_id, and/or meet_url in the OAuth state.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
    scope = "https://www.googleapis.com/auth/meetings.space.readonly"

    if not client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured in .env")

    state_dict = {}
    if doctor_id:
        state_dict["doctor_id"] = doctor_id
    if consultation_id:
        state_dict["consultation_id"] = consultation_id
    if meet_url:
        state_dict["meet_url"] = meet_url

    state_str = urllib.parse.quote(json.dumps(state_dict)) if state_dict else ""

    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={urllib.parse.quote(client_id)}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        f"response_type=code&"
        f"scope={urllib.parse.quote(scope)}&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    if state_str:
        auth_url += f"&state={state_str}"

    return RedirectResponse(url=auth_url)


@router.get("/auth/google/callback")
async def google_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: str | None = Query(None, description="State containing doctor_id, consultation_id, meet_url")
):
    """
    Receives authorization code from Google, exchanges it for an access token and refresh token.
    Saves Google credentials against the doctor if doctor_id is present in state.
    Optionally executes transcript ingestion if consultation_id and meet_url are provided in state.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth credentials are not configured in .env")

    async with httpx.AsyncClient(timeout=30) as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            }
        )

    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=token_resp.status_code,
            detail=f"Failed to exchange authorization code for token: {token_resp.text}"
        )

    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)

    doctor_linked = False

    # Process state data if present
    if state:
        try:
            state_data = json.loads(urllib.parse.unquote(state))
            doctor_id = state_data.get("doctor_id")
            consultation_id = state_data.get("consultation_id")
            meet_url = state_data.get("meet_url")

            # 1. If doctor_id is provided, persist Google tokens to Doctor profile
            if doctor_id and ObjectId.is_valid(doctor_id):
                update_fields = {
                    "google_auth.access_token": access_token,
                    "google_auth.expires_at": time.time() + expires_in,
                    "google_auth.is_connected": True
                }
                if refresh_token:
                    update_fields["google_auth.refresh_token"] = refresh_token

                await db.doctors.update_one(
                    {"_id": ObjectId(doctor_id)},
                    {"$set": update_fields}
                )
                doctor_linked = True

            # 2. If consultation_id and meet_url are provided, auto-fetch & process transcript
            if consultation_id and meet_url:
                transcript_text = await fetch_meet_transcript(
                    meet_url=meet_url,
                    access_token=access_token
                )
                ingest_result = await process_transcript(
                    Transcript(
                        consultation_id=consultation_id,
                        transcript=transcript_text
                    )
                )
                return {
                    "message": "Transcript fetched and processed successfully via OAuth callback",
                    "consultation_id": consultation_id,
                    "doctor_linked": doctor_linked,
                    "ingestion_status": ingest_result.get("ingestion_status"),
                    "chunks_stored": ingest_result.get("chunks_stored"),
                    "access_token": access_token
                }
        except (LookupError, ValueError) as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            return {
                "message": f"Token obtained, but transcript processing failed: {str(e)}",
                "doctor_linked": doctor_linked,
                "access_token": access_token
            }

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000/doctor?google_connected=true")
    if doctor_linked:
        return RedirectResponse(url=frontend_url)

    return {
        "message": "Google OAuth authorization successful",
        "doctor_linked": doctor_linked,
        "access_token": access_token,
        "has_refresh_token": bool(refresh_token),
        "expires_in": expires_in,
        "scope": token_data.get("scope")
    }


@router.post("/google-meet/transcript/{consultation_id}")
async def get_google_meet_transcript(
    consultation_id: str,
    meet_url: str | None = Query(None),
    access_token: str | None = Query(None),
    payload: GoogleMeetRequest | None = Body(None),
    authorization: str | None = Header(None)
):
    """
    Fetch Google Meet transcript using an explicit access token and pass it to process_transcript().
    Accepts meet_url and access_token via query params, JSON body, or Authorization header.
    """
    url = (payload.meet_url if payload and payload.meet_url else meet_url)
    token = (payload.access_token if payload and payload.access_token else access_token)

    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()

    if not url:
        raise HTTPException(status_code=400, detail="meet_url is required (via query param or JSON body)")

    if not token:
        raise HTTPException(status_code=400, detail="access_token is required (via query param, JSON body, or Authorization header)")

    try:
        transcript_text = await fetch_meet_transcript(
            meet_url=url,
            access_token=token
        )
        result = await process_transcript(
            Transcript(
                consultation_id=consultation_id,
                transcript=transcript_text
            )
        )
        return result
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Google Meet API error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/consultations/{consultation_id}/fetch-transcript")
async def sync_transcript(
    consultation_id: str,
    meet_url: str | None = Query(None, description="Optional Google Meet URL override"),
    payload: GoogleMeetRequest | None = Body(None)
):
    """
    Fetch Google Meet transcript automatically using the doctor's stored Google credentials.
    Accepts meet_url optionally via query param or JSON body if not set in the appointment.
    """
    if not ObjectId.is_valid(consultation_id):
        raise HTTPException(status_code=400, detail=f"Invalid consultation ID: {consultation_id}")

    consultation = await db.consultations.find_one({"_id": ObjectId(consultation_id)})
    if not consultation:
        raise HTTPException(status_code=404, detail=f"Consultation with ID {consultation_id} not found.")

    doctor_id = consultation.get("doctor_id")
    if not doctor_id:
        raise HTTPException(status_code=400, detail="Consultation is missing an associated doctor_id.")

    appointment_id = consultation.get("appointment_id")
    if not appointment_id or not ObjectId.is_valid(str(appointment_id)):
        raise HTTPException(status_code=400, detail="Consultation is missing a valid appointment_id.")

    appointment = await db.appointments.find_one({"_id": ObjectId(str(appointment_id))})
    if not appointment:
        raise HTTPException(status_code=404, detail=f"Appointment with ID {appointment_id} not found.")

    # 1. Resolve meet_url: from payload, query param, or appointment record
    url = (payload.meet_url if payload and payload.meet_url else meet_url) or appointment.get("meeting_link") or appointment.get("meet_url")
    if not url:
        raise HTTPException(
            status_code=400,
            detail="Appointment has no meeting_link or meet_url configured. You can supply it in the request as ?meet_url=https://meet.google.com/xxx-yyyy-zzz or in JSON body."
        )

    # If the appointment didn't have the meeting_link saved, persist it now for future reference
    if not appointment.get("meeting_link"):
        await db.appointments.update_one(
            {"_id": appointment["_id"]},
            {"$set": {"meeting_link": url}}
        )

    try:
        # 2. Silently get or refresh the doctor's active Google access token
        token = await get_valid_google_token_for_doctor(str(doctor_id))

        # 3. Fetch transcript from Google Meet API
        transcript_text = await fetch_meet_transcript(
            meet_url=url,
            access_token=token
        )

        # 3. Process into RAG vectorstore
        result = await process_transcript(Transcript(
            consultation_id=consultation_id,
            transcript=transcript_text
        ))
        return result
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Google Meet API error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
