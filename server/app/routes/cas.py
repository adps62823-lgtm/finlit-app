"""
CAS Import Routes
-----------------
POST /api/cas/import   — upload a CAS PDF + PAN password, import holdings
GET  /api/cas/history  — list recent CAS import batches (owner only)
"""

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.auth import get_current_user, require_owner
from app.cas_import import process_cas_pdf
from app.database import get_import_batches_collection
from app.utils import _serialize_value

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cas", tags=["cas"])


def _serialize_batch(doc: dict) -> dict:
    if not doc:
        return {}
    return {k: _serialize_value(v) for k, v in doc.items()}


@router.post("/import")
async def import_cas(
    file: UploadFile = File(...),
    password: str = Form(...),
    user: dict = Depends(get_current_user),
):
    """
    Upload a CAS PDF and import holdings into Finlit.

    - file     : The CAS PDF file (from CAMS or KFintech)
    - password : The investor's PAN in uppercase (e.g. ABCDE1234F)
                 This is the standard password for all CAMS/KFintech CAS PDFs.

    The import will:
      1. Parse the PDF using casparser
      2. Match the investor to an existing client by PAN or name
      3. Upsert folios, holdings, transactions into MongoDB
      4. Revalue holdings using the latest stored AMFI NAV
      5. Refresh the client's summary fields (meetingCount, AUM etc.)

    Returns a summary of what was imported.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted. Please upload the CAS PDF from CAMS or KFintech.",
        )

    if not password or len(password.strip()) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required. For CAMS/KFintech CAS PDFs the password is the investor's PAN (e.g. ABCDE1234F).",
        )

    pdf_bytes = await file.read()
    if len(pdf_bytes) < 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file appears to be empty or too small to be a valid CAS PDF.",
        )

    try:
        result = process_cas_pdf(
            pdf_bytes=pdf_bytes,
            password=password.strip().upper(),
            assigned_user=user,
        )
    except ValueError as exc:
        # casparser could not read the file — wrong password or not a CAS PDF
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("CAS import failed for user %s: %s", user.get("email"), exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(exc)}",
        )

    return {
        "success": True,
        "message": (
            f"Imported {result['holdingsUpserted']} holdings and "
            f"{result['transactionsInserted']} transactions for {result['investor']}."
            + (" Client linked." if result["clientLinked"] else " No matching client found — link manually.")
        ),
        "summary": result,
    }


@router.get("/history")
def cas_import_history(
    limit: int = 20,
    user: dict = Depends(require_owner),
):
    """
    List recent CAS import batches.
    Owner-only — shows all imports across all staff.
    """
    batches = list(
        get_import_batches_collection()
        .find({"source": "cas_import"})
        .sort("startedAt", -1)
        .limit(limit)
    )
    return [_serialize_batch(b) for b in batches]