from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..core.constants import Status
from ..core.utils import get_logger
from ..core.schemas import UserLoginRequest, UserSignUpRequest, UserChangePwdRequest, UserDeleteAccountRequest, \
    GenericResponse
from ..core.schemas import UserOperationResponse
from ..core.dependencies import get_mongo_client
from typing import Union

from ..db.mongo.user import UserModel
from fastapi.encoders import jsonable_encoder

logger = get_logger(__name__)

router = APIRouter()

@router.post(
    "/login",
    tags=["User Operations"],
    response_model=UserOperationResponse,
)
async def login(
    user_login_request: UserLoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_mongo_client),
):
    user_collection   = db.get_collection("users")
    report_collection = db.get_collection("reports")

    user = await user_collection.find_one({"email": user_login_request.user_email})
    if not user or user["password"] != user_login_request.password:
        return UserOperationResponse(
            success=False,
            message="Invalid user email or password",
        )

    # ── ONLY pull _id from each matching report ──────────────────────────────
    cursor       = report_collection.find({"userId": str(user["_id"])})
    reports_raw  = await cursor.to_list(length=None)

    history_list = [
        {
            "_id":      str(r.get("_id")),
            "reportName": str(r.get("reportName", "untitled")),
            "standard": str(r.get("standard", "")),
            "goal": str(r.get("goal", "")),
            "user_plan": str(r.get("user_plan", "")),
            "action": str(r.get("action", "")),
            "company": str(r.get("company", "")),
        }
        for r in reports_raw
    ]

    return UserOperationResponse(
        success=True,
        user_id=str(user["_id"]),
        company=str(user.get("company", "unknown")),
        message="Login successful",
        history_list=jsonable_encoder(history_list),
    )

@router.post(
    "/sign-up",
    tags=["User Operations"],
    response_model=Union[UserOperationResponse, GenericResponse])
async def signup(
        user_sign_up_request: UserSignUpRequest,
        db: AsyncIOMotorDatabase = Depends(get_mongo_client)
):
    user_collection = db.get_collection("users")
    user_info = UserModel(
        email=user_sign_up_request.user_email,
        password=user_sign_up_request.password,
        company=user_sign_up_request.company_name
    )

    user_operation_response = UserOperationResponse()
    success = False
    message = ""

    result = None

    user = await user_collection.find_one({"email": user_sign_up_request.user_email})
    if user:
        success = False
        message = "User already exists"
    else:
      result = await user_collection.insert_one(user_info.model_dump(by_alias=True, exclude=["id"]))
      message = "User created successfully"
      success = True

    if not result:
        return GenericResponse(
            response="Unable to sign up",
            status=Status.failed.value
        )
    
    user_operation_response.success = success
    user_operation_response.user_id = str(result.inserted_id) if success else None
    user_operation_response.message = message
    return user_operation_response


@router.post(
    "/change-pwd",
    tags=["User Operations"],
    response_model=UserOperationResponse)
async def change_pwd(
        user_change_pwd_request: UserChangePwdRequest,
        db: AsyncIOMotorDatabase = Depends(get_mongo_client)
):
    user_collection = db.get_collection("users")
    user_email = user_change_pwd_request.user_email
    old_password = user_change_pwd_request.old_password
    new_password = user_change_pwd_request.new_password

    user_operation_response = UserOperationResponse()
    success = False
    message = ""

    user = await user_collection.find_one({"email": user_email})
    if user and user["password"] == old_password:
        await user_collection.update_one({"email": user_email}, {"$set": {"password": new_password}})
        success = True
        message = "Password changed successfully"
    else:
        success = False
        message = "Invalid credentials"

    user_operation_response.success = success
    user_operation_response.user_id = str(user["_id"]) if success else None
    user_operation_response.message = message
    return user_operation_response


@router.post("/delete-account", tags=["User Operations"])
async def delete_account(
        user_delete_account_request: UserDeleteAccountRequest,
        db: AsyncIOMotorDatabase = Depends(get_mongo_client)
):
    user_collection = db.get_collection("users")
    user_email = user_delete_account_request.user_email
    password = user_delete_account_request.password

    user_operation_response = UserOperationResponse()
    success = False
    message = "Invalid credentials"

    user = await user_collection.find_one({"email": user_email})
    if user:
        if user["passord"] == password:
            await user_collection.delete_one({"_id": user["_id"]})
            success = True
            message = "Account deleted successfully" 

    user_operation_response.success = success
    user_operation_response.user_id = str(user["_id"]) if success else None
    user_operation_response.message = message
    return user_operation_response