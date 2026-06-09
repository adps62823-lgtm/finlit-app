from __future__ import annotations

import csv
import io
import json
import re
import urllib.error
import urllib.request
import zipfile
from datetime import date, datetime
from typing import Optional
from xml.etree import ElementTree as ET

from app.config import get_settings

HEADER_ALIASES = {
    "sno": "serialNumber",
    "srno": "serialNumber",
    "sno.": "serialNumber",
    "s no": "serialNumber",
    "sno_": "serialNumber",
    "clientname": "primaryHolderName",
    "name": "primaryHolderName",
    "investorname": "primaryHolderName",
    "holdername": "primaryHolderName",
    "primaryholdername": "primaryHolderName",
    "pan": "pan",
    "pancard": "pan",
    "email": "email",
    "e-mail": "email",
    "mobile": "mobile",
    "mobileno": "mobile",
    "phone": "mobile",
    "city": "city",
    "location": "city",
    "address": "city",
    "family": "familyName",
    "familyname": "familyName",
    "familygroup": "familyName",
    "relationshipstatus": "relationshipStatus",
    "status": "relationshipStatus",
    "notes": "notes",
    "remark": "notes",
    "remarks": "notes",
    "nextaction": "nextAction",
    "nextfollowup": "nextAction",
    "nextreviewdate": "nextReviewDate",
    "reviewdate": "nextReviewDate",
    "clientcode": "clientCode",
    "code": "clientCode",
    "assignedrmemail": "assignedRmEmail",
    "rmemail": "assignedRmEmail",
}

CANONICAL_FIELDS = [
    "clientCode",
    "primaryHolderName",
    "pan",
    "email",
    "mobile",
    "city",
    "familyName",
    "relationshipStatus",
    "notes",
    "nextAction",
    "nextReviewDate",
    "assignedRmEmail",
]


def _compact_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").strip().lower())


def _normalize_text(value) -> str:
    return " ".join(str(value or "").strip().split())


def _parse_date_like(value) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    text = str(value).strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d-%b-%Y", "%d %b %Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        data = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []

    root = ET.fromstring(data)
    namespace = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    strings = []
    for si in root.findall(f"{namespace}si"):
        parts = []
        for node in si.iter():
            if node.tag == f"{namespace}t" and node.text:
                parts.append(node.text)
        strings.append("".join(parts))
    return strings


def _excel_col_to_index(col: str) -> int:
    result = 0
    for char in col:
        if not char.isalpha():
            continue
        result = result * 26 + (ord(char.upper()) - 64)
    return result - 1


def _read_first_sheet_path(zf: zipfile.ZipFile) -> str:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    ns = {
        "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "pkg": "http://schemas.openxmlformats.org/package/2006/relationships",
    }

    first_sheet = workbook.find("main:sheets/main:sheet", ns)
    if first_sheet is None:
        raise ValueError("Workbook does not contain any sheets")
    rel_id = first_sheet.attrib.get(f"{{{ns['rel']}}}id")
    for rel in rels.findall("pkg:Relationship", ns):
        if rel.attrib.get("Id") == rel_id:
            target = rel.attrib.get("Target", "")
            if target.startswith("/"):
                target = target[1:]
            if not target.startswith("xl/"):
                target = f"xl/{target}"
            return target
    raise ValueError("Unable to resolve first worksheet")


def _parse_excel_rows(raw_bytes: bytes) -> list[dict]:
    with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
        shared_strings = _read_shared_strings(zf)
        sheet_path = _read_first_sheet_path(zf)
        root = ET.fromstring(zf.read(sheet_path))

    namespace = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    rows = []
    for row in root.findall(f".//{namespace}sheetData/{namespace}row"):
        cells = {}
        max_index = -1
        for cell in row.findall(f"{namespace}c"):
            ref = cell.attrib.get("r", "")
            match = re.match(r"([A-Z]+)(\d+)", ref)
            if not match:
                continue
            index = _excel_col_to_index(match.group(1))
            max_index = max(max_index, index)
            cell_type = cell.attrib.get("t")
            value_node = cell.find(f"{namespace}v")
            value = value_node.text if value_node is not None and value_node.text is not None else ""
            if cell_type == "s":
                try:
                    value = shared_strings[int(value)]
                except (ValueError, IndexError):
                    value = ""
            elif cell_type == "inlineStr":
                text_node = cell.find(f".//{namespace}t")
                value = text_node.text if text_node is not None and text_node.text else ""
            cells[index] = value

        if max_index < 0:
            continue
        values = [cells.get(index, "") for index in range(max_index + 1)]
        rows.append(values)

    if not rows:
        return []

    headers = [str(value or "").strip() for value in rows[0]]
    out = []
    for row in rows[1:]:
        record = {}
        for index, header in enumerate(headers):
            if not header:
                continue
            record[header] = row[index] if index < len(row) else ""
        if any(str(value).strip() for value in record.values()):
            out.append(record)
    return out


def _parse_delimited_text(raw_text: str) -> list[dict]:
    text = raw_text.strip()
    if not text:
        return []
    sample = "\n".join(text.splitlines()[:5])
    delimiters = [",", ";", "\t", "|"]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=delimiters)
        reader = csv.DictReader(io.StringIO(text), dialect=dialect)
        return [dict(row) for row in reader if any(str(value).strip() for value in row.values())]
    except csv.Error:
        pass

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return []

    def split_row(line: str) -> list[str]:
        if "|" in line:
            return [value.strip() for value in line.split("|")]
        if ";" in line:
            return [value.strip() for value in line.split(";")]
        if "\t" in line:
            return [value.strip() for value in line.split("\t")]
        return [value.strip() for value in line.split(",")]

    headers = split_row(lines[0])
    if len(lines) == 1:
        return [{"name": lines[0]}]

    records = []
    for raw_line in lines[1:]:
        values = split_row(raw_line)
        record = {}
        for index, header in enumerate(headers):
            if not header:
                continue
            record[header] = values[index] if index < len(values) else ""
        if any(str(value).strip() for value in record.values()):
            records.append(record)
    return records


def parse_bulk_client_source(*, filename: str = "", content_type: str = "", raw_bytes: bytes | None = None, text: str = "") -> list[dict]:
    lower_name = filename.lower()
    if lower_name.endswith(".xls"):
        raise ValueError("Legacy .xls files are not supported yet. Please save the file as .xlsx or CSV.")

    if raw_bytes and lower_name.endswith((".xlsx", ".xlsm")):
        return _parse_excel_rows(raw_bytes)

    if raw_bytes and content_type in {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel.sheet.macroEnabled.12",
    }:
        return _parse_excel_rows(raw_bytes)

    if raw_bytes and content_type == "application/vnd.ms-excel":
        raise ValueError("Legacy .xls files are not supported yet. Please save the file as .xlsx or CSV.")

    if raw_bytes and lower_name.endswith(".csv"):
        try:
            decoded = raw_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            decoded = raw_bytes.decode("latin-1")
        return _parse_delimited_text(decoded)

    if text.strip():
        return _parse_delimited_text(text)

    if raw_bytes:
        try:
            decoded = raw_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            decoded = raw_bytes.decode("latin-1")
        return _parse_delimited_text(decoded)

    return []


def normalize_import_row(row: dict) -> dict:
    normalized: dict[str, str] = {}
    for raw_key, raw_value in (row or {}).items():
        canonical = HEADER_ALIASES.get(_compact_key(str(raw_key)), "")
        value = _normalize_text(raw_value)
        if not canonical:
            continue
        if canonical == "nextReviewDate":
            parsed = _parse_date_like(value)
            normalized[canonical] = parsed.isoformat() if parsed else ""
        else:
            normalized[canonical] = value

    if "primaryHolderName" not in normalized:
        for candidate_key in ("primaryHolderName", "name", "clientName", "investorName", "holderName"):
            value = _normalize_text(row.get(candidate_key) or row.get(candidate_key.lower()) or "")
            if value:
                normalized["primaryHolderName"] = value
                break

    if "clientCode" not in normalized:
        for candidate_key in ("clientCode", "code", "serialNumber", "sno", "srno"):
            value = _normalize_text(row.get(candidate_key) or row.get(candidate_key.lower()) or "")
            if value:
                normalized["clientCode"] = value
                break

    if "pan" in normalized:
        normalized["pan"] = normalized["pan"].upper()
    if "relationshipStatus" not in normalized or not normalized["relationshipStatus"]:
        normalized["relationshipStatus"] = "active"

    out = {field: normalized.get(field, "") for field in CANONICAL_FIELDS}
    out["primaryHolderName"] = _normalize_text(out["primaryHolderName"])
    out["pan"] = out["pan"].upper().strip()
    out["email"] = out["email"].lower().strip()
    out["mobile"] = out["mobile"].strip()
    out["city"] = out["city"].strip()
    out["familyName"] = out["familyName"].strip()
    out["relationshipStatus"] = out["relationshipStatus"].strip() or "active"
    out["notes"] = out["notes"].strip()
    out["nextAction"] = out["nextAction"].strip()
    out["assignedRmEmail"] = out["assignedRmEmail"].lower().strip()
    if out["nextReviewDate"]:
        parsed = _parse_date_like(out["nextReviewDate"])
        out["nextReviewDate"] = parsed.isoformat() if parsed else ""
    return out


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?", "", stripped.strip(), flags=re.IGNORECASE)
        stripped = re.sub(r"```$", "", stripped.strip())
    return stripped.strip()


def _extract_json_payload(response_text: str) -> dict:
    cleaned = _strip_code_fences(response_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def enrich_import_rows_with_gemini(rows: list[dict]) -> tuple[list[dict], bool, str]:
    settings = get_settings()
    if not settings.gemini_api_key or not rows:
        return rows, False, ""

    chunks = [rows[index : index + 25] for index in range(0, len(rows), 25)]
    enriched: list[dict] = []
    used_ai = False
    last_error = ""

    for chunk in chunks:
        prompt = {
            "instructions": [
                "You are mapping messy client import rows into a mutual fund CRM schema.",
                "Return JSON only.",
                "Keep one object per source row in the same order.",
                "Each object must include: clientCode, primaryHolderName, pan, email, mobile, city, familyName, relationshipStatus, notes, nextAction, nextReviewDate, assignedRmEmail.",
                "Use empty strings when a value is not present.",
                "Do not invent values that are not supported by the row.",
                "primaryHolderName is mandatory; if missing, keep it blank so the importer can skip that row.",
                "Normalize PAN to uppercase.",
                "Normalize nextReviewDate to YYYY-MM-DD when present.",
            ],
            "rows": chunk,
        }
        body = {
            "contents": [{"role": "user", "parts": [{"text": json.dumps(prompt, ensure_ascii=False)}]}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            },
        }

        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                payload = json.loads(response.read().decode("utf-8"))
            candidate = payload.get("candidates", [{}])[0]
            parts = candidate.get("content", {}).get("parts", [])
            text = "".join(part.get("text", "") for part in parts if isinstance(part, dict))
            data = _extract_json_payload(text)
            ai_rows = data.get("clients") if isinstance(data, dict) else data
            if isinstance(ai_rows, list):
                enriched.extend([normalize_import_row(row) for row in ai_rows])
                used_ai = True
            else:
                enriched.extend([normalize_import_row(row) for row in chunk])
                last_error = "Gemini returned an unexpected payload"
        except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError, KeyError) as exc:
            last_error = str(exc)
            enriched.extend([normalize_import_row(row) for row in chunk])

    return enriched, used_ai, last_error
