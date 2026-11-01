from fastapi import APIRouter, Body
from pydantic import BaseModel
from controllers.consultation_controller import (
    create_consultation,
    get_consultation_by_appointment,
    get_consultation,
    add_consultation_transcript
)
from models.consultation import Consultation

router = APIRouter()

class AddTranscriptRequest(BaseModel):
    transcript: str

@router.post("/consultation/create")
async def create_consultation_route(consultation: Consultation):
    return await create_consultation(consultation)

@router.get("/consultations/appointment/{appointment_id}")
async def get_consultation_by_appointment_route(appointment_id: str):
    return await get_consultation_by_appointment(appointment_id)

@router.get("/consultations/{consultation_id}")
async def get_consultation_route(consultation_id: str):
    return await get_consultation(consultation_id)

@router.post("/consultations/{consultation_id}/transcript")
async def add_transcript_route(
    consultation_id: str,
    payload: AddTranscriptRequest = Body(...)
):
    return await add_consultation_transcript(consultation_id, payload.transcript)
