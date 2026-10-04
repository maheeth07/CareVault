from langchain_text_splitters import RecursiveCharacterTextSplitter

def chunk_transcript(transcript:str,patient_id:str,doctor_id:str,consultation_id:str,tenure_id:str):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=100,
        chunk_overlap=50
    )
    chunks=splitter.split_text(transcript)
    documents=[]
    for chunk in chunks:
        documents.append({
            "text":chunk,
            "metadata":{
                "patient_id":patient_id,
                "doctor_id":doctor_id,
                "tenure_id":tenure_id,
                "consultation_id":consultation_id
            }
        })
    return documents
