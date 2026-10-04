from fastapi import APIRouter
from controllers.consultation_controller import create_consultation
from models.consultation import Consultation

router=APIRouter()

@router.post("/consultation/create")
async def create_consultation_route(consultation:Consultation):
    return await create_consultation(consultation)