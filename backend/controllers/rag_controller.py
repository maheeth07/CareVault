from agent.retrieval.retriever import answer_question
from models.rag import RAGQuery
from fastapi import HTTPException,Depends
from bson import ObjectId
from db.mng import db
from utils.auth import get_current_doctor
async def ask_question(query: RAGQuery,current_doctor:dict=Depends(get_current_doctor)):
    if not ObjectId.is_valid(query.patient_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid patient ID"
        )

    if not ObjectId.is_valid(query.tenure_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid tenure ID"
        )

    patient = await db.patients.find_one({
        "_id": ObjectId(query.patient_id)
    })

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    tenure = await db.tenures.find_one({
        "_id": ObjectId(query.tenure_id),
        "patient_id": query.patient_id
    })

    if not tenure:
        raise HTTPException(
            status_code=404,
            detail="Tenure not found for this patient"
        )
    doctor_id=str(current_doctor["_id"])
    appointment=await db.appointments.find_one({
        "doctor_id":doctor_id,"patient_id":query.patient_id,"tenure_id":query.tenure_id
    })
    if not appointment:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access this patient's tenure"
        )
    return await answer_question(
        question=query.question,
        patient_id=query.patient_id,
        tenure_id=query.tenure_id
    )   