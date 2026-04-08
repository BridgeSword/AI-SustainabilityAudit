import nltk
from nltk.tokenize import sent_tokenize

from fastapi import FastAPI

from typing import Callable

from .utils import get_logger
from .config import settings


logger = get_logger(__name__)

def _startup_model(app: FastAPI, milvus_client) -> None:

    logger.info("Checking and Downloading(if needed) NLTK Deps")

    nltk.download("punkt")
    nltk.download('punkt_tab')
    nltk.download("wordnet")
    nltk.download("stopwords")
    nltk.download("averaged_perceptron_tagger")
    
    logger.info("NLTK Deps Downloading complete!")

    logger.info("\n\nChecking and Creating Milvus Collections if required\n\n")

    try:
        from pymilvus import MilvusClient, DataType
        
        for collection in settings.milvus.collections:
            if not milvus_client.has_collection(collection_name=collection["collection_name"]):
                schema = MilvusClient.create_schema(
                    auto_id=False, 
                    enable_dynamic_field=False
                )

                schema.add_field(field_name="id", datatype=DataType.INT64, is_primary=True, auto_id=True)
                schema.add_field(field_name="vector_embs", datatype=DataType.FLOAT_VECTOR, dim=collection["vector_dim"])
                schema.add_field(field_name="head_embs", datatype=DataType.FLOAT_VECTOR, dim=128)
                schema.add_field(field_name="text_chunk", datatype=DataType.VARCHAR, max_length=collection["chunk_max_length"])

                if collection.get("add_emb_model_name", False):
                    schema.add_field(field_name="emb_model_name", datatype=DataType.VARCHAR, max_length=64)

                index_params = milvus_client.prepare_index_params()

                index_params.add_index(
                    field_name="id",
                    index_type="STL_SORT"
                )

                index_params.add_index(
                    field_name="head_embs", 
                    index_type="FLAT",
                    metric_type="L2"
                )

                index_params.add_index(
                    field_name="vector_embs", 
                    index_type="FLAT",
                    metric_type="L2"
                )

                milvus_client.create_collection(
                    collection_name=collection["collection_name"],
                    schema=schema,
                    index_params=index_params
                )
    except Exception as e:
        logger.error(f"Failed to initialize Milvus collections: {e}")
        logger.info("Continuing without Milvus collections...")

    logger.info("\n\nMilvus Collections Check/Creation complete!\n\n")


def start_app_handler(app: FastAPI, milvus_client) -> Callable:
    def startup() -> None:
        logger.info("Running app start handler.")
        
        _startup_model(app, milvus_client)
    return startup
