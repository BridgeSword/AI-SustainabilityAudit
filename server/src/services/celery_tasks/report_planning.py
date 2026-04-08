import json
from typing import Dict, Union

import torch

from sentence_transformers import SentenceTransformer

from ...core.dependencies import celery_app, milvus_client
from ...core.utils import get_logger
from ...core.config import settings, GAIEmbeddersCollections
from ...agents import AgentBase
from ...agents.prompts import *


logger = get_logger(__name__)

@celery_app.task(ignore_result=False, track_started=True)
def start_thresholding(cr_plan: Dict, user_instructions: str) -> Union[None, int]:
    logger.info("------------Executing Thresholder Agent------------")

    logger.info("Started deciding the threshold no. of loops required to complete the planning!")

    thresholder_agent = AgentBase(genai_model=cr_plan.get("genai_model"),
                                  temperature=0.7,
                                  device=cr_plan.get("device"),
                                  system_message=SYSTEM_PROMPT_THRESHOLDER)
    req_threshold = None

    for _ in range(2):
        try:
            agent_out = thresholder_agent(user_instructions, json_out=True, store_history=False)
            logger.info("###########################################################################################")
            logger.info(agent_out)
            agent_out = agent_out[0]
            req_threshold = int(min(max(1, int(agent_out["threshold"])), 5))
            break
        except Exception as e:
            logger.warning(f"------------\nRetrying again as Thresholding failed due to error: {e}\n------------")
            thresholder_agent.clear_history()

    if not req_threshold:
        return None

    return req_threshold


@celery_app.task(ignore_result=False, track_started=True)
def start_planning(cr_plan: Dict, user_instructions: str, req_threshold: int) -> Union[None, tuple]:
    logger.info("------------Executing Planner Process------------")

    embedding_model = "stella_15"
    emb_model = settings.embedders.model_fields[embedding_model].default

    device = "cuda" if torch.cuda.is_available() else "cpu"

    embedder = SentenceTransformer(emb_model,
                                   trust_remote_code=True, 
                                   device=device)

    query_embedding = embedder.encode(user_instructions, device=device)

    vector_col_name = GAIEmbeddersCollections.mapping()[embedding_model]

    results = milvus_client.search(
        collection_name=vector_col_name,
        anns_field="vector_embs",
        data=[query_embedding],
        limit=3,
        search_params={"metric_type": "L2"}, 
        output_fields=["text_chunk"]
    )
    logger.info(results[0])

    context = ""

    relevant_ctx = []
    for hits in results:
        for idx, hit in enumerate(hits):
            relevant_ctx.append(f"{idx + 1}. " + hit["entity"]["text_chunk"])

    if len(relevant_ctx) > 0:
        context = ADDITIONAL_CONTEXT.format(context="\n\n".join(relevant_ctx))

        logger.info("------------RETURNED CONTEXT------------")
        logger.info(context)

    planner_agent = AgentBase(genai_model=cr_plan.get("genai_model"),
                              temperature=0.7,
                              device=cr_plan.get("device"),
                              system_message=SYSTEM_PROMPT_PLANNING)
    
    evaluation_agent = AgentBase(genai_model=cr_plan.get("genai_model"),
                                 temperature=0.7,
                                 device=cr_plan.get("device"),
                                 system_message=SYSTEM_PROMPT_PLAN_EVALUATION)

    plan_instruction = context + "\n\n" + user_instructions
    plan_instruction = plan_instruction.strip()

    generated_plan = None

    for _ in range(2):
        try:
            for _ in range(req_threshold):
                logger.info("------------Generating Plan------------")
                generated_plan = planner_agent(plan_instruction, json_out=True)[0]

                generated_plan_str = json.dumps(generated_plan, indent=4)

                critique = evaluation_agent(AGENT_PLAN_PROMPT.format(plan=generated_plan_str), json_out=True)[0]

                if critique.get("modification", None) is not None:
                    logger.info("------------Modifying Plan based on the critique------------")
                    plan_instruction = PLAN_MODIFICATION_CRITIQUE.format(critique=critique["critique"])
                    continue
                else:
                    break

            if generated_plan is not None:
                break
        except Exception as e:
            logger.warning(f"------------\nRetrying again as Planning failed due to error: {e}\n------------")
            planner_agent.clear_history()
            evaluation_agent.clear_history()
            continue
    
    return generated_plan, context

