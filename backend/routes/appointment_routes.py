from fastapi import APIRouter
from datetime import date, time
from models.appointment import Appointment
from controllers.appointment_controller import (
    create_appointment,
    get_patient_appointments,
    get_doctor_requests,
    accept_appointment,
    reject_appointment,
    complete_appointment
)


router = APIRouter()


@router.post("/appointments/request")
async def request_appointment_route(
    appointment: Appointment
):
    return await create_appointment(appointment)


@router.get("/appointments/patient/{patient_id}")
async def patient_appointments_route(
    patient_id: str
):
    return await get_patient_appointments(patient_id)


@router.get("/appointments/doctor/{doctor_id}/requests")
async def doctor_requests_route(
    doctor_id: str
):
    return await get_doctor_requests(doctor_id)


@router.put("/appointments/{appointment_id}/accept")
async def accept_appointment_route(
    appointment_id: str,
    appointment_date: date,
    appointment_time: time,
    meeting_id: str,
    meeting_link: str
):
    return await accept_appointment(
        appointment_id,
        appointment_date,
        appointment_time,
        meeting_id,
        meeting_link
    )


@router.put("/appointments/{appointment_id}/reject")
async def reject_appointment_route(
    appointment_id: str
):
    return await reject_appointment(appointment_id)


@router.put("/appointments/{appointment_id}/complete")
async def complete_appointment_route(
    appointment_id: str
):
    return await complete_appointment(appointment_id)