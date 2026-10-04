from controllers.transcript_controller import process_transcript
from models.transcript import Transcript
from fastapi import APIRouter

router=APIRouter()

@router.post("/transcript/store")
async def store_transcript(transcript:Transcript):
    return await process_transcript(transcript)