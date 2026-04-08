import os
from typing import List

import torch

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

from celery.result import AsyncResult

from sentence_transformers import SentenceTransformer

from ..core.utils import get_logger, get_device, clear_torch_cache
from ..core.config import GAIEmbeddersCollections, settings
from ..core.schemas import ComputeDocumentEmbeddingsRequest, GetEmbeddingRequest, SearchEmbRequest

from ..services.celery_tasks.compute_embeddings import start_computing

from ..core.dependencies import milvus_client


logger = get_logger(__name__)

router = APIRouter()

@router.post(
        "/from_docs", 
        tags=["Document Embeddings"], 
        description="Compute embeddings from documents and stores them in Milvus Vector Store")
async def generate_embeddings(
    docs_emb_request: ComputeDocumentEmbeddingsRequest, 
):
    docs_path = docs_emb_request.docs_path
    embedding_model = docs_emb_request.embedding_model
    device = get_device(docs_emb_request.device)

    logger.info(f"Generating Document Embeddings in: \npath: {docs_path}, \ngenaimodel: {embedding_model} and \ndevice: {device}")
    
    emb_task = start_computing.apply_async(
        args=[docs_path, embedding_model, device]
    )

    return JSONResponse(content={"task_id": emb_task.id})


@router.post(
        "/upload_file",
        tags=["Document Embeddings"], 
        description="Accepts a PDF file, extracts the contents and starts computing the embeddings")
async def upload_file(files: List[UploadFile] = File(...)):
    os.makedirs(settings.user_files_path, exist_ok=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    filenames = []
    docs = []

    for file in files:
        try:
            if file.content_type != "application/pdf":
                raise HTTPException(status_code=400, detail="Invalid file type. Only PDF files are allowed.")
        
            with open(os.path.join(settings.user_files_path, file.filename), 'wb') as f:
                while contents := file.file.read(1024 * 1024):
                    f.write(contents)
            
            filenames.append(file.filename)
            docs.append(os.path.join(settings.user_files_path, file.filename))

        except Exception:
            raise HTTPException(status_code=500, detail='Something went wrong')
        
        finally:
            file.file.close()

    emb_task = start_computing.apply_async(
        args=[docs, None, device, True]
    )
            
    return JSONResponse(content={
        "task_id": emb_task.id, 
        "status": "Uploaded and started embedding"
    })


@router.get("/status/{task_id}", tags=["Document Embeddings"])
async def get_result(task_id: str):
    task_result = AsyncResult(task_id)

    if task_result.state == "SUCCESS":
        return {"status": task_result.result}

    else:
        return {"status": task_result.state}


@router.post("/from_texts", 
             tags=["Document Embeddings"])
async def get_embedding(emb_request: GetEmbeddingRequest):
    req_texts = emb_request.texts
    embedding_model = emb_request.model
    device = get_device(emb_request.device)

    computed_embeddings = None

    if embedding_model in GAIEmbeddersCollections.opensource_embedders().keys() and os.getenv("USE_EMBEDDERS_LOCALLY"):

        emb_model = settings.embedders.model_fields[embedding_model].default
        
        logger.info(f"Dowloading/Loading and computing chunks for: {emb_model}")
        embedder = SentenceTransformer(emb_model,
                                       trust_remote_code=True, 
                                       device=device)
        
        computed_embeddings = embedder.encode(req_texts, 
                                              show_progress_bar="tqdm", 
                                              device=device)
        
        del embedder
        clear_torch_cache()
        
    return {
        "embeddings": computed_embeddings.tolist()
    }


@router.post("/get_closest", tags=["Document Embeddings"])
async def get_closest_texts(search_request: SearchEmbRequest):
    query = search_request.query
    embedding_model = search_request.model
    k = search_request.k
    device = get_device(search_request.device)

    results = None

    if embedding_model in GAIEmbeddersCollections.opensource_embedders().keys() and os.getenv("USE_EMBEDDERS_LOCALLY"):
        emb_model = settings.embedders.model_fields[embedding_model].default
        
        logger.info(f"Dowloading/Loading and computing chunks for: {emb_model}")
        embedder = SentenceTransformer(emb_model,
                                       trust_remote_code=True, 
                                       device=device)
        
        query_embedding = embedder.encode(query, 
                                          show_progress_bar="tqdm", 
                                          device=device)
        
        logger.info(f"Query embedding computed!")

        vector_col_name = GAIEmbeddersCollections.mapping()[embedding_model]

        results = milvus_client.search(
            collection_name=vector_col_name,
            anns_field="vector_embs",
            data=[query_embedding],
            limit=k,
            search_params={"metric_type": "L2"}, 
            output_fields=["text_chunk"]
        )

    return {"top_k": results}
