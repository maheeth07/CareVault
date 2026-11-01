from fastapi import FastAPI
from db.mng import create_indexes
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes.doctor_routes import router as doctor_router
from routes.patient_routes import router as patient_router
from routes.tenure_routes import router as tenure_router
from routes.appointment_routes import router as appointment_router
from routes.consultation_routes import router as consultation_router
from routes.transcript_routes import router as transcript_router
from routes.rag_routes import router as rag_router
from routes.google_meet_routes import router as google_meet_router

load_dotenv()

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
async def startup():
    await create_indexes()

app.include_router(google_meet_router)
app.include_router(doctor_router)
app.include_router(patient_router)
app.include_router(tenure_router)
app.include_router(appointment_router)
app.include_router(consultation_router)
app.include_router(transcript_router)
app.include_router(rag_router)

@app.get("/")
async def root():
    return {"message": "CareVault API is running"}