import logging
import threading
from typing import Tuple, List, Dict, Any

logger = logging.getLogger(__name__)

_indexed = False
_index_lock = threading.Lock()


def _ensure_indexed() -> None:
    """Index dataset into ChromaDB on first use if the collection is empty."""
    global _indexed
    if _indexed:
        return
    with _index_lock:
        if _indexed:
            return
        from . import chromadb_service, embedding_service
        from .dataset_service import load_and_prepare

        count = chromadb_service.get_document_count()
        if count > 0:
            logger.info("ChromaDB already has %d documents — skipping indexing", count)
            _indexed = True
            return

        logger.info("ChromaDB is empty — indexing dataset now (first-run setup)…")
        chunks = load_and_prepare()
        if not chunks:
            logger.warning("No chunks to index")
            _indexed = True
            return

        texts = [c['text'] for c in chunks]
        embeddings = embedding_service.embed_texts(texts)
        added = chromadb_service.add_documents(
            ids=[c['id'] for c in chunks],
            metadatas=[c['metadata'] for c in chunks],
            documents=texts,
            embeddings=embeddings,
        )
        logger.info("First-run indexing complete: %d chunks stored", added)
        _indexed = True


def answer_question(question: str, top_k: int = 5) -> Tuple[str, List[Dict[str, Any]]]:
    _ensure_indexed()

    from . import embedding_service, chromadb_service, llm_service

    q_vec = embedding_service.embed_text(question)
    results = chromadb_service.query(q_vec, n_results=top_k)

    try:
        metadatas = results['metadatas'][0]
        documents = results['documents'][0]
        distances = results.get('distances', [[]])[0]
    except (KeyError, IndexError):
        metadatas, documents, distances = [], [], []

    if not documents:
        return "I'm sorry, no relevant documents were found in the database for your question.", []

    context_parts = []
    sources = []
    for i, doc in enumerate(documents):
        meta = metadatas[i] if i < len(metadatas) else {}
        label = f"{meta.get('law_name', 'Law')} — {meta.get('article_ref', 'Article')}"
        context_parts.append(f"{label}:\n{doc}")
        sources.append({
            'article_ref': meta.get('article_ref', ''),
            'law_name':    meta.get('law_name', ''),
            'source':      meta.get('source', 'JuriSite Tunisie'),
            'source_url':  meta.get('source_url', ''),
            'keywords':    meta.get('keywords', ''),
        })

    context_block = "\n\n---\n\n".join(context_parts)

    system_prompt = (
        "You are a legal assistant specialized in Tunisian law, "
        "covering real estate law, corporate law, tax law, and civil law. "
        "Answer ONLY based on the legal context provided below. "
        "If the answer is not found in the context, respond exactly with: "
        "'I don't know — this information is not available in my database.' "
        "Cite the relevant articles and laws in your answer. Respond in English."
    )
    user_prompt = (
        f"Legal context:\n{context_block}\n\n"
        f"Question: {question}\n\n"
        "Provide a legally accurate and concise answer, citing the relevant sources."
    )

    answer = llm_service.generate(system_prompt, user_prompt, max_tokens=750)
    return (answer.strip() if answer and answer.strip() else "I don't know — this information is not available in my database."), sources


def get_status() -> Dict[str, Any]:
    from . import chromadb_service, llm_service
    from django.conf import settings
    cfg = getattr(settings, 'LEGAL_RAG', {})

    doc_count = chromadb_service.get_document_count()
    llm_ok = llm_service.check_availability()

    return {
        'documents_indexed': doc_count,
        'llm_available':     llm_ok,
        'model':             cfg.get('LLM_MODEL', 'hosted_vllm/Llama-3.1-70B-Instruct'),
        'embedding_model':   cfg.get('EMBEDDING_MODEL', 'all-MiniLM-L6-v2'),
        'ready':             doc_count > 0 and llm_ok,
    }
