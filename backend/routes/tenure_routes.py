from controllers.tenure_controller import create_tenure,all_tens
from models.tenure import Tenure
from fastapi import APIRouter,Depends
from utils.auth import get_current_patient

router=APIRouter()

@router.post("/tenure/add")
async def add_patient_tenure(tenure:Tenure,current_patient: dict=Depends(get_current_patient)):
    return await create_tenure(tenure,current_patient)

@router.get("/tenure/{patient_id}")
async def get_patient_tenures(patient_id:str,current_patient: dict=Depends(get_current_patient)):
    return await all_tens(patient_id,current_patient)