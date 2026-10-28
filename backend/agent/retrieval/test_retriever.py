import asyncio
from agent.retrieval.retriever import answer_question
# from agent.retrieval.retriever import answer_question

async def main():
    result = await answer_question(
        question=(
            "How long has the patient had a headache, "
            "and was fever reported?"
        ),
        patient_id="6ac258695c69741e3f798597",
        tenure_id="6ac2586a5c69741e3f798598"
    )

    print("\nAnswer:")
    print(result["answer"])

    print("\nSources:")
    for source in result["sources"]:
        print(source)


if __name__ == "__main__":
    asyncio.run(main())