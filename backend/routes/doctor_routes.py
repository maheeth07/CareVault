from controllers.doctor_controller import login_doctor
from models.doctor import Doctor,DoctorLogin
from controllers.doctor_controller import create_doctor,search_doctors
from fastapi import APIRouter,Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


router=APIRouter()
security=HTTPBearer()

@router.post("/doctor/register")
async def doctor_register_route(doctor:Doctor):
    return await create_doctor(doctor)

@router.post("/doctor/login")
async def doctor_login_route(doctor:DoctorLogin):
    return await login_doctor(doctor)

@router.get("/doctor/protected-test")
async def protected_test(
   credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    return {"message": "Bearer token received"}

@router.get("/doctors")
async def list_or_search_doctors(name: str = ""):
    return await search_doctors(name)
