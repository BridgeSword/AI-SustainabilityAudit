import os
import httpx

PDF_EXTRACT_API_URL = os.getenv("PDF_EXTRACT_API_URL", "http://127.0.0.1:8000")

async def extract_pdf(file_bytes: bytes, filename: str, content_type: str = "application/pdf"):
    async with httpx.AsyncClient(timeout=120.0) as client:
        files = {
            "file": (filename, file_bytes, content_type)
        }

        resp = await client.post(f"{PDF_EXTRACT_API_URL}/api/extract", files=files)
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