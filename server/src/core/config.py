import os
from enum import Enum
from typing import Dict
from pydantic_settings import BaseSettings


class MilvusSettings(BaseSettings):
    collections: list[dict] = [
        {
            "collection_name": "OPENAI_CR_EMBS",
            "vector_dim": 1536,
            "chunk_max_length": 15000,
            "add_emb_model_name": True
        },
        {
            "collection_name": "GEMINI_CR_EMBS",
            "vector_dim": 768,
            "chunk_max_length": 15000,
            "add_emb_model_name": True
        },
        {
            "collection_name": "CLAUDE_CR_EMBS",
            "vector_dim": 1024,
            "chunk_max_length": 15000,
            "add_emb_model_name": True
        },
        {
            "collection_name": "STELLA_15_CR_EMBS",
            "vector_dim": 1024,
            "chunk_max_length": 15000,
            "add_emb_model_name": True
        },
        {
            "collection_name": "GTE_QWEN2_15_CR_EMBS",
            "vector_dim": 1536,
            "chunk_max_length": 15000,
            "add_emb_model_name": True
        },
        {
            "collection_name": "GTE_MODERNBERT_BASE_CR_EMBS",
            "vector_dim": 768,
            "chunk_max_length": 15000,
            "add_emb_model_name": True
        }
    ]


class Embedders(BaseSettings):
    #opensource
    stella_15: str = "dunzhang/stella_en_1.5B_v5"
    gte_qwen: str = "Alibaba-NLP/gte-Qwen2-1.5B-instruct"
    gte_modernbert: str = "Alibaba-NLP/gte-modernbert-base"

    #closedsource
    claude: str = "voyage-3-large"
    openai: str = "text-embedding-3-large"
    gemini: str = "text-embedding-004"

    default_emb_params: dict = {"padding": False, 
                                "truncation": False,
                                "add_special_tokens": False, 
                                "return_attention_mask": False, 
                                "return_length": True}


class Settings(BaseSettings):
    milvus: MilvusSettings = MilvusSettings()
    embedders: Embedders = Embedders()

    app_name: str = "Self-Decisive MARAG Backend API Server"
    base_path: str = os.path.join(os.getcwd(), "server", "src")

    temp_files_path: str = os.path.join(os.getcwd(), "temp_files")
    carbon_reports_path: str = os.path.join(base_path, "carbon_reports")
    user_files_path: str = os.path.join(base_path, "user_files")
    

settings = Settings()


class GAIEmbeddersCollections(Enum):
    openai = "OPENAI_CR_EMBS"
    gemini = "GEMINI_CR_EMBS"
    claude = "CLAUDE_CR_EMBS"
    stella_15 = "STELLA_15_CR_EMBS"
    gte_qwen = "GTE_QWEN2_15_CR_EMBS"
    gte_modernbert = "GTE_MODERNBERT_BASE_CR_EMBS"

    @staticmethod
    def mapping():
        coll_map = dict()

        for gai_coll in GAIEmbeddersCollections:
            coll_map[gai_coll.name] = gai_coll.value
            coll_map[gai_coll.name.upper()] = gai_coll.value

        return coll_map
    
    @staticmethod
    def opensource_embedders():
        return {
            GAIEmbeddersCollections.stella_15.name: GAIEmbeddersCollections.stella_15.value,
            GAIEmbeddersCollections.gte_qwen.name: GAIEmbeddersCollections.gte_qwen.value,
            GAIEmbeddersCollections.gte_modernbert.name: GAIEmbeddersCollections.gte_modernbert.value
        }
    
    @staticmethod
    def closedsource_embedders():
        return {
            GAIEmbeddersCollections.openai.name: GAIEmbeddersCollections.openai.value,
            GAIEmbeddersCollections.gemini.name: GAIEmbeddersCollections.gemini.value,
            GAIEmbeddersCollections.claude.name: GAIEmbeddersCollections.claude.value
        }


class GAIModelEmbedder(Enum):
    # opensource
    deepseek: str = Embedders().stella_15
    llama: str = Embedders().stella_15
    
    # closedsource
    openai: str = Embedders().openai
    gemini: str = Embedders().gemini
    claude: str = Embedders().claude

    @staticmethod
    def mapping():
        gai_dict = dict()

        for model in GAIModelEmbedder:
            gai_dict[model.name] = model.value
            gai_dict[model.name.upper()] = model.value

        return gai_dict
    

class GAIModels(Enum):
    openai: Dict[str, str] = {
        "4o": "openai-gpt-4o",
        "4o-mini": "openai-gpt-4o-mini",
        "o1": "openai-o1",
        "o1-mini": "openai-o1-mini"
    }

    gemini: Dict[str, str] = {
        "1.5": "gemini-1.5-flash",
        "2.0": "gemini-2.0-flash-exp"
    }

    claude: Dict[str, str] = {
        "sonnet": "claude-3-5-sonnet-latest",
        "opus": "claude-3-opus-latest"
    }

    deepseek: Dict[str, str] = {
        "1.5": "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
        "7B": "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
        "8B": "deepseek-ai/DeepSeek-R1-Distill-Llama-8B"
    }

    ollama: Dict[str, str] = {
        "llama3": "ollama-llama3",
        "llama3.2": "ollama-llama3.2"
    }
    
    @staticmethod
    def mapping() -> Dict:
        gai_dict = dict()

        for model in GAIModels:
            gai_dict[model.name.lower()] = model.value
            gai_dict[model.name.upper()] = model.value

        return gai_dict
    
