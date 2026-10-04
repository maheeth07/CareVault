from controllers.tenure_controller import create_tenure,all_tens
from models.tenure import Tenure
from fastapi import APIRouter

router=APIRouter()

@router.post("/tenure/add")
async def add_patient_tenure(tenure:Tenure):
    return await create_tenure(tenure)

@router.get("/tenure/{patient_Id}")
async def get_patient_tenures(patient_Id:str):
    return await all_tens(patient_Id)