from typing import Dict, Union, List

from ...core.dependencies import celery_app
from ...core.utils import get_logger
from ...agents import AgentBase
from ...agents.prompts import *


logger = get_logger(__name__)

@celery_app.task(ignore_result=False, track_started=True)
def start_generating(cr_plan: Dict, user_instructions: str, generated_plan: Dict, context: str=None) -> Union[None, List]:
    logger.info("------------Executing Generation Process------------")

    logger.info("------------Creating All required Agents------------")

    desc_agent = AgentBase(genai_model=cr_plan.get("genai_model"),
                           temperature=0.7,
                           device=cr_plan.get("device"),
                           system_message=SYSTEM_PROMPT_DESCRIPTION)

    multi_agents = []
    logger.info("Initialized multi_agents as an empty list.")

    for section, desc in generated_plan.items():
        logger.info(f"Processing section: {section}, Desc Type: {type(desc)}")
        desc_prompt = []

        if context is not None and len(context) != 0:
            desc_prompt = [context]

        desc_prompt += [user_instructions,
                        ADD_SECTION_CONTEXT.format(section_name=section,
                                                   section_ctx=desc)]
        detailed_desc = desc_agent(desc_prompt, store_history=False)

        if not isinstance(detailed_desc, str):
            detailed_desc = str(detailed_desc)

        multi_agents.append({
            "section": section,
            "description": detailed_desc,
            "agent_output": None
        })

        logger.info(f"Appending entry to multi_agents with section: {section} (detailed desc: {detailed_desc} with type: {type(detailed_desc)})")

    logger.info(f"Total number of Multi Agents: {len(multi_agents)}")

    for idx, agent_dict in enumerate(multi_agents):
        agent = AgentBase(genai_model=cr_plan.get("genai_model"),
                          temperature=0.7,
                          device=cr_plan.get("device"),
                          system_message=SYSTEM_PROMPT_SECTION_GENERATION)

        agent_desc = ADD_SECTION_DESCRIPTION.format(section_name=agent_dict["section"],
                                                    section_desc=agent_dict["description"])
        agent_prompt = [user_instructions, agent_desc]
        agent_output = agent(agent_prompt)

        if not isinstance(agent_output, str):
            agent_output = str(agent_output)

        multi_agents[idx]["agent_output"] = agent_output

        logger.info(f"Generated agent_output for index {idx}, agent_output type={type(agent_output)}")

    for i, item in enumerate(multi_agents):
        sec_t = type(item.get("section"))
        desc_t = type(item.get("description"))
        out_t = type(item.get("agent_output"))

        logger.info(f"[Before returning] multi_agents[{i}] -> section type={sec_t}, "
                    f"description type={desc_t}, agent_output type={out_t}")

    return multi_agents
