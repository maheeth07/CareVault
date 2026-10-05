from embedder import generate_embedding

text = """
Patient has been experiencing headaches for two weeks.
Patient is currently taking paracetamol.
"""

vector = generate_embedding(text)

print("Vector length:", len(vector))
print("First 10 values:", vector[:10])