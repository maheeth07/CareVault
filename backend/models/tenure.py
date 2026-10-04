from datetime import datetime
from pydantic import BaseModel
class Tenure(BaseModel):
    patient_id:str
    title:str
    description:str
    status:str
    created_at:datetime