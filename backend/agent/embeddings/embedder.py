import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client=genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_embedding(text: str):
    result=client.models.embed_content(
        model="gemini-embedding-2",
        contents=text,
        config=types.EmbedContentConfig(
            output_dimensionality=768
        )
    )

    return result.embeddings[0].values