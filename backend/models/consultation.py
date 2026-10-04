
from pydantic import BaseModel
from datetime import date
class Consultation(BaseModel):
    doctor_id:str
    patient_id:str
    tenure_id:str
    appointment_id:str
    transcript:str|None=None
    consultation_date:date

