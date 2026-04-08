import mimetypes
import os

from bson.objectid import ObjectId

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from motor.motor_asyncio import AsyncIOMotorDatabase

from ..core.config import settings
from ..core.schemas import DownloadsRequest
from ..core.utils import get_logger

from ..core.dependencies import get_mongo_client

logger = get_logger(__name__)

router = APIRouter()

@router.post(
        "/report",
        tags=["Downloads"],
        description="Downloads a file based on the report_id")
async def downloads(
    downloads_req: DownloadsRequest,
    db: AsyncIOMotorDatabase = Depends(get_mongo_client)
):
    report_collection = db.get_collection("reports")

    report_id = downloads_req.report_id

    if not report_id:
        raise HTTPException(
            detail="Report ID should not be empty or None",
            status_code=400
        )

    try:
        report_id = ObjectId(report_id)
    except:
        raise HTTPException(
            detail="Invalid Report Id Format",
            status_code=400
        )

    report = await report_collection.find_one(
        {"_id": report_id}
    )

    if not report:
        raise HTTPException(
            detail = f"Report not found with ID: {str(report_id)}",
            status_code = 400
        )

    report_path = os.path.join(settings.carbon_reports_path, f"carbon_report_{str(report_id)}.pdf")

    if not os.path.exists(report_path):
        raise HTTPException(
            detail = "Report is not yet generated or the process might've failed. Please check logs!",
            status_code = 400
        )

    mime_type, _ = mimetypes.guess_type(report_path)
    media_type = mime_type or "application/octet-stream"

    return FileResponse(
        path = report_path,
        filename=f"carbon_report_{str(report_id)}.pdf",
        media_type = media_type
    )
