import os
import httpx

PDF_EXTRACT_API_URL = os.getenv("PDF_EXTRACT_API_URL", "http://127.0.0.1:8000")


async def create_extract_job(
    file_bytes: bytes,
    filename: str,
    content_type: str = "application/pdf",
    company_number: str | None = None,
    company_name: str | None = None,
    year: str | None = None,
    standard: str | None = None,
    revenue_override_million: str | None = None,
):
    async with httpx.AsyncClient(timeout=120.0) as client:
        files = {
            "file": (filename, file_bytes, content_type)
        }

        data = {}
        if company_number is not None:
            data["company_number"] = company_number
        if company_name is not None:
            data["company_name"] = company_name
        if year is not None:
            data["year"] = year
        if standard is not None:
            data["standard"] = standard
        if revenue_override_million is not None:
            data["revenue_override_million"] = revenue_override_million

        resp = await client.post(
            f"{PDF_EXTRACT_API_URL}/api/extract",
            files=files,
            data=data,
        )
        resp.raise_for_status()
        return resp.json()


async def get_extract_status(job_id: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{PDF_EXTRACT_API_URL}/api/extract/{job_id}/status")
        resp.raise_for_status()
        return resp.json()


async def get_extract_result(job_id: str):
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.get(f"{PDF_EXTRACT_API_URL}/api/extract/{job_id}/result")
        resp.raise_for_status()
        return resp.json()