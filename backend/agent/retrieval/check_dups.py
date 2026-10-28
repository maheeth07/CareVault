
import asyncio
from db.mng import db


async def main():
    pipeline = [
        {
            "$group": {
                "_id": {
                    "patient_id": "$patient_id",
                    "tenure_id": "$tenure_id",
                    "consultation_id": "$consultation_id",
                    "text": "$text"
                },
                "count": {"$sum": 1}
            }
        },
        {"$match": {"count": {"$gt": 1}}},
        {"$limit": 20}
    ]

    duplicates = await db.medical_chunks.aggregate(
        pipeline
    ).to_list(length=20)

    if not duplicates:
        print("No duplicate chunks found.")
    else:
        for item in duplicates:
            print("Duplicate count:", item["count"])
            print("Chunk:", item["_id"]["text"])
            print("---")


if __name__ == "__main__":
    asyncio.run(main())
