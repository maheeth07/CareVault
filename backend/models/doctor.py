from pydantic import BaseModel
class Doctor(BaseModel):
    name:str
    email:str
    password:str
    phone:int
    specialization:str
    qualification:str
    experience:int
    license_no:str


class DoctorLogin(BaseModel):
    email:str
    password:str