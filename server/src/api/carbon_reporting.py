import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends

from motor.motor_asyncio import AsyncIOMotorDatabase

from bson.objectid import ObjectId

from dataclasses import asdict

from ..core.utils import get_logger, create_multipage_pdf
from ..core.schemas import *
from ..core.config import GAIModels
from ..core.constants import Status, Constants, WebsocketStatus

from ..services.celery_tasks.report_planning import start_planning, start_thresholding
from ..services.celery_tasks.report_generation import start_generating

from ..ws.manager import WSConnectionManager

from ..agents.prompts import USER_INSTRUCTIONS

from ..core.dependencies import get_mongo_client

from ..db.mongo.report import ReportModel
from ..db.mongo.section import SectionModel


logger = get_logger(__name__)

router = APIRouter()

ws_manager = WSConnectionManager()


@router.websocket("/ws/plan_generate")
async def plan_report_ws(
    websocket: WebSocket,
    db: AsyncIOMotorDatabase = Depends(get_mongo_client)
):
    report_collection = db.get_collection("reports")
    section_collection = db.get_collection("sections")

    await ws_manager.connect(websocket)
    
    # Need to update all these by saving and fetching the values from MongoDB
    cr_plan_obj = CRPlanRequest()
    generated_plan = None

    user_modification_request = None
    user_instructions = None

    req_threshold = None
    completed = False

    current_status = WebsocketStatus.plan.value

    # need to change with actual user_id later when the login functionality is implemented
    user_id = ObjectId()
    report = None

    context = ""

    try:
        while True:
            if current_status == WebsocketStatus.plan.value:
                if user_modification_request is None:
                    cr_plan_req = await websocket.receive_json()
                    
                    cr_std = Constants[cr_plan_req["standard"].upper()].value
                    cr_std_prompt = f"{cr_std.full_form}: {cr_std.description}"
                    
                    cr_plan_obj.user_id = cr_plan_req["user_id"]
                    cr_plan_obj.report_name = cr_plan_req["report_name"]
                    cr_plan_obj.standard = cr_std_prompt
                    cr_plan_obj.goal = cr_plan_req["goal"]
                    cr_plan_obj.plan = cr_plan_req["plan"]
                    cr_plan_obj.action = cr_plan_req["action"]
                    cr_plan_obj.company = cr_plan_req["company"]

                    report = ReportModel(
                        user_id=cr_plan_obj.user_id,
                        report_name=cr_plan_obj.report_name,
                        standard=cr_plan_obj.standard,
                        goal=cr_plan_obj.goal,
                        user_plan=cr_plan_obj.plan,
                        action=cr_plan_obj.action,
                        company=cr_plan_obj.company
                    )

                    report = await report_collection.insert_one(
                        report.model_dump(by_alias=True, exclude=["id"])
                    )

                    cr_plan_obj.device = cr_plan_req.get("device", "cpu")

                    user_instructions = USER_INSTRUCTIONS.format(
                        company=cr_plan_obj.company.upper(),
                        carbon_std=cr_plan_obj.standard, 
                        carbon_goal=cr_plan_obj.goal, 
                        carbon_plan=cr_plan_obj.plan, 
                        carbon_action=cr_plan_obj.action
                    )

                    gai_model = cr_plan_req.get("genai_model", "openai-4o").lower().split("-")

                    if len(gai_model) < 2:
                        await ws_manager.send_json_obj(
                            CRPlanResponse(
                                task_status = Status.failed.value,
                                error = "No GenAI Model specified or the variant is not supported!"
                            ).json(), websocket)
                        await ws_manager.disconnect_and_close(websocket)
                        break

                    genai_models = GAIModels.mapping().get(gai_model[0], None)

                    if not genai_models:
                        await ws_manager.send_json_obj(
                            CRPlanResponse(
                                task_status=Status.failed.value,
                                error=f"Unknown GenAI model type: {gai_model[0]}"
                            ).json(), websocket)
                        await ws_manager.disconnect_and_close(websocket)
                        break

                    genai_model_variant = genai_models.get("-".join(gai_model[1:]), None)

                    if not genai_model_variant:
                        await ws_manager.send_json_obj(
                            CRPlanResponse(
                                task_status=Status.failed.value,
                                error=f"Unknown GenAI model variant: {"-".join(gai_model[1:])}"
                            ).json(), websocket)
                        await ws_manager.disconnect_and_close(websocket)
                        break

                    cr_plan_obj.genai_model = genai_model_variant

                    threshold_task = start_thresholding.apply_async(
                        args=[asdict(cr_plan_obj), user_instructions]
                    )

                    while not threshold_task.ready():
                        await asyncio.sleep(1)

                    req_threshold = threshold_task.get()
                    
                    if req_threshold is None:
                        await ws_manager.send_json_obj(
                            CRPlanResponse(
                                task_status = Status.failed.value,
                                error = "Thresholding step failed!"
                            ).json(), websocket)

                        await ws_manager.disconnect_and_close(websocket)
                        
                        break

                    await ws_manager.send_json_obj(
                        CRPlanResponse(
                            task_status = Status.success.value,
                            response = "Thresholding completed! Moving to Planning now..."
                        ).json(), websocket)
                    
                    planning_task = start_planning.apply_async(
                        args=[asdict(cr_plan_obj), user_instructions, req_threshold]
                    )

                    while not planning_task.ready():
                        await asyncio.sleep(1)

                    generated_plan, context = planning_task.get()

                    if generated_plan is None:
                        await ws_manager.send_json_obj(
                            CRPlanResponse(
                                task_status = Status.failed.value,
                                error = "Planning step failed!"
                            ).json(), websocket)

                        await ws_manager.disconnect_and_close(websocket)
                        
                        break

                    section_ids = []

                    logger.info("\n\nGenerated Plan: \n{}\n\n\n".format(generated_plan))

                    generated_plan_str_format = {}
                    for section_name, section_summary in generated_plan.items():
                        curr_section = SectionModel(
                            name=str(section_name),
                            initial_summary=str(section_summary)
                        )
                        generated_plan_str_format[str(section_name)] = str(section_summary)

                        curr_section = await section_collection.insert_one(
                            curr_section.model_dump(by_alias=True, exclude=["id"])
                        )

                        section_ids.append(curr_section.inserted_id)

                    await report_collection.find_one_and_update(
                        {"_id": report.inserted_id},
                        {
                            "$set": {
                                "sectionIds": section_ids
                            }
                        }
                    )

                    await ws_manager.send_json_obj(
                        CRPlanResponse(
                            task_status = Status.success.value,
                            response = generated_plan_str_format
                        ).json(), websocket)
                    
                    current_status = WebsocketStatus.user_acceptance.value

                else:
                    # handle the user_modification flow
                    # need to modify the way in which history of the planning agent is maintained
                    pass
            
            elif current_status == WebsocketStatus.user_acceptance.value:
                user_accepted = await websocket.receive_json()

                # handle received json better here
                if user_accepted["proceed"]:
                    current_status = WebsocketStatus.generate.value
                    continue
                else:
                    user_modification_request = user_accepted["user_comment"]
                    current_status = WebsocketStatus.plan.value
                
            elif current_status == WebsocketStatus.generate.value:
                report_gen_task = start_generating.apply_async(
                    args=[asdict(cr_plan_obj), user_instructions, generated_plan, context]
                )

                while not report_gen_task.ready():
                    await asyncio.sleep(1)

                generated_report = report_gen_task.get()

                if generated_report is None:
                    await ws_manager.send_json_obj(
                        CRPlanResponse(
                            task_status = Status.failed.value,
                            error = "Generation step failed!"
                        ).json(), websocket)

                    await ws_manager.disconnect_and_close(websocket)
                    break

                report_response = {}

                whole_report = []

                req_report = await report_collection.find_one(
                    {"_id": report.inserted_id}
                )

                req_section_ids = req_report.get("sectionIds")

                for idx, report_dict in enumerate(generated_report):
                    report_response[report_dict["section"]] = report_dict["agent_output"]
                    whole_report.append(report_dict["agent_output"])

                    section_update = await section_collection.find_one_and_update(
                        {"_id": req_section_ids[idx]},
                        {"$set":
                            {
                                "description": report_dict["description"],
                                "agentOutput": report_dict["agent_output"]
                            }
                        }
                    )

                # Add References to generated report independently by fetching it from public sources and vector database

                whole_report = "\n\n".join(whole_report)

                pdf_filename = f"carbon_report_{str(report.inserted_id)}.pdf"

                create_multipage_pdf(
                    text=whole_report,
                    company_name=req_report.get("company"),
                    filename=pdf_filename
                )

                final_report = []

                for idx, section_detail in enumerate(generated_report):
                    final_report.append({
                        "section": str(section_detail["section"]),
                        "description": str(section_detail["description"]),
                        "agent_output": str(section_detail["agent_output"]),
                        "section_id": str(req_section_ids[idx])
                    })

                await ws_manager.send_json_obj(
                    CRPlanResponse(
                        task_status = Status.success.value,
                        response = {
                            "report_id": str(report.inserted_id),
                            "generated_report": final_report
                        }
                    ).json(), websocket)
                
                completed = True
            
            if completed:
                await ws_manager.disconnect_and_close(websocket)
                break
            
        if websocket in ws_manager.active_connections:
            await ws_manager.disconnect_and_close(websocket)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
        if websocket in ws_manager.active_connections:
            ws_manager.active_connections.remove(websocket)

