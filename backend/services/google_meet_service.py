import os
import re
import time
import httpx
from bson import ObjectId
from db.mng import db

MEET_API_BASE = "https://meet.googleapis.com/v2"


def extract_meeting_code(meet_url: str) -> str:
    """Extract the meeting code from a Google Meet URL."""
    clean_url = meet_url.strip().split("?")[0].rstrip("/")
    match = re.search(r"([a-zA-Z0-9]{3}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{3})", clean_url)
    if match:
        return match.group(1).lower()

    match = re.search(
        r"(?:https?://)?meet\.google\.com/(?:(?:meet|_meet)/)?([a-zA-Z0-9-]+)",
        clean_url
    )
    if not match:
        raise ValueError("Invalid Google Meet URL")
    return match.group(1)


async def fetch_json(
    client: httpx.AsyncClient,
    url: str,
    access_token: str,
    params: dict | None = None
) -> dict:
    """Send an authenticated request to the Google Meet API."""
    response = await client.get(
        url,
        headers={
            "Authorization": f"Bearer {access_token}"
        },
        params=params
    )

    response.raise_for_status()
    return response.json()


async def list_all_pages(
    client: httpx.AsyncClient,
    url: str,
    access_token: str,
    result_key: str,
    params: dict | None = None
) -> list:
    """Retrieve all pages of an API response."""
    results = []
    page_token = None

    while True:
        request_params = dict(params or {})

        if page_token:
            request_params["pageToken"] = page_token

        data = await fetch_json(
            client=client,
            url=url,
            access_token=access_token,
            params=request_params
        )

        results.extend(data.get(result_key, []))

        page_token = data.get("nextPageToken")

        if not page_token:
            break

    return results


async def fetch_meet_transcript(
    meet_url: str,
    access_token: str
) -> str:
    """
    Fetch a generated Google Meet transcript.

    Args:
        meet_url: Google Meet meeting URL.
        access_token: Valid Google OAuth access token.

    Returns:
        Transcript text as a string.
    """
    meeting_code = extract_meeting_code(meet_url)

    async with httpx.AsyncClient(timeout=30) as client:
        conferences = await list_all_pages(
            client=client,
            url=f"{MEET_API_BASE}/conferenceRecords",
            access_token=access_token,
            result_key="conferenceRecords",
            params={
                "filter": f'space.meeting_code="{meeting_code}"',
                "pageSize": 100
            }
        )

        if not conferences:
            raise LookupError(
                "No conference record found for this meeting. "
                "Verify access and check whether the meeting has ended."
            )

        # Select the latest session.
        conference = max(
            conferences,
            key=lambda item: item.get("startTime", "")
        )

        conference_name = conference["name"]

        # List transcripts for this conference.
        transcripts = await list_all_pages(
            client=client,
            url=f"{MEET_API_BASE}/{conference_name}/transcripts",
            access_token=access_token,
            result_key="transcripts",
            params={"pageSize": 100}
        )

        # Select a transcript whose file is generated.
        ready_transcripts = [
            item for item in transcripts
            if item.get("state") == "FILE_GENERATED"
        ]

        if not ready_transcripts:
            raise LookupError(
                "No generated transcript is available yet. "
                "Check whether transcription was enabled."
            )

        transcript_resource = max(
            ready_transcripts,
            key=lambda item: item.get("startTime", "")
        )

        # Fetch transcript entries.
        entries_url = (
            f"{MEET_API_BASE}/"
            f"{transcript_resource['name']}/entries"
        )

        entries = await list_all_pages(
            client=client,
            url=entries_url,
            access_token=access_token,
            result_key="transcriptEntries",
            params={"pageSize": 100}
        )

        # Sort entries chronologically.
        entries.sort(
            key=lambda entry: entry.get("startTime", "")
        )

        # Combine transcript text.
        lines = []
        for entry in entries:
            text = entry.get("text", "").strip()
            if text:
                lines.append(text)

        transcript_text = "\n".join(lines)

        if not transcript_text:
            raise LookupError(
                "The transcript exists, but contains no text entries."
            )

        return transcript_text


async def get_valid_google_token_for_doctor(doctor_id: str) -> str:
    """
    Retrieve a valid Google OAuth access token for a doctor.
    Automatically refreshes expired access tokens using the stored refresh_token.
    """
    if not ObjectId.is_valid(doctor_id):
        raise ValueError(f"Invalid doctor ID: {doctor_id}")

    doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if not doctor:
        raise LookupError(f"Doctor with ID {doctor_id} not found in database.")

    auth = doctor.get("google_auth") or {}
    refresh_token = auth.get("refresh_token")
    if not refresh_token:
        # Fallback check across doctors in database for valid Google OAuth credentials (e.g. for development / unified credentials)
        fallback_doc = await db.doctors.find_one({
            "google_auth.refresh_token": {"$exists": True, "$ne": None}
        })
        if fallback_doc and fallback_doc.get("google_auth", {}).get("refresh_token"):
            auth = fallback_doc["google_auth"]
            refresh_token = auth.get("refresh_token")
            await db.doctors.update_one(
                {"_id": ObjectId(doctor_id)},
                {"$set": {"google_auth": auth}}
            )
        else:
            doctor_name = doctor.get("name", str(doctor_id))
            raise ValueError(
                f"Doctor '{doctor_name}' has not connected their Google account yet. "
                f"Please visit /auth/google/login?doctor_id={doctor_id} to authorize."
            )

    # If the current access token is still valid (with a 60-second safety window), reuse it
    expires_at = auth.get("expires_at", 0)
    current_access_token = auth.get("access_token")
    if current_access_token and time.time() < (expires_at - 60):
        return current_access_token

    # Otherwise, silently fetch a fresh access token using the refresh_token
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            }
        )
        if resp.status_code != 200:
            raise ValueError(f"Failed to refresh Google access token: {resp.text}")

        new_tokens = resp.json()

    new_access_token = new_tokens.get("access_token")
    if not new_access_token:
        raise ValueError(f"Google token response did not contain an access_token: {new_tokens}")

    expires_in = new_tokens.get("expires_in", 3600)
    await db.doctors.update_one(
        {"_id": ObjectId(doctor_id)},
        {"$set": {
            "google_auth.access_token": new_access_token,
            "google_auth.expires_at": time.time() + expires_in
        }}
    )
    return new_access_token
