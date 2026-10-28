from datetime import date,time
# from h11 import status_code
from fastapi import HTTPException
from bson import ObjectId
from models.appointment import Appointment
from db.mng import db

async def create_appointment(appointment: Appointment):
    ext_pat = await db.patients.find_one({"_id": ObjectId(appointment.patient_id)})
    ext_doc = await db.doctors.find_one({"_id": ObjectId(appointment.doctor_id)})
    ext_ten = await db.tenures.find_one({"_id": ObjectId(appointment.tenure_id)})

    appointment_data = appointment.model_dump()
    # Save names alongside IDs
    appointment_data["patient_name"] = ext_pat["name"]
    appointment_data["doctor_name"] = ext_doc["name"]
    appointment_data["tenure_title"] = ext_ten["title"]

    result = await db.appointments.insert_one(appointment_data)
    return {"message": "Appointment requested", "appointment_id": str(result.inserted_id)}



async def get_patient_appointments(patient_id: str):
    appointments = await db.appointments.find({
        "patient_id": patient_id
    }).to_list(length=None)
    for appointment in appointments:
        appointment["_id"] = str(appointment["_id"])
        if not appointment.get("doctor_name") and ObjectId.is_valid(appointment.get("doctor_id")):
            doc = await db.doctors.find_one({"_id": ObjectId(appointment["doctor_id"])})
            appointment["doctor_name"] = doc["name"] if doc else "Doctor"
        if not appointment.get("tenure_title") and ObjectId.is_valid(appointment.get("tenure_id")):
            ten = await db.tenures.find_one({"_id": ObjectId(appointment["tenure_id"])})
            appointment["tenure_title"] = ten["title"] if ten else "Medical Tenure"
    return appointments



async def get_doctor_requests(doctor_id: str):
    appointments = await db.appointments.find({
        "doctor_id": doctor_id,
        "status": "requested"
    }).to_list(length=None)
    for appointment in appointments:
        appointment["_id"] = str(appointment["_id"])
        if not appointment.get("patient_name") and ObjectId.is_valid(appointment.get("patient_id")):
            pat = await db.patients.find_one({"_id": ObjectId(appointment["patient_id"])})
            appointment["patient_name"] = pat["name"] if pat else "Patient"
        if not appointment.get("tenure_title") and ObjectId.is_valid(appointment.get("tenure_id")):
            ten = await db.tenures.find_one({"_id": ObjectId(appointment["tenure_id"])})
            appointment["tenure_title"] = ten["title"] if ten else "Medical Tenure"
    return appointments


async def accept_appointment(appointment_id:str,appointment_date:date,appointment_time:time,meeting_id:str,meeting_link:str):
    appointment=await db.appointments.find_one({
        "_id":ObjectId(appointment_id),
        "status":"requested"
    })
    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment request not found"
        )
    await db.appointments.update_one(
        {
            "_id":ObjectId(appointment_id)
        },
        {
            "$set":{
                "status": "scheduled",
                "appointment_date": str(appointment_date) if appointment_date is not None else None,
                "appointment_time": str(appointment_time) if appointment_time is not None else None,
                "meeting_id": meeting_id,
                "meeting_link": meeting_link
            }
        }
    )
    return {"message":"Appointment accepted and scheduled"}

async def get_doctor_appointments(doctor_id: str):
    appointments = await db.appointments.find({"doctor_id": doctor_id}).to_list(None)

    for appt in appointments:
        appt["_id"] = str(appt["_id"])
        
        if ObjectId.is_valid(appt.get("patient_id")):
            patient = await db.patients.find_one({"_id": ObjectId(appt["patient_id"])})
            appt["patient_name"] = patient["name"] if patient else "Unknown Patient"
        
        if ObjectId.is_valid(appt.get("tenure_id")):
            tenure = await db.tenures.find_one({"_id": ObjectId(appt["tenure_id"])})
            appt["tenure_title"] = tenure["title"] if tenure else "General Tenure"

    return appointments



async def reject_appointment(appointment_id:str):
    appoin=await db.appointments.find_one({
        "_id":ObjectId(appointment_id),
        "status":"requested"
    })
    if not appoin:
        raise HTTPException(
            status_code=404,
            detail="Appointment Not found"
        )
    await db.appointments.update_one(
        {
            "_id": ObjectId(appointment_id)
        },
        {
            "$set": {
                "status": "rejected"
            }
        }
    )
    return {
        "message":"Appointment rejected"
    }



async def complete_appointment(appointment_id: str):
    appointment = await db.appointments.find_one({
        "_id": ObjectId(appointment_id),
        "status": "scheduled"
    })
    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Scheduled appointment not found"
        )
    await db.appointments.update_one(
        {
            "_id": ObjectId(appointment_id)
        },
        {
            "$set": {
                "status": "completed"
            }
        }
    )
    return {
        "message": "Meeting marked as completed"
    }