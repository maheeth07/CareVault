from fastapi import HTTPException
from bson import ObjectId

from db.mng import db
from models.transcript import Transcript

from agent.ingestion.chunker import chunk_transcript
from agent.embeddings.embedder import generate_embedding
from agent.vectorstore.mongo_vector import store_chunk


async def process_transcript(transcript: Transcript):
    if not ObjectId.is_valid(transcript.consultation_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid Consultation ID"
        )
    consultation_id=ObjectId(transcript.consultation_id)
    consultation=await db.consultations.find_one({
        "_id":consultation_id
    })
    if not consultation:
        raise HTTPException(
            status_code=404,
            detail="Consultation Not Found"
        )
    transcript_text=transcript.transcript.strip()
    if not transcript_text:
        raise HTTPException(
            status_code=400,
            detail="Transcript is empty"
        )
    patient_id=str(consultation["patient_id"])
    doctor_id=str(consultation["doctor_id"])
    tenure_id=str(consultation["tenure_id"])
    consultation_id_str=str(consultation_id)
    await db.consultations.update_one(
            {
                "_id": consultation_id
            },
            {
                "$set": {
                    "transcript": transcript_text,
                    "ingestion_status":"processing"
                }
            }
        )
    try:
        chunks=chunk_transcript(transcript=transcript_text,patient_id=patient_id,doctor_id=doctor_id,consultation_id=consultation_id_str,tenure_id=tenure_id)
        for chunk in chunks:
            embedding=generate_embedding(chunk["text"])
            await store_chunk(text=chunk["text"],embedding=embedding,patient_id=patient_id,doctor_id=doctor_id,consultation_id=consultation_id_str,tenure_id=tenure_id)
        await db.consultations.update_one(
            {"_id":consultation_id},
            {
                "$set":{
                    "ingestion_status":"completed",
                    "chunks_stored":len(chunks)
                }
            }
        )
        return {
            "message":"Transcript stored successfully",
            "consultation_id":consultation_id_str,
            "ingestion_status":"completed",
            "chunks_stored":len(chunks)
        }
    except Exception as e:
        await db.consultations.update_one(
            {"_id":consultation_id},
            {
                "$set":{
                    "ingestion_status":"failed"
                }
            }
        )
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )