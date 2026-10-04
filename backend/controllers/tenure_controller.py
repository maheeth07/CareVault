from bson import ObjectId
from fastapi import HTTPException
from models.tenure import Tenure
from db.mng import db


async def create_tenure(tenure:Tenure):
    ext_pat=await db.patients.find_one({
        "_id":ObjectId(tenure.patient_id)
    })
    if not ext_pat:
        raise HTTPException(
            status_code=404,detail="Patient Not Found"
        )
    tenure_data=tenure.model_dump()
    result=await db.tenures.insert_one(tenure_data)
    return({
        "message":"Tenure created succesfully",
        "id":str(result.inserted_id)
    })


async def all_tens(patient_id:str):
    tenures=await db.tenures.find({
        "patient_id":patient_id
    }).to_list(length=None)
    for tenure in tenures:
        tenure["_id"] = str(tenure["_id"])
    return tenures