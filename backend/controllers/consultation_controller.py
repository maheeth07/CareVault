from fastapi import HTTPException
from models.consultation import Consultation
from db.mng import db
from bson import ObjectId

async def create_consultation(consultation:Consultation):
    if not ObjectId.is_valid(consultation.appointment_id):
        raise HTTPException(
            status_code=404,
            detail="Appointment Not Found"
        )
    appoin=await db.appointments.find_one({
        "_id": ObjectId(consultation.appointment_id)
    })

    if not appoin:
        raise HTTPException(
            status_code=404,
            detail="Appointment Not Found"
        )
    if appoin["status"]!="completed":
        raise HTTPException(
            status_code=400,
            detail="Appointment must be completed before creating a consultation"
        )
    if (consultation.doctor_id!=appoin['doctor_id'] or consultation.patient_id!=appoin["patient_id"] or consultation.tenure_id!=appoin["tenure_id"]):
        raise HTTPException(
            status_code=400,
            detail="Consultation details do not match the appointment"
        )
    consultation_data=consultation.model_dump()
    if consultation_data.get("consultation_date") is not None:
        consultation_data["consultation_date"]=str(consultation_data["consultation_date"])
    result=await db.consultations.insert_one(
        consultation_data
    )
    return {
        "message": "Consultation created successfully",
        "consultation_id": str(result.inserted_id)
    }