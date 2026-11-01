from fastapi import HTTPException
from models.consultation import Consultation
from db.mng import db
from bson import ObjectId
from controllers.transcript_controller import process_transcript
from models.transcript import Transcript

async def create_consultation(consultation: Consultation):
    if not ObjectId.is_valid(consultation.appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    appoin = await db.appointments.find_one({"_id": ObjectId(consultation.appointment_id)})
    if not appoin:
        raise HTTPException(status_code=404, detail="Appointment Not Found")

    data = consultation.model_dump()
    if data.get("consultation_date"):
        data["consultation_date"] = str(data["consultation_date"])

    result = await db.consultations.insert_one(data)
    c_id = str(result.inserted_id)
    await db.appointments.update_one({"_id": appoin["_id"]}, {"$set": {"consultation_id": c_id}})
    return {"message": "Consultation created successfully", "consultation_id": c_id}


async def get_consultation_by_appointment(appointment_id: str):
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    c = await db.consultations.find_one({"appointment_id": str(appointment_id)})
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    c["_id"] = str(c["_id"])
    return c


async def get_consultation(consultation_id: str):
    if not ObjectId.is_valid(consultation_id):
        raise HTTPException(status_code=400, detail="Invalid consultation ID")
    c = await db.consultations.find_one({"_id": ObjectId(consultation_id)})
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    c["_id"] = str(c["_id"])
    return c


async def add_consultation_transcript(consultation_id: str, transcript_text: str):
    if not ObjectId.is_valid(consultation_id):
        raise HTTPException(status_code=400, detail="Invalid consultation ID")
    if not transcript_text or not transcript_text.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")

    return await process_transcript(Transcript(
        consultation_id=consultation_id,
        transcript=transcript_text.strip()
    ))
