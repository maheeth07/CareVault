from fastapi import FastAPI
from db.mng import create_indexes
from dotenv import load_dotenv
from routes.doctor_routes import router as doctor_router
from routes.patient_routes import router as patient_router
from routes.tenure_routes import router as tenure_router
from routes.appointment_routes import router as appointment_router

load_dotenv()

app=FastAPI()

@app.on_event("startup")
async def startup():
    await create_indexes()

app.include_router(doctor_router)
app.include_router(patient_router)
app.include_router(tenure_router)
app.include_router(appointment_router)


@app.get("/")
async def root():
    return {"message": "CareVault API is running"}