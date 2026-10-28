import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent.parent
agent_dir = Path(__file__).resolve().parent.parent
sys.path.extend([str(backend_dir), str(agent_dir)])

import os
from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()

groq_client = AsyncGroq(
    api_key=os.getenv("GROQ_API_KEY")
)

from db.mng import db
from agent.embeddings.embedder import generate_embedding

async def retrieve_chunks(
    query: str,
    patient_id: str,
    tenure_id: str,
    limit: int = 5
):
    query_embedding = generate_embedding(query)
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": 50,
                "limit": limit,
                "filter": {
                    "$and": [
                        {"patient_id": patient_id},
                        {"tenure_id": tenure_id}
                    ]
                }
            }
        },
        {
            "$project": {
                "_id": 0,
                "text": 1,
                "patient_id": 1,
                "doctor_id": 1,
                "tenure_id": 1,
                "consultation_id": 1,
                "score": {
                    "$meta": "vectorSearchScore"
                }
            }
        }
    ]
    results = await db.medical_chunks.aggregate(pipeline).to_list(
        length=limit
    )
    return results

async def answer_question(
    question: str,
    patient_id: str,
    tenure_id: str,
    limit: int = 5
):
    # Retrieve relevant chunks
    chunks = await retrieve_chunks(
        query=question,
        patient_id=patient_id,
        tenure_id=tenure_id,
        limit=limit
    )

    if not chunks:
        return {
            "answer": "No relevant medical history was found.",
            "sources": []
        }

    # Build context
    context = "\n\n".join(
        chunk["text"] for chunk in chunks
    )

    # Generate answer using Groq
    response = await groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are CareVault, a medical history assistant "
                    "for doctors. Answer only from the provided context. "
                    "Do not invent medical facts. If information is "
                    "missing, clearly state that."
                )
            },
            {
                "role": "user",
                "content": (
                    f"Medical history:\n{context}\n\n"
                    f"Question: {question}"
                )
            }
        ],
        temperature=0.1,
        max_completion_tokens=500
    )

    return {
        "answer": response.choices[0].message.content,
        "sources": [
            {
                "consultation_id": chunk["consultation_id"],
                "text": chunk["text"],
                "score": chunk.get("score")
            }
            for chunk in chunks
        ]
    }