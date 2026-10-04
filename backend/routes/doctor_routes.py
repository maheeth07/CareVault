from controllers.doctor_controller import login_doctor
from models.doctor import DoctorLogin
from controllers.doctor_controller import create_doctor
from fastapi import APIRouter
from models.doctor import Doctor
router=APIRouter()

@router.post("/doctor/register")
async def doctor_register_route(doctor:Doctor):
    return await create_doctor(doctor)

@router.post("/doctor/login")
async def doctor_login_route(doctor:DoctorLogin):
    return await login_doctor(doctor)