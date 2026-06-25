"""
routers/assessments.py
Assessment CRUD, submission workflow, and approval chain.
All monetary inputs/outputs are pre-computed by ValuationEngine.js
on the frontend — this API persists, validates transitions, and logs.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_admin
from app.core.auth import current_user

router = APIRouter()

# ── MODELS ────────────────────────────────────────────────────────

class _Header(BaseModel):
    """Shared document header fields — mixin for Create and Update."""
    client_id:      Optional[str] = None
    shipment_id:    Optional[str] = None
    entry_id:       Optional[str] = None
    entry_no:       Optional[str] = None
    bl_number:      Optional[str] = None
    invoice_no:     Optional[str] = None
    container_no:   Optional[str] = None
    incoterms:      Optional[str] = "CIF"
    commodity:      Optional[str] = None
    ahtn_code:      Optional[str] = None
    origin_country: Optional[str] = None
    port_of_entry:  Optional[str] = "Manila"
    importer:       Optional[str] = None
    consignee:      Optional[str] = None
    declarant_name: Optional[str] = None
    broker_tin:     Optional[str] = None
    prc_license_no: Optional[str] = None
    company_name:   Optional[str] = None
    company_sub:    Optional[str] = None

class AssessmentCreate(_Header):
    inputs:         dict
    outputs:        dict
    is_de_minimis:  bool           = False
    engine_version: str            = "1.0.0"
    warnings:       Optional[list] = None

class AssessmentUpdate(_Header):
    inputs:        Optional[dict] = None
    outputs:       Optional[dict] = None
    is_de_minimis: Optional[bool] = None
    warnings:      Optional[list] = None
    revision_note: Optional[str]  = None

class WorkflowBody(BaseModel):
    action: str            # check | reject | approve | cancel
    notes: Optional[str] = None

# ── HELPERS ───────────────────────────────────────────────────────

def _mirrors(inputs: dict, outputs: dict) -> dict:
    """
    Map ValuationEngine JSONB payloads to indexed numeric mirror columns.
    These columns exist purely for query performance — outputs JSONB
    remains the authoritative source of truth.
    """
    return {
        "dv_pesos":       outputs.get("dvPesos"),
        "cif_php":        outputs.get("cifPhpRaw"),
        "customs_duty":   outputs.get("duty"),
        "excise_tax_php": outputs.get("exciseTax"),
        "vat_php":        outputs.get("vat"),
        "total_payable":  outputs.get("grandTotal"),
        "exchange_rate":  inputs.get("exchangeRate"),
        "tariff_rate":    inputs.get("tariffRate"),
    }

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

def _log(sb, *, aid: str, action: str, from_status,
         to_status: str, version: int, acn: str,
         actor: str, notes: Optional[str] = None) -> None:
    """Append one row to the immutable workflow log."""
    sb.table("assessment_workflow_log").insert({
        "assessment_id": aid,
        "action":        action,
        "from_status":   from_status,
        "to_status":     to_status,
        "version_at":    version,
        "acn_snapshot":  acn,
        "actor_id":      actor,
        "notes":         notes,
        "acted_at":      _now(),
    }).execute()

def _get_or_404(sb, id: str) -> dict:
    r = sb.table("assessments").select("*").eq("id", id).is_("deleted_at", "null").execute()
    if not r.data:
        raise HTTPException(404, f"Assessment '{id}' not found or has been deleted.")
    return r.data[0]

def _assert_status(rec: dict, expected: str, operation: str) -> None:
    if rec["status"] != expected:
        raise HTTPException(409,
            f"'{operation}' requires status='{expected}', "
            f"but current status is '{rec['status']}'.")

# State machine: action → (required_from_status | None, to_status, log_action)
# None as required_from means the check is skipped (admin cancel from any state).
_TRANSITIONS: dict[str, tuple] = {
    "check":   ("submitted",    "under_review", "checked"),
    "reject":  ("under_review", "draft",        "rejected"),
    "approve": ("under_review", "approved",     "approved"),
    "cancel":  (None,           "cancelled",    "cancelled"),
}

# ── GET: LIST ─────────────────────────────────────────────────────

@router.get("")
@router.get("/")
def list_assessments(
    status:  Optional[str] = Query(None, description="Filter by workflow status"),
    limit:   int            = Query(50, le=200),
    offset:  int            = Query(0),
    uid: str = Depends(current_user),
):
    """
    List active assessments via the assessment_summary view.
    The view resolves UUID references to human-readable names and
    computes revision_count without requiring a client-side join.
    """
    sb  = get_admin()
    q   = sb.table("assessment_summary").select("*")
    if status:
        q = q.eq("status", status)
    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"data": res.data, "count": len(res.data), "offset": offset}

# ── GET: DETAIL ───────────────────────────────────────────────────

@router.get("/{id}")
def get_assessment(id: str, uid: str = Depends(current_user)):
    """
    Full assessment record with revision history and workflow audit trail.
    Snapshot columns in revisions are excluded from the list query for
    performance — consumer fetches full snapshot only when needed.
    """
    sb   = get_admin()
    rec  = _get_or_404(sb, id)
    revs = sb.table("assessment_revisions") \
             .select("id,version,status,changed_fields,revision_note,revised_by,revised_at") \
             .eq("assessment_id", id) \
             .order("revised_at", desc=True) \
             .execute()
    logs = sb.table("assessment_workflow_log") \
             .select("*") \
             .eq("assessment_id", id) \
             .order("acted_at", desc=True) \
             .execute()
    return {**rec, "revisions": revs.data, "workflow_log": logs.data}

# ── POST: CREATE DRAFT ────────────────────────────────────────────

@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_assessment(body: AssessmentCreate, uid: str = Depends(current_user)):
    """
    Persist a new assessment as status='draft'.
    Expects fully computed inputs and outputs from ValuationEngine.js.
    Numeric mirror columns are extracted from the outputs payload and
    written simultaneously — both JSONB truth and indexed mirrors
    are always in sync at creation.
    Appends a 'created' action to the workflow log.
    """
    sb  = get_admin()
    now = _now()
    row = {
        **body.model_dump(),
        **_mirrors(body.inputs, body.outputs),
        "status":      "draft",
        "created_by":  uid,
        "prepared_by": uid,
        "prepared_at": now,
        "created_at":  now,
        "updated_at":  now,
    }
    # revision_note is an API-only field — not a DB column
    row.pop("revision_note", None)

    res = sb.table("assessments").insert(row).execute()
    if not res.data:
        raise HTTPException(500, "Failed to create assessment — no data returned.")

    rec = res.data[0]
    _log(sb, aid=rec["id"], action="created", from_status=None,
         to_status="draft", version=rec["version"],
         acn=rec["acn"], actor=uid)
    return rec

# ── PUT: UPDATE DRAFT ─────────────────────────────────────────────

@router.put("/{id}")
def update_assessment(id: str, body: AssessmentUpdate, uid: str = Depends(current_user)):
    """
    Update an assessment that is in 'draft' or 'rejected' status.
    Rejected assessments return to draft state for correction, so
    both statuses are treated as editable.
    The DB trigger (capture_assessment_revision — SECURITY DEFINER)
    automatically snapshots the pre-update row into assessment_revisions
    before the UPDATE lands — no manual revision logic required here.
    Appends a 'revision_saved' action to the workflow log.
    """
    sb  = get_admin()
    cur = _get_or_404(sb, id)

    if cur["status"] not in ("draft", "rejected"):
        raise HTTPException(409,
            f"Cannot edit — status is '{cur['status']}'. "
            f"Only 'draft' and 'rejected' assessments are editable.")

    note = body.revision_note
    upd  = body.model_dump(exclude_none=True, exclude={"revision_note"})

    # Rebuild numeric mirrors if either inputs or outputs changed
    if body.inputs is not None or body.outputs is not None:
        inp = body.inputs  or cur.get("inputs",  {})
        out = body.outputs or cur.get("outputs", {})
        upd.update(_mirrors(inp, out))

    upd["updated_at"] = _now()

    res = sb.table("assessments").update(upd).eq("id", id).execute()
    if not res.data:
        raise HTTPException(500, "Update failed — no data returned.")

    _log(sb, aid=id, action="revision_saved",
         from_status=cur["status"], to_status=cur["status"],
         version=cur["version"], acn=cur["acn"],
         actor=uid, notes=note)
    return res.data[0]

# ── POST: SUBMIT FOR REVIEW ───────────────────────────────────────

@router.post("/{id}/submit")
def submit_assessment(id: str, uid: str = Depends(current_user)):
    """
    Advance status from 'draft' → 'submitted'.
    Locks the document from further encoder edits (RLS blocks subsequent
    encoder UPDATEs once status leaves 'draft').
    Sets submitted_at timestamp.
    Appends a 'submitted' action to the workflow log.
    """
    sb  = get_admin()
    cur = _get_or_404(sb, id)
    _assert_status(cur, "draft", "submit")

    now = _now()
    res = sb.table("assessments").update({
        "status":       "submitted",
        "submitted_at": now,
        "updated_at":   now,
    }).eq("id", id).execute()

    if not res.data:
        raise HTTPException(500, "Submit failed — no data returned.")

    _log(sb, aid=id, action="submitted", from_status="draft",
         to_status="submitted", version=cur["version"],
         acn=cur["acn"], actor=uid)
    return res.data[0]

# ── POST: WORKFLOW ACTION (check / reject / approve / cancel) ─────

@router.post("/{id}/workflow")
def workflow_action(id: str, body: WorkflowBody, uid: str = Depends(current_user)):
    """
    Enforce document lifecycle transitions via the state machine.

    Transitions:
      check   : submitted    → under_review  | sets checked_by / checked_at
      reject  : under_review → draft         | requires notes; sets rejected_by / rejection_notes
      approve : under_review → approved      | sets approved_by; increments version
      cancel  : any          → cancelled     | sets cancelled_at; admin use only

    Each action appends exactly one row to assessment_workflow_log.
    The DB trigger captures a revision snapshot automatically.

    version increment on approve:
      Signals the document reached a terminal-positive state.
      Downstream consumers can use version > 1 as "has been approved before".
    """
    sb  = get_admin()
    cur = _get_or_404(sb, id)

    if body.action not in _TRANSITIONS:
        raise HTTPException(400,
            f"Unknown action '{body.action}'. "
            f"Valid actions: {sorted(_TRANSITIONS.keys())}")

    req_from, to_status, log_action = _TRANSITIONS[body.action]

    # Validate current status against required precondition
    if req_from is not None and cur["status"] != req_from:
        raise HTTPException(409,
            f"Action '{body.action}' requires status='{req_from}', "
            f"but current status is '{cur['status']}'.")

    # Rejection requires an explanation — enforced before any DB write
    if body.action == "reject" and not body.notes:
        raise HTTPException(422,
            "notes are required when rejecting. "
            "Provide the reason so the encoder can correct and resubmit.")

    now = _now()
    upd: dict = {"status": to_status, "updated_at": now}

    if body.action == "check":
        upd["checked_by"] = uid
        upd["checked_at"] = now

    elif body.action == "reject":
        upd["rejected_by"]     = uid
        upd["rejected_at"]     = now
        upd["rejection_notes"] = body.notes
        # status → 'draft' (back to encoder for correction)
        # workflow log records the 'rejected' action transparently

    elif body.action == "approve":
        upd["approved_by"] = uid
        upd["approved_at"] = now
        # Increment version: signals this revision received formal approval.
        # The pre-approve snapshot is already captured by the DB trigger.
        upd["version"] = cur["version"] + 1

    elif body.action == "cancel":
        upd["cancelled_at"] = now

    res = sb.table("assessments").update(upd).eq("id", id).execute()
    if not res.data:
        raise HTTPException(500, f"Workflow action '{body.action}' failed — no data returned.")

    _log(sb, aid=id, action=log_action,
         from_status=cur["status"], to_status=to_status,
         version=cur["version"], acn=cur["acn"],
         actor=uid, notes=body.notes)
    return res.data[0]

# ── DELETE: SOFT DELETE ───────────────────────────────────────────

@router.delete("/{id}", status_code=204)
def soft_delete_assessment(id: str, uid: str = Depends(current_user)):
    """
    Soft-delete by setting deleted_at = NOW().
    Record is excluded from all SELECT policies (deleted_at IS NULL filter).
    Hard DELETE is intentionally not exposed — admin must use SQL directly.
    """
    sb  = get_admin()
    cur = _get_or_404(sb, id)
    sb.table("assessments").update({
        "deleted_at": _now(),
        "updated_at": _now(),
    }).eq("id", id).execute()
    _log(sb, aid=id, action="cancelled",
         from_status=cur["status"], to_status="cancelled",
         version=cur["version"], acn=cur["acn"], actor=uid,
         notes="soft-deleted")
    return None
