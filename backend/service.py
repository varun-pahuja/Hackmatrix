"""
Core business logic for the Space Biology Knowledge Engine.

Handles chain management, rate limiting, response transformation,
and all pipeline interactions. This module is pipeline-aware but
framework-agnostic — it doesn't import FastAPI.
"""

import os
import time
from collections import defaultdict
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

from pipeline.rag import (
    ask, build_vectorstore, chunk_documents,
    load_documents, create_qa_chain, detect_organism
)
from pipeline.fetch_data import fetch_all
from backend.schemas import AnswerSource, ToolExecution, ResearchResponse


# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------

_rate_limits: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 10
RATE_WINDOW = 60  # seconds


class RateLimitExceeded(Exception):
    """Raised when a client exceeds the request rate limit."""
    pass


def check_rate_limit(ip: str) -> None:
    """Enforce per-IP rate limiting (10 req/min)."""
    now = time.time()
    _rate_limits[ip] = [t for t in _rate_limits[ip] if now - t < RATE_WINDOW]
    if len(_rate_limits[ip]) >= RATE_LIMIT:
        raise RateLimitExceeded("Rate limit exceeded. Try again in a minute.")
    _rate_limits[ip].append(now)


# ---------------------------------------------------------------------------
# Chain & vectorstore management (singleton pattern)
# ---------------------------------------------------------------------------

_chains: dict = {}
_vectorstore = None


def _get_vectorstore():
    """Get or build the ChromaDB vectorstore (cached singleton)."""
    global _vectorstore
    if _vectorstore is None:
        docs = load_documents()
        chunks = chunk_documents(docs)
        _vectorstore = build_vectorstore(chunks)
    return _vectorstore


def get_chain(mode: str = "research"):
    """Get or create the QA chain for the given mode (cached per mode)."""
    global _chains
    if mode not in _chains:
        if not os.path.exists("data/osdr_documents.json"):
            fetch_all()
        vs = _get_vectorstore()
        _chains[mode] = create_qa_chain(vs, mode)
    return _chains[mode]


def reset_chains() -> None:
    """Clear all cached chains and vectorstore (used after data refresh)."""
    global _chains, _vectorstore
    _chains = {}
    _vectorstore = None


# ---------------------------------------------------------------------------
# Pipeline query functions
# ---------------------------------------------------------------------------

def query_pipeline(question: str, mode: str, history: list = None) -> dict:
    """
    Run a question through the RAG pipeline and return the raw result.

    Returns the pipeline's native dict with keys:
    answer, sources, confidence, organism_detected
    """
    chain = get_chain(mode)
    # Convert Pydantic HistoryMessage objects to dicts for rag.py
    history_dicts = [h.model_dump() if hasattr(h, "model_dump") else h for h in (history or [])]
    return ask(chain, question, history_dicts)


def refresh_data() -> dict:
    """Re-fetch NASA OSDR data and clear cached chains."""
    fetch_all()
    reset_chains()
    return {"status": "refreshed"}


# ---------------------------------------------------------------------------
# Response transformation (pipeline output → frontend format)
# ---------------------------------------------------------------------------

def _generate_followups(question: str, organism: Optional[str]) -> list[str]:
    """Generate contextual follow-up suggestions based on the question topic."""
    q = question.lower()

    if "bone" in q or "osteo" in q:
        return [
            "How does microgravity-induced bone loss compare between rodents and humans?",
            "What countermeasures are effective against spaceflight osteopenia?",
            "Which genes regulate osteoclast activity in microgravity?",
        ]
    elif "muscle" in q or "atrophy" in q:
        return [
            "What role does the ubiquitin-proteasome pathway play in spaceflight muscle atrophy?",
            "How effective is resistive exercise at preventing muscle loss in orbit?",
            "Which transcription factors are dysregulated in soleus muscle during spaceflight?",
        ]
    elif "immune" in q or "lymphocyte" in q or "cytokine" in q:
        return [
            "How does spaceflight affect T-cell receptor diversity?",
            "What cytokine profiles change during long-duration missions?",
            "Are immune changes reversible after return to Earth?",
        ]
    elif "radiation" in q or "dna" in q or "cosmic" in q:
        return [
            "What types of DNA damage are most prevalent from galactic cosmic rays?",
            "How do DNA repair mechanisms function differently in microgravity?",
            "What is the cancer risk from a Mars transit mission?",
        ]
    elif "plant" in q or "arabidopsis" in q or "seed" in q:
        return [
            "How does root gravitropism change in microgravity?",
            "What gene expression patterns differ in space-grown Arabidopsis?",
            "Can plants effectively provide life support in long-duration missions?",
        ]
    elif "gene" in q or "expression" in q or "transcript" in q:
        return [
            "Which biological pathways are most consistently altered across spaceflight datasets?",
            "How do epigenetic modifications change during spaceflight?",
            "What are the top differentially expressed genes in liver tissue after ISS missions?",
        ]
    else:
        return [
            "What biological systems are most affected by microgravity?",
            "How do spaceflight effects differ between short and long-duration missions?",
            "What are the key findings from NASA's Rodent Research missions?",
        ]


def _transform_sources(raw_sources: list[dict]) -> list[AnswerSource]:
    """Convert pipeline source dicts to frontend-compatible AnswerSource objects."""
    transformed = []
    for src in raw_sources:
        osd_id = src.get("datasetId", src.get("osd_id", "unknown"))
        title = src.get("title", f"NASA OSDR Dataset {osd_id}")

        # Clean up title — remove field prefixes like "title: " or "description: "
        for prefix in ["title: ", "description: ", "organism: "]:
            if title.lower().startswith(prefix):
                title = title[len(prefix):]
                break

        # Truncate long titles
        if len(title) > 120:
            title = title[:117] + "..."

        transformed.append(AnswerSource(
            datasetId=osd_id,
            title=title,
            url=src.get("url") or f"https://genelab.nasa.gov/data/search?q={osd_id}",
            organism=src.get("organism"),
            sampleCount=None,
        ))
    return transformed


def _build_tool_executions(question: str, sources_count: int, mode: str) -> list[ToolExecution]:
    """Generate tool execution metadata reflecting what the pipeline actually did."""
    return [
        ToolExecution(
            id="tool-rag-retrieve",
            name="query_osdr_vectorstore",
            description="Searching ChromaDB vectorstore across 630+ NASA OSDR datasets using semantic similarity",
            status="completed",
            params={"query": question, "top_k": 25},
            result=f"Retrieved {sources_count} unique relevant dataset chunks",
        ),
        ToolExecution(
            id="tool-llm-generate",
            name="generate_answer_llm",
            description=f"Generating {'concise' if mode == 'casual' else 'detailed research'} answer via Groq LLM (llama-3.1-8b-instant)",
            status="completed",
            params={"mode": mode, "temperature": 0.1},
            result="Answer synthesized from retrieved context",
        ),
    ]


def build_research_response(question: str, mode: str, history: list = None) -> ResearchResponse:
    """
    Full end-to-end: run pipeline + transform into frontend-compatible response.

    This is the main entry point called by both /api/research and /api/casual.
    """
    pipeline_result = query_pipeline(question, mode, history)

    answer = pipeline_result.get("answer", "")
    raw_sources = pipeline_result.get("sources", [])
    confidence = pipeline_result.get("confidence", "low")
    organism = pipeline_result.get("organism_detected")

    sources = _transform_sources(raw_sources)
    tools = _build_tool_executions(question, len(sources), mode)
    followups = _generate_followups(question, organism)

    return ResearchResponse(
        answer=answer,
        sources=sources,
        mode=mode,
        confidence=confidence,
        organism_detected=organism,
        toolsExecuted=tools,
        suggestedFollowups=followups,
        pythonCode=None,
        pythonOutput=None,
    )
