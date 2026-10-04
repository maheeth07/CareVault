from datetime import date
from pydantic import BaseModel
class Patient(BaseModel):
    name:str
    email:str
    password:str
    phone:str
    dob:date
    gender:str
    blood_group:str
    emergency_contact:str

class PatientLogin(BaseModel):
    email:str
    password:str