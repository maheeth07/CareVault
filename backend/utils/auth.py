import os
from datetime import datetime,timedelta,timezone
from jose import jwt,JWTError
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends,HTTPException,status
from fastapi.security import HTTPBearer,HTTPAuthorizationCredentials
from db.mng import db
security=HTTPBearer()

load_dotenv()

secret_key=os.getenv("JWT_SECRET_KEY")
algorithm=os.getenv("JWT_ALGO")
access_token_expire_minutes=int(os.getenv("JWT_EXP_MIN"))

def create_acc_tok(data:dict):
    payload=data.copy()
    expire=datetime.now(timezone.utc)+timedelta(minutes=access_token_expire_minutes)
    payload["exp"]=expire
    encoded_jwt=jwt.encode(payload,secret_key,algorithm=algorithm)
    return encoded_jwt

async def get_current_doctor(credentials:HTTPAuthorizationCredentials=Depends(security)):
    token=credentials.credentials
    try:
        payload=jwt.decode(token,os.getenv("JWT_SECRET_KEY"),algorithms=[os.getenv("JWT_ALGO","HS256")])
        doctor_id=payload.get("doctor_id")
        if not doctor_id or not ObjectId.is_valid(doctor_id):
            raise HTTPException(status_code=401,detail="Invalid authentication token")
    except JWTError:
        raise HTTPException(status_code=401,detail="Invalid or expired token")
    doctor=await db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if not doctor:
        raise HTTPException(status_code=401,detail="Doctor not found")
    return doctor

async def get_current_patient(credentials:HTTPAuthorizationCredentials=Depends(security)):
    token=credentials.credentials
    try:
        payload=jwt.decode(token,os.getenv("JWT_SECRET_KEY"),algorithms=[os.getenv("JWT_ALGO","HS256")])
        patient_id=payload.get("patient_id")
        if not patient_id or not ObjectId.is_valid(patient_id):
            raise HTTPException(status_code=401,detail="Invalid authentication token")
    except JWTError:
        raise HTTPException(status_code=401,detail="Invalid or expired token")
    patient=await db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        raise HTTPException(status_code=401,detail="Patient not found")
    return patient