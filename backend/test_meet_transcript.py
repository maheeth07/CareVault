import argparse
import asyncio
import os
import sys
from pathlib import Path
from bson import ObjectId
from dotenv import load_dotenv

# Reconfigure stdout for UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

load_dotenv(dotenv_path=backend_dir / ".env")
load_dotenv()

from services.google_meet_service import fetch_meet_transcript, extract_meeting_code
from controllers.transcript_controller import process_transcript
from models.transcript import Transcript
from db.mng import db


async def run_test(meet_url: str, consultation_id_str: str, access_token: str | None = None):
    print("=" * 60)
    print("CareVault - Google Meet Transcript Integration Test")
    print("=" * 60)

    # 1. Validate Consultation ID in MongoDB
    if not ObjectId.is_valid(consultation_id_str):
        print(f"Error: '{consultation_id_str}' is not a valid MongoDB ObjectId.")
        return False

    consultation = await db.consultations.find_one({"_id": ObjectId(consultation_id_str)})
    if not consultation:
        print(f"Error: Consultation with ID {consultation_id_str} not found in MongoDB.")
        return False

    print(f"[OK] Found valid consultation in MongoDB:")
    print(f"     - Consultation ID: {consultation_id_str}")
    print(f"     - Patient ID:      {consultation.get('patient_id')}")
    print(f"     - Doctor ID:       {consultation.get('doctor_id')}")
    print(f"     - Tenure ID:       {consultation.get('tenure_id')}")
    print(f"     - Current Status:  {consultation.get('ingestion_status')}")

    # 2. Extract and display Meeting Code
    try:
        meeting_code = extract_meeting_code(meet_url)
        print(f"[OK] Extracted meeting code: '{meeting_code}' from URL: {meet_url}")
    except ValueError as e:
        print(f"Error parsing meeting URL: {e}")
        return False

    # 3. Check for Access Token
    if not access_token:
        access_token = os.getenv("GOOGLE_ACCESS_TOKEN")

    if not access_token:
        print("\n[!] No Google OAuth access token provided.")
        print("    You can authenticate via your browser using the local CareVault OAuth flow:")
        login_url = f"http://localhost:8000/auth/google/login?consultation_id={consultation_id_str}&meet_url={meet_url}"
        print(f"\n    Browser Login URL:\n    {login_url}\n")
        print("    Or run this script with your token:")
        print(f'    python backend/test_meet_transcript.py --token "<ACCESS_TOKEN>"')
        return False

    # 4. Fetch Transcript from Google Meet API
    print(f"\n[*] Fetching transcript from Google Meet API for meeting '{meeting_code}'...")
    try:
        transcript_text = await fetch_meet_transcript(
            meet_url=meet_url,
            access_token=access_token
        )
        print(f"[OK] Successfully retrieved transcript ({len(transcript_text)} characters):")
        preview = transcript_text[:300] + ("..." if len(transcript_text) > 300 else "")
        print(f"--- Transcript Preview ---\n{preview}\n---------------------------")
    except Exception as e:
        print(f"[FAIL] Failed to fetch transcript from Google Meet API: {e}")
        return False

    # 5. Pass to process_transcript() for chunking, embedding & vector storage
    print("\n[*] Processing transcript with process_transcript()...")
    try:
        result = await process_transcript(
            Transcript(
                consultation_id=consultation_id_str,
                transcript=transcript_text
            )
        )
        print(f"[OK] process_transcript response: {result}")
    except Exception as e:
        print(f"[FAIL] Error during transcript processing: {e}")
        return False

    # 6. Verify MongoDB state directly
    print("\n[*] Verifying MongoDB consultation and medical_chunks status...")
    updated_consultation = await db.consultations.find_one({"_id": ObjectId(consultation_id_str)})
    ingestion_status = updated_consultation.get("ingestion_status")
    chunks_stored = updated_consultation.get("chunks_stored", 0)

    # Count actual chunks in medical_chunks collection
    actual_chunks_count = await db.medical_chunks.count_documents({
        "consultation_id": consultation_id_str
    })

    print(f"     - MongoDB ingestion_status: {ingestion_status}")
    print(f"     - Chunks stored (recorded): {chunks_stored}")
    print(f"     - Medical chunks in vectorstore: {actual_chunks_count}")

    if ingestion_status == "completed":
        print(f"\nSUCCESS: Google Meet transcript integration verified!")
        print(f"     - Ingestion Status: {ingestion_status}")
        print(f"     - Total Chunks Stored: {chunks_stored}")
        return True
    else:
        print(f"\n[FAIL] Verification failed: ingestion_status is '{ingestion_status}' (expected 'completed')")
        return False


def main():
    parser = argparse.ArgumentParser(description="Test Google Meet transcript integration")
    parser.add_argument("--url", default="https://meet.google.com/meet/wkp-ixqy-nud", help="Google Meet URL")
    parser.add_argument("--consultation-id", default="6ac290dee25baa393c3ededf", help="Consultation ID")
    parser.add_argument("--token", default=None, help="Google OAuth access token")

    args = parser.parse_args()
    asyncio.run(run_test(
        meet_url=args.url,
        consultation_id_str=args.consultation_id,
        access_token=args.token
    ))


if __name__ == "__main__":
    main()
