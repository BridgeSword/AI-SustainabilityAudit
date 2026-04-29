import os
import json
import logging
import hashlib
from pathlib import Path

# Heavy deps (torch / PDF tooling) are imported lazily inside the functions that
# actually use them, so that simply importing this module does NOT require the
# full ML / PDF stack to be installed. This lets the backend boot in a minimal
# environment (DB + API only).

from ..core.config import settings


def get_logger(scope):
    logger = logging.getLogger(scope)

    # Fall back to "local" if APP_ENV hasn't been set yet — this module can be
    # imported before load_dotenv() runs, so a hard KeyError would break startup.
    app_env = os.environ.get("APP_ENV", "local")
    if app_env in ["local", "dev", "stage"]:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)

    return logger

logger = get_logger(__name__)


def make_directories(dir_list):
    for _dir_ in dir_list:
        if os.path.exists(_dir_):
            continue
        os.makedirs(_dir_)

 
def delete_file(filepath):
    if os.path.exists(filepath):
        os.remove(filepath)


def get_hash(file_path):
    BUF_SIZE = 256*1024 # 256 KB

    with open(file_path, "rb") as fptr:
        file_hash = hashlib.md5()

        while chunk := fptr.read(BUF_SIZE):
            file_hash.update(chunk)

    return file_hash.hexdigest()


def get_device(req_device: str = None):
    import torch  # lazy
    if req_device is not None and req_device.lower().strip() == "cuda" and torch.cuda.is_available():
        return "cuda"
    elif req_device is not None and req_device.lower().strip() == "mps" and torch.mps.is_available():
        return "mps"
    else:
        logger.info("No CUDA or MPS found! Using CPU instead!")
        return "cpu"


def clear_torch_cache():
    import torch  # lazy
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    if torch.mps.is_available():
        torch.mps.empty_cache()


def RawJSONDecoder(index):
    class _RawJSONDecoder(json.JSONDecoder):
        end = None

        def decode(self, s, *_):
            data, self.__class__.end = self.raw_decode(s, index)
            return data
    return _RawJSONDecoder


def extract_json(s, index=0):
    while (index := s.find('{', index)) != -1:
        try:
            yield json.loads(s, cls=(decoder := RawJSONDecoder(index)))
            index = decoder.end
        except json.JSONDecodeError:
            index += 1


def thresolder(curr_val, max_val):
    return min(curr_val, max_val)


def add_pdf_numbering(file_path):
    # lazy imports – only needed when actually generating PDFs
    from fpdf import Align
    from pdfnumbering import PdfNumberer
    from pypdf import PdfWriter

    numberer = PdfNumberer(
        first_number=1,
        ignore_pages=(),
        skip_pages=(),
        stamp_format="{}",
        font_size=12,
        font_family="Helvetica",
        text_color=(0x18, 0x18, 0x18),
        text_align=Align.C,
        text_position=(0, -1),
        # page_margin=(28, 28),
    )

    document = PdfWriter(clone_from=file_path)
    numberer.add_page_numbering(document.pages)
    document.write(file_path)


def create_multipage_pdf(text, company_name, filename="output.pdf"):
    # lazy imports – only needed when actually generating PDFs
    from markdown_pdf import MarkdownPdf, Section

    pdf_title = f"<center><h1>{company_name} Carbon Report</h1></center>\n\n"
    file_path = os.path.join(settings.carbon_reports_path, filename)

    pdf = MarkdownPdf()

    pdf.add_section(Section(pdf_title + text.strip(), toc=False))

    pdf.save(file_path)

    add_pdf_numbering(Path(str(file_path)))
