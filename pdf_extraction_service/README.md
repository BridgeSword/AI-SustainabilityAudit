# PDF_Extraction_SA_AIM_T2
- extracting reports 34-66

## Quickstart (Conda)
```bash
conda env create -f environment.yml
conda activate pdf_extraction
python -m uvicorn web_api.main:app --host 127.0.0.1 --port 8000 --reload

Open: http://127.0.0.1:8000/docs

## Notes

Runtime outputs are written to runs/ (ignored by git).

You can override output dir by setting:

export WEB_RUNS_DIR=/path/to/runs

make setup
make run