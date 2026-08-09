import os
import json
import time
import re
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_huggingface import HuggingFaceEmbeddings

CHROMA_DIR = "chroma_db"
DATA_FILE = "data/osdr_documents.json"

# Organism detection patterns
ORGANISM_PATTERNS = {
    "human": r"\b(human|astronaut|inspiration4|twin study|patient|subject|lymphocyte|fibroblast|homo sapiens)\b",
    "mouse": r"\b(mouse|mice|murine|mus musculus|c57bl|balb|rodent)\b",
    "rat": r"\b(rat|rattus|sprague.dawley)\b",
    "plant": r"\b(arabidopsis|plant|seedling|thaliana)\b",
    "drosophila": r"\b(drosophila|fruit fly)\b",
    "c elegans": r"\b(c\. elegans|caenorhabditis|nematode)\b",
}

PROMPTS = {
    "casual": PromptTemplate(
        template="""You are a space biology expert. Answer simply in 1-2 sentences.
Do NOT add information not in the context. Do NOT cite anything.
If the context doesn't help, say "I don't have enough information on that."

Context:
{context}

Question: {question}

Answer:""",
        input_variables=["context", "question"]
    ),
    "research": PromptTemplate(
        template="""You are a senior space biology researcher writing a detailed technical brief. Answer using ONLY the provided context. Be thorough, specific, and data-driven.

RULES:
1. STRUCTURE your answer with clear sections if the question has multiple aspects
2. ALWAYS include specific numbers, percentages, durations, dates, sample sizes, and mission names when available in context
3. ALWAYS cite OSD-IDs inline as [OSD-XXX] after each claim — do NOT list them at the end
4. Mention specific organisms (species, strain), tissues, cell types, and genes when found in context
5. Include experimental conditions: duration, gravity conditions, control groups, measurement methods
6. If multiple studies address the question, compare and contrast their findings
7. If context is insufficient for some parts, state exactly what is missing — do NOT say "not enough info" for the whole answer
8. NEVER invent statistics, dates, or OSD-IDs not in the context
9. Start with a 1-sentence summary, then provide the detailed breakdown

Context:
{context}

Question: {question}

Detailed Answer:""",
        input_variables=["context", "question"]
    ),
}


def detect_organism(question: str) -> str | None:
    q_lower = question.lower()
    for org, pattern in ORGANISM_PATTERNS.items():
        if re.search(pattern, q_lower):
            return org
    return None


def load_documents() -> list[Document]:
    with open(DATA_FILE) as f:
        raw = json.load(f)
    return [Document(page_content=f"OSD-ID: {d['osd_id']}\n{d['text']}", metadata=d["metadata"]) for d in raw]


def chunk_documents(docs: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    return splitter.split_documents(docs)


def build_vectorstore(chunks: list[Document]) -> Chroma:
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    if os.path.exists(CHROMA_DIR) and os.listdir(CHROMA_DIR):
        vs = Chroma(persist_directory=CHROMA_DIR, embedding_function=embeddings)
        if vs._collection.count() > 0:
            print(f"Loaded existing vectorstore ({vs._collection.count()} entries)")
            return vs
    vs = Chroma.from_documents(chunks, embeddings, persist_directory=CHROMA_DIR)
    print(f"Built new vectorstore ({vs._collection.count()} entries)")
    return vs


def create_qa_chain(vectorstore: Chroma, mode: str = "research"):
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.1)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 20})
    prompt = PROMPTS.get(mode, PROMPTS["research"])
    chain = prompt | llm | StrOutputParser()
    return {"retriever": retriever, "chain": chain}


def setup_pipeline():
    docs = load_documents()
    chunks = chunk_documents(docs)
    vs = build_vectorstore(chunks)
    return create_qa_chain(vs)


def format_history(history: list[dict]) -> str:
    if not history:
        return ""
    lines = []
    for h in history[-4:]:
        lines.append(f"Previous Q: {h.get('question', '')}")
        lines.append(f"Previous A: {h.get('answer', '')[:300]}")
    return "\n".join(lines) + "\n\n"


def ask(qa_chain, question: str, history: list[dict] = None) -> dict:
    try:
        retriever = qa_chain["retriever"]
        chain = qa_chain["chain"]

        docs = retriever.invoke(question)

        # Deduplicate by OSD-ID but keep first chunk per dataset
        seen_ids = set()
        unique_docs = []
        for d in docs:
            osd_id = d.metadata.get("osd_id")
            if osd_id not in seen_ids:
                seen_ids.add(osd_id)
                unique_docs.append(d)

        # Truncate context to ~6000 chars — detailed answers need more data
        context = "\n\n".join(d.page_content for d in unique_docs)[:6000]

        history_text = format_history(history or [])
        full_question = f"{history_text}Follow-up question: {question}" if history_text else question

        answer = chain.invoke({"context": context, "question": full_question})
    except Exception as e:
        return {
            "answer": f"Error generating answer: {str(e)}",
            "sources": [],
            "confidence": "low",
            "organism_detected": None
        }

    seen = set()
    sources = []
    for d in docs:
        osd_id = d.metadata.get("osd_id")
        if osd_id and osd_id not in seen:
            seen.add(osd_id)
            org = detect_organism(d.page_content) or "unknown"
            sources.append({
                "datasetId": osd_id,
                "title": d.metadata.get("title", ""),
                "url": f"https://genelab.nasa.gov/data/search?q={osd_id}",
                "organism": org
            })

    organism = detect_organism(question)

    if len(sources) >= 3:
        confidence = "high"
    elif len(sources) >= 1:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "answer": answer,
        "sources": sources,
        "confidence": confidence,
        "organism_detected": organism
    }
