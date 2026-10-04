from fastapi import HTTPException
from bson import ObjectId

from db.mng import db
from models.transcript import Transcript


async def process_transcript(transcript: Transcript):
    consultation = await db.consultations.find_one({
        "_id": ObjectId(transcript.consultation_id)
    })
    if not consultation:
        raise HTTPException(
            status_code=404,
            detail="Consultation not found"
        )
    await db.consultations.update_one(
            {
                "_id": ObjectId(transcript.consultation_id)
            },
            {
                "$set": {
                    "transcript": transcript.transcript
                }
            }
        )
    return {
        "message": "Transcript stored successfully",
        "consultation_id": transcript.consultation_id
    }