from backend.utils.auth import create_acc_tok
from fastapi import HTTPException
from models.doctor import Doctor
from db.mng import db
import bcrypt
from models.doctor import DoctorLogin


def verify_password(plain_pass:str,hashed_pass:str):
    return bcrypt.checkpw(plain_pass.encode('utf-8'),hashed_pass.encode('utf-8'))

def hash_password(password:str):
    return bcrypt.hashpw(password.encode('utf-8'),bcrypt.gensalt())

async def create_doctor(doctor:Doctor):
    exist_doctor=await db.doctors.find_one({
        "email":doctor.email
    })
    if exist_doctor:
        return {"error":"Email already exists."}
    doctor_data=doctor.model_dump()
    doctor_data['password']=hash_password(doctor_data['password']).decode('utf-8')
    result=await db.doctors.insert_one(doctor_data)
    return {"message":"Doctor created successfully.","id":str(result.inserted_id)}

async def login_doctor(doctor:DoctorLogin):
    ext_doc=await db.doctor.find_one({
        "email":doctor.email
    })
    if not ext_doc:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(doctor.password,ext_doc['password']):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    token=create_acc_tok({
        "doctor_id":str(doctor["_id"]),
        "email":doctor["email"]
    })
    return {
        "message":"Login Successfull!",
        "access_token":token,
        "token_type":"bearer"   
    }