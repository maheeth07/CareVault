
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent.parent
agent_dir = Path(__file__).resolve().parent.parent
sys.path.extend([str(backend_dir), str(agent_dir)])

import asyncio
from embeddings.embedder import generate_embedding
from mongo_vector import store_chunk


async def main():

    text = """
    Patient has been experiencing headaches for two weeks.
    Patient is currently taking paracetamol.
    """

    embedding = generate_embedding(text)

    document_id = await store_chunk(
        text=text,
        embedding=embedding,
        patient_id="123",
        doctor_id="456",
        tenure_id="1011",
        consultation_id="789"
    )

    print("Stored document:", document_id)


asyncio.run(main())