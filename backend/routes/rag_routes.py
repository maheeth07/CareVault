from fastapi import APIRouter,Depends
from models.rag import RAGQuery
from controllers.rag_controller import ask_question
from utils.auth import get_current_doctor
router = APIRouter(prefix="/rag", tags=["RAG"])

@router.post("/ask")
async def rag_query(query: RAGQuery,current_doctor: dict = Depends(get_current_doctor)):
    return await ask_question(query,current_doctor)