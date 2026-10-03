from fastapi import FastAPI
from db.mng import create_indexes
from dotenv import load_dotenv
from routes.doctor_routes import router as doctor_router

load_dotenv()

app=FastAPI()

@app.on_event("startup")
async def startup():
    await create_indexes()

app.include_router(doctor_router)


@app.get("/")
async def root():
    return {"message": "CareVault API is running"}