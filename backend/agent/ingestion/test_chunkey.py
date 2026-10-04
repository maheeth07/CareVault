from chunker import chunk_transcript

transcript="""
Doctor: How long have you had the headache?

Patient: Around two weeks.

Doctor: Are you taking any medication?

Patient: Yes, I take paracetamol.

Doctor: Any other medical conditions?

Patient: No.
"""

chunks=chunk_transcript(transcript,"123","456","789","1011")
for i,chunk in enumerate(chunks):
    print(f"Chunk{i+1}")
    print(chunk)