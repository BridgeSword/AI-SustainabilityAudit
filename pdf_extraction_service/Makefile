ENV=pdf_extraction

setup:
	conda env create -n $(ENV) -f environment.yml || conda env update -n $(ENV) -f environment.yml

run:
	conda run -n $(ENV) uvicorn web_api.main:app --host 0.0.0.0 --port 8000 --reload