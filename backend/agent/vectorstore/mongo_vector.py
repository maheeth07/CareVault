from db.mng import db
import hashlib

async def store_chunk(text:str,embedding:list,patient_id:str,doctor_id:str,consultation_id:str,tenure_id:str):
    chunk_id=hashlib.sha256(f"{patient_id}:{tenure_id}:{consultation_id}:{text}".encode()).hexdigest()
    document = {
        "chunk_id":chunk_id,
        "text": text,
        "embedding": embedding,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "tenure_id": tenure_id,
        "consultation_id": consultation_id
    }
    await db.medical_chunks.update_one({"chunk_id":chunk_id},{"$setOnInsert":document},upsert=True)
    return chunk_id