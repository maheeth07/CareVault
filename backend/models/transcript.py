from pydantic import BaseModel

class Transcript(BaseModel):
    consultation_id:str
    transcript:str
