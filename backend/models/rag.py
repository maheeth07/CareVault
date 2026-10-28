from pydantic import BaseModel,Field

class RAGQuery(BaseModel):
    patient_id:str
    tenure_id:str
    question:str=Field(min_length=1)