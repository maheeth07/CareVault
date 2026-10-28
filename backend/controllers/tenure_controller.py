from bson import ObjectId
from fastapi import HTTPException
from models.tenure import Tenure
from db.mng import db


async def create_tenure(tenure: Tenure, current_patient: dict):
    authenticated_patient_id = str(current_patient["_id"])

    if tenure.patient_id != authenticated_patient_id:
        raise HTTPException(
            status_code=403,
            detail="You can only create a tenure for yourself"
        )

    tenure_data = tenure.model_dump()
    result = await db.tenures.insert_one(tenure_data)
    return({
        "message":"Tenure created succesfully",
        "id":str(result.inserted_id)
    })

async def all_tens(patient_id: str, current_patient: dict):
    authenticated_patient_id = str(current_patient["_id"])
    if patient_id!=authenticated_patient_id:
        raise HTTPException(
            status_code=403,
            detail="You can only view your own tenures"
        )
    tenures=await db.tenures.find({
        "patient_id":authenticated_patient_id
    }).to_list(length=None)
    for tenure in tenures:
        tenure["_id"]=str(tenure["_id"])
    return tenures