from pydantic import BaseModel
class Doctor(BaseModel):
    name:str
    email:str
    password:str
    phone:str
    specialization:str
    qualification:str
    experience:str
    license_no:str


class DoctorLogin(BaseModel):
    email:str
    password:str