# web_api/extractor.py
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple


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


def _find_value_in_table(
    table_2d: list[list[Any]],
    row_label_regex: str,
    year: int,
    prefer_actual: bool = True,
    label_cols: tuple[int, ...] = (0, 1),
    require_year_col: bool = True,
) -> Optional[float]:
    """
    Finds a column for {year} (prefer "actual"), then finds a row whose label matches row_label_regex.
    - label can appear in col0 or col1 (common in Docling tables)
    - if require_year_col=True and header doesn't contain the year, returns None (prevents wrong fallbacks)
    """
    if not table_2d or not table_2d[0]:
        return None

    header_raw = [str(c).strip() for c in table_2d[0]]
    header = [h.lower() for h in header_raw]
    year_s = str(year)

    # choose column index only if year exists in header
    candidates: list[int] = [i for i, h in enumerate(header) if year_s in h]
    if not candidates:
        if require_year_col:
            return None
        # if you REALLY want fallback behavior, set require_year_col=False
        col_idx = len(header) - 1
    else:
        col_idx: Optional[int] = None
        if prefer_actual:
            for i in candidates:
                if "actual" in header[i]:
                    col_idx = i
                    break
        if col_idx is None:
            col_idx = candidates[0]

    pat = re.compile(row_label_regex, re.IGNORECASE)

    for r in table_2d[1:]:
        if not r:
            continue

        # find label match in allowed label columns
        matched = False
        for lc in label_cols:
            if lc < len(r):
                label = str(r[lc]).strip()
                if label and pat.search(label):
                    matched = True
                    break

        if not matched:
            continue

        if col_idx >= len(r):
            return None
        return _parse_number(r[col_idx])

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
        # ✅ skip tables without year columns to avoid wrong matches (like "200,000 work hours")
        header_join = " ".join([str(x) for x in (t2d[0] if t2d else [])]).lower()
        if str(year) not in header_join:
            continue

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
    def _convert(ref_label: str, raw_val: Optional[float], target_unit: str) -> Optional[float]:
        if raw_val is None:
            return None
        m = _unit_multiplier_for_label(ref_label, target_unit)
        return raw_val * m

    # We need original labels for unit inference; easiest: hardcode based on your PDF
    scope1_tonnes = scope1_million * 1_000_000.0 if scope1_million is not None else None
    scope2_loc_tonnes = scope2_loc_million * 1_000_000.0 if scope2_loc_million is not None else None
    scope2_mkt_tonnes = scope2_mkt_million * 1_000_000.0 if scope2_mkt_million is not None else None
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

        "Methane Emissions (Metric tonnes CH4)": methane,
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

    DocumentConverter = _import_docling_converter()
    converter = DocumentConverter()

    result = converter.convert(pdf_path)
    doc = getattr(result, "document", None)
    if doc is None:
        raise RuntimeError("Docling convert() did not return a document.")

    # export doc dict
    if hasattr(doc, "export_to_dict"):
        doc_dict = doc.export_to_dict()
    elif hasattr(doc, "to_dict"):
        doc_dict = doc.to_dict()
    else:
        raise RuntimeError("Docling document has no export_to_dict()/to_dict().")

    # import utils functions
    import get_tables  # from utils dir (sys.path injected)

    tables_out: Dict[str, Any] = get_tables.main(doc_dict)

    # build ref->table map from doc_dict
    table_list = doc_dict.get("tables", []) or []
    table_by_ref = {t.get("self_ref"): t for t in table_list if isinstance(t, dict)}

    extracted_table_objs: Dict[str, Dict[str, Any]] = {}
    for ref in tables_out.get("all table refs", []):
        t = table_by_ref.get(ref)
        if not t:
            continue
        df = get_tables.extract_table_to_df(t)
        data_2d = df.fillna("").astype(str).values.tolist()

        extracted_table_objs[ref] = {
            "num_rows": int(t.get("num_rows", df.shape[0])),
            "num_cols": int(t.get("num_cols", df.shape[1])),
            "data": data_2d,
            "prov": t.get("prov", []),
        }

    # attach extracted tables
    tables_out["tables"] = extracted_table_objs

    # texts are optional (avoid hard dependency on spacy/sentence-transformers)
    texts_out: Dict[str, Any] = {}
    try:
        import get_text  # from utils dir
        texts_out = get_text.main(doc_dict)
    except Exception as e:
        texts_out = {"warning": f"text extraction skipped: {e}"}

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