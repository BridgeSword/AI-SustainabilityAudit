# web_api/extractor.py
from __future__ import annotations

import json
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional


ROOT_DIR = Path(__file__).resolve().parents[1]
UTILS_DIR = ROOT_DIR / "utils"
if str(UTILS_DIR) not in sys.path:
    sys.path.insert(0, str(UTILS_DIR))


def _import_docling_converter():
    """
    Docling API (as commonly used):
      from docling.document_converter import DocumentConverter
      result = DocumentConverter().convert("file.pdf")
      doc = result.document
      doc_dict = doc.export_to_dict()
    """
    try:
        from docling.document_converter import DocumentConverter  # type: ignore
        return DocumentConverter
    except Exception as e:
        raise ImportError(
            "Docling import failed. In your conda env, run:\n"
            "  pip install docling\n"
            f"Original import error: {e}"
        ) from e


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _build_docling_converter():
    """
    Build DocumentConverter with optional OCR disable switch.
    Env:
      - DOCLING_DISABLE_OCR=1 : try to disable OCR for digital PDFs (faster, lower memory).
    """
    DocumentConverter = _import_docling_converter()
    disable_ocr = _env_flag("DOCLING_DISABLE_OCR", default=False)
    if not disable_ocr:
        return DocumentConverter()

    # Best-effort config: API shape can vary by docling version.
    try:
        from docling.datamodel.pipeline_options import PdfPipelineOptions  # type: ignore
        from docling.document_converter import PdfFormatOption  # type: ignore

        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = False
        return DocumentConverter(format_options={"pdf": PdfFormatOption(pipeline_options=pipeline_options)})
    except Exception:
        # Fallback silently to default converter if this version does not support these options.
        return DocumentConverter()


def _get_pdf_page_count(pdf_path: str | Path) -> int:
    try:
        import fitz  # type: ignore
    except Exception as e:
        raise ImportError(
            "PyMuPDF is required for chunked PDF processing. "
            "Install with: pip install pymupdf"
        ) from e

    doc = fitz.open(str(pdf_path))
    try:
        return int(doc.page_count)
    finally:
        doc.close()


def _write_pdf_page_range(
    pdf_path: str | Path,
    start_page: int,
    end_page: int,
    out_path: str | Path,
) -> None:
    """
    Writes page range [start_page, end_page) (0-indexed) into a new PDF file.
    """
    import fitz  # type: ignore

    src = fitz.open(str(pdf_path))
    out = fitz.open()
    try:
        out.insert_pdf(src, from_page=start_page, to_page=end_page - 1)
        out.save(str(out_path), garbage=3, deflate=True)
    finally:
        out.close()
        src.close()


def _parse_number(x: Any) -> Optional[float]:
    if x is None:
        return None
    s = str(x).strip()
    if s == "" or s == "-":
        return None
    # remove commas
    s = s.replace(",", "")
    # handle parentheses negative
    neg = False
    if s.startswith("(") and s.endswith(")"):
        neg = True
        s = s[1:-1].strip()

    # keep only first numeric token
    m = re.search(r"-?\d+(\.\d+)?", s)
    if not m:
        return None
    val = float(m.group(0))
    return -val if neg else val


def _year_patterns(year: int) -> list[re.Pattern[str]]:
    """
    Match common table header year formats:
    - 2023
    - FY2023 / FY 2023
    - FY23 / FY 23
    """
    yy = str(year % 100).zfill(2)
    yyyy = str(year)
    return [
        re.compile(rf"\b{re.escape(yyyy)}\b", re.IGNORECASE),
        re.compile(rf"\bfy\s*{re.escape(yyyy)}\b", re.IGNORECASE),
        re.compile(rf"\bfy\s*{re.escape(yy)}\b", re.IGNORECASE),
    ]


def _row_has_year(cell_text: str, year: int) -> bool:
    s = _normalize_text(cell_text)
    if not s:
        return False
    return any(p.search(s) for p in _year_patterns(year))


def _normalize_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value).replace("\n", " ")).strip().lower()


def _table_has_year(table_2d: list[list[Any]], year: int, scan_rows: int = 4) -> bool:
    if not table_2d:
        return False
    for r in table_2d[:scan_rows]:
        for c in r:
            if _row_has_year(str(c), year):
                return True
    return False


def _find_value_in_table(
    table_2d: list[list[Any]],
    row_label_regex: str,
    year: int,
    prefer_actual: bool = True,
    label_cols: tuple[int, ...] = (0, 1),
    require_year_col: bool = False,
) -> Optional[float]:
    """
    Finds a column for {year} (prefer "actual"), then finds a row whose label matches row_label_regex.
    - label can appear in col0 or col1 (common in Docling tables)
    - if require_year_col=True and header doesn't contain the year, returns None (prevents wrong fallbacks)
    """
    if not table_2d or not table_2d[0]:
        return None

    # Docling can emit multi-row headers; scan the first few rows for year columns.
    header_rows = table_2d[: min(3, len(table_2d))]
    max_cols = max(len(r) for r in header_rows)
    header_cells_by_col: list[str] = []
    for col in range(max_cols):
        joined = " ".join(_normalize_text(r[col]) for r in header_rows if col < len(r)).strip()
        header_cells_by_col.append(joined)

    # choose column index by year; fallback to "actual/current", then right-most numeric in row.
    candidates: list[int] = [
        i for i, h in enumerate(header_cells_by_col) if _row_has_year(h, year)
    ]
    col_idx: Optional[int] = None
    if candidates:
        if prefer_actual:
            for i in candidates:
                if "actual" in header_cells_by_col[i]:
                    col_idx = i
                    break
        if col_idx is None:
            col_idx = candidates[0]
    else:
        fallback_candidates = [
            i for i, h in enumerate(header_cells_by_col)
            if ("actual" in h or "current" in h or "reporting" in h)
        ]
        if fallback_candidates:
            col_idx = fallback_candidates[0]
        elif require_year_col:
            return None

    pat = re.compile(row_label_regex, re.IGNORECASE)

    for r in table_2d:
        if not r:
            continue

        # find label match in allowed label columns
        matched = False
        matched_label_col: Optional[int] = None
        for lc in (*label_cols, 2):
            if lc < len(r):
                label = _normalize_text(r[lc])
                if label and pat.search(label):
                    matched = True
                    matched_label_col = lc
                    break

        if not matched:
            continue

        if col_idx is not None and col_idx < len(r):
            parsed = _parse_number(r[col_idx])
            if parsed is not None:
                return parsed

        # fallback: choose right-most parseable number in row (excluding label cols)
        for i in range(len(r) - 1, -1, -1):
            if i in label_cols or i == matched_label_col:
                continue
            parsed = _parse_number(r[i])
            if parsed is not None:
                return parsed

    return None


def _unit_multiplier_for_label(label: str, target_unit: str) -> float:
    """
    Minimal unit helpers to match your dataset columns.
    """
    l = label.lower()

    # Scope tables in your PDF are in "million metric tons"
    if "million metric tons" in l and target_unit == "metric tonnes":
        return 1_000_000.0

    # SOx row is "kilotons"
    if "kilotons" in l and target_unit == "metric tonnes":
        return 1_000.0

    # water is "million m3" -> MGal (million gallons): million m3 * 264.172 = MGal
    if "million m3" in l and target_unit == "mgal":
        return 264.172

    return 1.0


def normalize_to_one_row(
    extracted_tables: Dict[str, Dict[str, Any]],
    meta: Dict[str, Any],
    company_number: Optional[str] = None,
    company_name: Optional[str] = None,
    year: int = 2023,
    standard: Optional[str] = None,
    revenue_override_million: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Build a single row with the exact column headers you listed.
    Missing values stay None.
    """
    tables_2d: Dict[str, list[list[Any]]] = {}
    for ref, obj in extracted_tables.items():
        data = obj.get("data")
        if isinstance(data, list):
            tables_2d[ref] = data

    # ---- pull values (match your PDF tables) ----
    scope1_million = None
    scope2_loc_million = None
    scope2_mkt_million = None
    methane = None
    sox_kilotons = None
    spills_cases = None
    spills_bbl = None
    freshwater_withdraw_million_m3 = None
    industrial_waste_disposed = None
    revenue_million = None

    revenues = None
    other_income_sales = None

    for ref, t2d in tables_2d.items():
        # 不强制要求表头必须有年份，先靠行标签匹配，再按年份/actual/current回退取值。

        # --- Scope 1/2 + methane (from metrics tables like #/tables/41 or #/tables/9) ---
        v = _find_value_in_table(t2d, r"\bScope\s*1\s+emissions\b", year, label_cols=(0, 1))
        if v is not None:
            scope1_million = v

        v = _find_value_in_table(t2d, r"\bScope\s*2\s+emissions\b.*location", year, label_cols=(0, 1))
        if v is not None:
            scope2_loc_million = v

        v = _find_value_in_table(t2d, r"\bScope\s*2\s+emissions\b.*market", year, label_cols=(0, 1))
        if v is not None:
            scope2_mkt_million = v

        v = _find_value_in_table(t2d, r"Upstream methane emissions", year, label_cols=(0, 1))
        if v is not None:
            methane = v

        # --- SOx / spills / water / waste (often in tables like #/tables/43 or #/tables/23) ---
        v = _find_value_in_table(t2d, r"\bSOx\b", year, label_cols=(0, 1))
        if v is not None:
            sox_kilotons = v

        v = _find_value_in_table(t2d, r"Number of hydrocarbon spills", year, label_cols=(0, 1))
        if v is not None:
            spills_cases = v

        v = _find_value_in_table(t2d, r"Volume of hydrocarbon spills", year, label_cols=(0, 1))
        if v is not None:
            spills_bbl = v

        v = _find_value_in_table(t2d, r"Freshwater withdrawal", year, label_cols=(0, 1))
        if v is not None:
            freshwater_withdraw_million_m3 = v

        v = _find_value_in_table(t2d, r"Industrial waste disposed", year, label_cols=(0, 1))
        if v is not None:
            industrial_waste_disposed = v

        # --- Revenue (table #/tables/45: label in col1, value in 2023 actual col) ---
        v = _find_value_in_table(t2d, r"\bRevenues?\b", year, prefer_actual=True, label_cols=(0, 1))
        if v is not None:
            revenues = v

        v = _find_value_in_table(t2d, r"Other income related to sales", year, prefer_actual=True, label_cols=(0, 1))
        if v is not None:
            other_income_sales = v

    # revenue = revenues + other income (if both exist)
    if revenues is not None and other_income_sales is not None:
        revenue_million = revenues + other_income_sales
    elif revenues is not None:
        revenue_million = revenues

    # Unit conversions to match your requested columns
    scope1_tonnes = scope1_million * 1_000_000.0 if scope1_million is not None else None
    scope2_loc_tonnes = scope2_loc_million * 1_000_000.0 if scope2_loc_million is not None else None
    scope2_mkt_tonnes = scope2_mkt_million * 1_000_000.0 if scope2_mkt_million is not None else None
    methane_tonnes = methane * 1_000_000.0 if methane is not None else None
    sox_tonnes = sox_kilotons * 1_000.0 if sox_kilotons is not None else None
    water_mgal = freshwater_withdraw_million_m3 * 264.172 if freshwater_withdraw_million_m3 is not None else None

    revenue_used = revenue_override_million if revenue_override_million is not None else revenue_million

    # GHG intensity (Metric Tonnes CO2e / million$) – typical: (Scope1 + Scope2 location) / revenue
    ghg_intensity = None
    if revenue_used and scope1_tonnes is not None and scope2_loc_tonnes is not None and revenue_used != 0:
        ghg_intensity = (scope1_tonnes + scope2_loc_tonnes) / float(revenue_used)

    # ---- Build row with EXACT headers you listed ----
    row = {
        "Company Number": company_number,
        "Company Name": company_name,
        "Year": year,
        "Standard": standard,
        "Revenue $ million": revenue_used,

        "Scope 1 GHG emissions_Location-based(Metric tonnes CO2e)": scope1_tonnes,
        "Scope 1 GHG emissions1_Market-based (Metric tonnes CO2e)": None,

        "Scope 2 GHG emissions_Location-baed (Metric tonnes CO2e)": scope2_loc_tonnes,
        "Scope 2 GHG emissions_Market-based (Metric tonnes CO2e)": scope2_mkt_tonnes,

        "Scope 3 GHG emissions (Metric tonnes CO2e)": None,
        "Scope 3 GHG emissions_1 (Metric tonnes CO2e)": None,
        "Scope 3 GHG emissions_2 (Metric tonnes CO2e)": None,
        "Scope 3 GHG emissions_3 (Metric tonnes CO2e)": None,

        "Methane Emissions (Metric tonnes CH4)": methane_tonnes,
        "GHG emissions intensity (Metric Tonnes CO2e/million$)": ghg_intensity,

        "NOx emissions (Metric tonnes CO2e)": None,
        "SOx emissions (Metric tonnes CO2e)": sox_tonnes,
        "VOC emissions (Metric tonnes CO2e)": None,
        "Particulate Matter emissions (Metric tonnes CO2e)": None,
        "Emissions of ozone-depleting substances (ODS) (metric tons)": None,

        "Natural gas use (MMBtu)": None,
        "Natural gas use_1": None,
        "Electricity use (MWh)": None,
        "Energy intensity": None,
        "Reductions in energy consumption (MWh)": None,
        "Reductions in energy consumption_1 (MWh)": None,

        "Total water withdrawal by source (MGal)": water_mgal,
        "Percentage and total volume of water recycled and reused (MGal)": None,
        "Total water discharge by quality and destination (MGal)": None,

        "Materials used by weight or volume (Metric tonnes)": None,
        "Percentage of materials used that are recycled input materials": None,

        "Total weight of hazardous waste by type and disposal method (Metric tonnes)": None,
        "Total weight of non-hazardous waste by type and disposal method (Metric tonnes)": industrial_waste_disposed,

        "Total number of significant spills (cases)": spills_cases,
        "Total volume of significant spills (bbl)": spills_bbl,
    }

    return row


def extract_all(pdf_path: str | Path, out_dir: str | Path, meta_extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    pdf_path = str(pdf_path)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    converter = _build_docling_converter()

    # import utils functions
    import get_tables  # from utils dir (sys.path injected)
    extract_text_enabled = _env_flag("DOCLING_EXTRACT_TEXT", default=False)
    if extract_text_enabled:
        import get_text  # from utils dir

    # Process in small chunks to prevent OCR/Docling memory spikes on large PDFs.
    # Set DOCLING_PAGE_CHUNK_SIZE=0 to force one-shot processing.
    try:
        chunk_size = int(os.getenv("DOCLING_PAGE_CHUNK_SIZE", "8"))
    except ValueError:
        chunk_size = 8
    page_count = _get_pdf_page_count(pdf_path)
    if chunk_size <= 0:
        chunk_size = page_count

    extracted_table_objs: Dict[str, Dict[str, Any]] = {}
    per_keyword_refs: Dict[str, set[str]] = {}
    all_refs: set[str] = set()
    chunk_warnings: list[str] = []
    texts_by_chunk: Dict[str, Any] = {}

    with tempfile.TemporaryDirectory(prefix="docling_chunks_") as tmp_dir:
        chunk_idx = 0
        successful_chunks = 0
        for start_page in range(0, page_count, chunk_size):
            end_page = min(start_page + chunk_size, page_count)
            chunk_pdf = Path(tmp_dir) / f"chunk_{chunk_idx}_{start_page+1}_{end_page}.pdf"
            _write_pdf_page_range(pdf_path, start_page, end_page, chunk_pdf)

            try:
                result = converter.convert(str(chunk_pdf))
                doc = getattr(result, "document", None)
                if doc is None:
                    raise RuntimeError("Docling convert() did not return a document.")

                if hasattr(doc, "export_to_dict"):
                    doc_dict = doc.export_to_dict()
                elif hasattr(doc, "to_dict"):
                    doc_dict = doc.to_dict()
                else:
                    raise RuntimeError("Docling document has no export_to_dict()/to_dict().")

                tables_out_chunk: Dict[str, Any] = get_tables.main(doc_dict)
                table_list = doc_dict.get("tables", []) or []
                table_by_ref = {t.get("self_ref"): t for t in table_list if isinstance(t, dict)}

                for k, refs in (tables_out_chunk.get("per keyword table refs", {}) or {}).items():
                    per_keyword_refs.setdefault(k, set())
                    for ref in refs:
                        pref_ref = f"chunk{chunk_idx}:{ref}"
                        per_keyword_refs[k].add(pref_ref)

                for ref in tables_out_chunk.get("all table refs", []):
                    t = table_by_ref.get(ref)
                    if not t:
                        continue
                    df = get_tables.extract_table_to_df(t)
                    data_2d = df.fillna("").astype(str).values.tolist()
                    pref_ref = f"chunk{chunk_idx}:{ref}"
                    all_refs.add(pref_ref)

                    extracted_table_objs[pref_ref] = {
                        "num_rows": int(t.get("num_rows", df.shape[0])),
                        "num_cols": int(t.get("num_cols", df.shape[1])),
                        "data": data_2d,
                        "prov": t.get("prov", []),
                        "page_range": [start_page + 1, end_page],
                    }

                if extract_text_enabled:
                    try:
                        texts_by_chunk[f"chunk{chunk_idx}"] = get_text.main(doc_dict)
                    except Exception as text_err:
                        texts_by_chunk[f"chunk{chunk_idx}"] = {"warning": f"text extraction skipped: {text_err}"}

                successful_chunks += 1
            except Exception as e:
                chunk_warnings.append(
                    f"chunk {chunk_idx} (pages {start_page+1}-{end_page}) failed: {e}"
                )
            finally:
                chunk_idx += 1

        if successful_chunks == 0:
            raise RuntimeError(
                "All PDF chunks failed during conversion. "
                "Try reducing DOCLING_PAGE_CHUNK_SIZE (e.g., 1-4 pages)."
            )

    tables_out = {
        "per keyword table refs": {k: sorted(list(v)) for k, v in per_keyword_refs.items()},
        "all table refs": sorted(list(all_refs)),
        "keywords missing tables": [
            k for k, v in per_keyword_refs.items() if not v
        ],
        "tables": extracted_table_objs,
    }

    if chunk_warnings:
        tables_out["warnings"] = chunk_warnings

    texts_out: Dict[str, Any] = {"enabled": extract_text_enabled, "chunks": texts_by_chunk}
    if chunk_warnings:
        texts_out["warnings"] = chunk_warnings

    meta = {
        "input_pdf": pdf_path,
        **(meta_extra or {}),
    }

    # normalized row
    row = normalize_to_one_row(
        extracted_tables=extracted_table_objs,
        meta=meta,
        company_number=(meta_extra or {}).get("company_number"),
        company_name=(meta_extra or {}).get("company_name"),
        year=int((meta_extra or {}).get("year", 2023)),
        standard=(meta_extra or {}).get("standard"),
        revenue_override_million=(meta_extra or {}).get("revenue_override_million"),
    )

    return {
        "meta": meta,
        "tables": tables_out,
        "texts": texts_out,
        "normalized_rows": [row],
    }
