from bson import datetime_ms
from models.patient import PatientLogin
from models.patient import Patient
from db.mng import db
import bcrypt
from fastapi import HTTPException
from utils.auth import create_acc_tok
from datetime import datetime


def verify_password(plain_pass:str,hashed_pass:str):
    return bcrypt.checkpw(plain_pass.encode('utf-8'),hashed_pass.encode('utf-8'))

def hash_password(password:str):
    return bcrypt.hashpw(password.encode('utf-8'),bcrypt.gensalt())

async def create_patient(patient:Patient):
    exist_patient=await db.patients.find_one({
        "email":patient.email
    })
    if exist_patient:
        return {"error":"Email already exists"}
    patient_data=patient.model_dump()
    if patient_data.get("dob"):
        patient_data["dob"] = datetime.combine(
            patient_data["dob"],
            datetime.min.time()
        )
    patient_data['password']=hash_password(patient_data['password']).decode('utf-8')
    result=await db.patients.insert_one(patient_data)
    return {"message":"Patient created successfully.","id":str(result.inserted_id)}


async def login_patient(patient:PatientLogin):
    ext_pat=await db.patients.find_one({
        "email":patient.email
    })
    if not ext_pat:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(patient.password,ext_pat['password']):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    token=create_acc_tok({
        "patient_id":str(ext_pat["_id"]),
        "email":ext_pat["email"]
    })
    return {
        "message":"Login Successfull!",
        "access_token":token,
        "token_type":"bearer"   
    }