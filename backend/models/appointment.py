from datetime import datetime, date, time
from pydantic import BaseModel

class Appointment(BaseModel):
    patient_id: str
    doctor_id: str
    tenure_id: str
    status: str
    requested_at: datetime
    appointment_date: date | None = None
    appointment_time: time | None = None
    meeting_id: str | None = None
    meeting_link: str | None = None
    created_at:datetime

