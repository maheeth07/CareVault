from controllers.patient_controller import create_patient
from controllers.patient_controller import login_patient,search_patients
from fastapi import APIRouter
from models.patient import PatientLogin,Patient


router=APIRouter()

@router.post('/patient/register')
async def patient_register_route(patient:Patient):
    return await create_patient(patient)

@router.post("/patient/login")
async def patient_login_route(patient:PatientLogin):
    return await login_patient(patient)

@router.get("/patients")
async def list_or_search_patients(name: str = ""):
    return await search_patients(name)
