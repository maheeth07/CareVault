
import asyncio
import json
from db.mng import db


FIELDS = [
    "text",
    "patient_id",
    "doctor_id",
    "tenure_id",
    "consultation_id",
    "embedding",
]


async def main():
    documents = await db.medical_chunks.find({}).to_list(length=None)

    groups = {}

    for doc in documents:
        # Compare the actual chunk content, metadata, and vector.
        key_data = {field: doc.get(field) for field in FIELDS}
        key = json.dumps(key_data, sort_keys=True, default=str)
        groups.setdefault(key, []).append(doc)

    duplicates = [
        group for group in groups.values()
        if len(group) > 1
    ]

    if not duplicates:
        print("No exact duplicate chunks found.")
        return

    delete_ids = []

    for group in duplicates:
        # Keep the first document; select only additional copies.
        keep = group[0]
        extras = group[1:]

        print("\nDuplicate group found")
        print("Text:", keep.get("text", "").strip())
        print("Documents in group:", len(group))
        print("Keeping ID:", keep["_id"])

        for extra in extras:
            print("Duplicate candidate ID:", extra["_id"])
            delete_ids.append(extra["_id"])

    print(f"\nDocuments selected for deletion: {len(delete_ids)}")
    print("No documents have been deleted yet.")

    confirmation = input(
        "\nType DELETE to remove only these exact duplicates: "
    )

    if confirmation != "DELETE":
        print("Cancelled. No documents were deleted.")
        return

    deleted_count = 0

    for document_id in delete_ids:
        result = await db.medical_chunks.delete_one(
            {"_id": document_id}
        )
        deleted_count += result.deleted_count

    print(f"\nDeleted {deleted_count} duplicate documents.")
    print("One copy of each identical chunk was retained.")


if __name__ == "__main__":
    asyncio.run(main())
