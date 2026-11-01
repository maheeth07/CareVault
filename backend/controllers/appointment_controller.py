from datetime import date, time
from fastapi import HTTPException
from bson import ObjectId
from models.appointment import Appointment
from db.mng import db
from services.google_meet_service import get_valid_google_token_for_doctor, fetch_meet_transcript
from controllers.transcript_controller import process_transcript
from models.transcript import Transcript


async def create_appointment(appointment: Appointment):
    ext_pat = await db.patients.find_one({"_id": ObjectId(appointment.patient_id)})
    ext_doc = await db.doctors.find_one({"_id": ObjectId(appointment.doctor_id)})
    ext_ten = await db.tenures.find_one({"_id": ObjectId(appointment.tenure_id)})

    appointment_data = appointment.model_dump()
    appointment_data["patient_name"] = ext_pat["name"] if ext_pat else "Patient"
    appointment_data["doctor_name"] = ext_doc["name"] if ext_doc else "Doctor"
    appointment_data["tenure_title"] = ext_ten["title"] if ext_ten else "Medical Tenure"

    result = await db.appointments.insert_one(appointment_data)
    return {"message": "Appointment requested", "appointment_id": str(result.inserted_id)}


async def _enrich_appointment(appt: dict):
    appt["_id"] = str(appt["_id"])
    if not appt.get("patient_name") and ObjectId.is_valid(appt.get("patient_id")):
        p = await db.patients.find_one({"_id": ObjectId(appt["patient_id"])})
        appt["patient_name"] = p["name"] if p else "Patient"
    if not appt.get("doctor_name") and ObjectId.is_valid(appt.get("doctor_id")):
        d = await db.doctors.find_one({"_id": ObjectId(appt["doctor_id"])})
        appt["doctor_name"] = d["name"] if d else "Doctor"
    if not appt.get("tenure_title") and ObjectId.is_valid(appt.get("tenure_id")):
        t = await db.tenures.find_one({"_id": ObjectId(appt["tenure_id"])})
        appt["tenure_title"] = t["title"] if t else "Medical Tenure"

    # Attach consultation metadata
    c = await db.consultations.find_one({"appointment_id": appt["_id"]})
    appt["consultation_id"] = str(c["_id"]) if c else None
    appt["ingestion_status"] = c.get("ingestion_status") if c else None
    appt["chunks_stored"] = c.get("chunks_stored", 0) if c else 0
    appt["has_transcript"] = bool(c and c.get("transcript"))
    return appt


async def get_patient_appointments(patient_id: str):
    appointments = await db.appointments.find({"patient_id": patient_id}).to_list(None)
    return [await _enrich_appointment(a) for a in appointments]


async def get_doctor_appointments(doctor_id: str):
    appointments = await db.appointments.find({"doctor_id": doctor_id}).to_list(None)
    return [await _enrich_appointment(a) for a in appointments]


async def get_doctor_requests(doctor_id: str):
    appointments = await db.appointments.find({"doctor_id": doctor_id, "status": "requested"}).to_list(None)
    return [await _enrich_appointment(a) for a in appointments]


async def accept_appointment(
    appointment_id: str,
    appointment_date: date,
    appointment_time: time,
    meeting_id: str,
    meeting_link: str
):
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID")
    res = await db.appointments.update_one(
        {"_id": ObjectId(appointment_id), "status": "requested"},
        {"$set": {
            "status": "scheduled",
            "appointment_date": str(appointment_date) if appointment_date else None,
            "appointment_time": str(appointment_time) if appointment_time else None,
            "meeting_id": meeting_id,
            "meeting_link": meeting_link
        }}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment request not found")
    return {"message": "Appointment accepted and scheduled"}


async def reject_appointment(appointment_id: str):
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID")
    res = await db.appointments.update_one(
        {"_id": ObjectId(appointment_id), "status": "requested"},
        {"$set": {"status": "rejected"}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment rejected"}


async def complete_appointment(appointment_id: str, transcript: str | None = None):
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    appt = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    await db.appointments.update_one({"_id": appt["_id"]}, {"$set": {"status": "completed"}})

    # Find or create consultation
    consultation = await db.consultations.find_one({"appointment_id": str(appt["_id"])})
    if not consultation:
        c_doc = {
            "doctor_id": str(appt["doctor_id"]),
            "patient_id": str(appt["patient_id"]),
            "tenure_id": str(appt["tenure_id"]),
            "appointment_id": str(appt["_id"]),
            "consultation_date": appt.get("appointment_date") or str(date.today()),
            "transcript": None,
            "ingestion_status": "pending",
            "chunks_stored": 0,
        }
        res = await db.consultations.insert_one(c_doc)
        c_doc["_id"] = res.inserted_id
        consultation = c_doc

    c_id = str(consultation["_id"])
    await db.appointments.update_one({"_id": appt["_id"]}, {"$set": {"consultation_id": c_id}})

    # Fetch and ingest transcript if not already ingested
    transcript_text = transcript or consultation.get("transcript")
    if not transcript_text and appt.get("meeting_link"):
        try:
            token = await get_valid_google_token_for_doctor(str(appt["doctor_id"]))
            transcript_text = await fetch_meet_transcript(appt["meeting_link"], token)
        except Exception as e:
            await db.consultations.update_one(
                {"_id": consultation["_id"]},
                {"$set": {"ingestion_status": "pending", "error": str(e)}}
            )
            return {"message": f"Completed, transcript pending: {e}", "consultation_id": c_id}

    if transcript_text and consultation.get("ingestion_status") != "completed":
        res = await process_transcript(Transcript(consultation_id=c_id, transcript=transcript_text))
        return {
            "message": "Meeting completed and transcript ingested",
            "consultation_id": c_id,
            "chunks_stored": res.get("chunks_stored", 0)
        }

    return {"message": "Meeting marked as completed", "consultation_id": c_id}
