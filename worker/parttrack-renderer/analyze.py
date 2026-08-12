# Analyze handler: parse source, classify parts, store inventory + warnings.
import json
import tempfile
from pathlib import Path

from music21 import converter

import config
import db
import storage
from classify import inventory_parts
from sanitize import sanitize_mxl
from validate import validate_score


def _load_score(conn, job, settings):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT source_path, source_type, normalized_mxl_path, tenant_id
            FROM gw_parttrack_scores WHERE id = %s
        """, (job["score_id"],))
        source_path, source_type, normalized_mxl_path, tenant_id = cur.fetchone()
    workdir = Path(tempfile.mkdtemp())

    # OMR (and any future normalization) runs once; later loads parse the mxl.
    if normalized_mxl_path:
        tmp = workdir / "normalized.mxl"
        storage.download(settings, "parttrack", normalized_mxl_path, tmp)
        return converter.parse(str(tmp)), []

    if source_type == "pdf_omr":
        from omr import pdf_to_mxl
        pdf = workdir / "source.pdf"
        storage.download(settings, "parttrack", source_path, pdf)
        mxl = pdf_to_mxl(pdf, workdir / "omr", settings.audiveris_cmd)
        fixes = sanitize_mxl(mxl)
        # Re-serialize through music21: raw Audiveris MusicXML (even after
        # structural sanitizing) still crashes Sibelius' importer, while
        # music21's writer emits conventional structures that open cleanly.
        # Inventory later parses the same uploaded bytes, keeping part
        # indices stable, so the rewrite must happen before analysis.
        try:
            rewritten = workdir / "normalized.mxl"
            converter.parse(str(mxl)).write("mxl", fp=str(rewritten))
            converter.parse(str(rewritten))  # refuse an unreadable rewrite
            mxl = rewritten
            fixes.append("rewritten_by_music21")
        except Exception:
            pass  # fall back to the sanitized Audiveris file
        normalized = f"{tenant_id}/{job['score_id']}/normalized.mxl"
        storage.upload(settings, "parttrack", normalized, mxl, "application/vnd.recordare.musicxml")
        with conn.cursor() as cur:
            cur.execute("UPDATE gw_parttrack_scores SET normalized_mxl_path = %s WHERE id = %s",
                        (normalized, job["score_id"]))
        conn.commit()
        return converter.parse(str(mxl)), fixes

    ext = {"musicxml": ".musicxml", "mxl": ".mxl", "midi": ".mid"}[source_type]
    tmp = workdir / f"source{ext}"
    storage.download(settings, "parttrack", source_path, tmp)
    return converter.parse(str(tmp)), []


def run_analyze(conn, job):
    settings = config.load()
    db.set_score_status(conn, job["score_id"], "analyzing")
    with conn.cursor() as cur:
        cur.execute("SELECT source_type FROM gw_parttrack_scores WHERE id = %s", (job["score_id"],))
        (source_type,) = cur.fetchone()
    score, sanitize_fixes = _load_score(conn, job, settings)
    cands = inventory_parts(score)
    warnings = validate_score(score)
    if "injected_time_signature" in sanitize_fixes:
        warnings.append({
            "code": "time_signature_inferred", "severity": "warning",
            "message": "The scan had no readable time signature, so one was inferred "
                       "from the measure lengths. Check the meter before generating.",
        })
    if source_type == "pdf_omr":
        warnings.append({
            "code": "omr_beta", "severity": "warning",
            "message": "This score was read from a PDF by optical music recognition (beta). "
                       "Check parts, notes, and rhythms before generating.",
        })
    with conn.cursor() as cur:
        cur.execute("DELETE FROM gw_parttrack_parts WHERE score_id = %s", (job["score_id"],))
        for c in cands:
            cur.execute("""
                INSERT INTO gw_parttrack_parts
                  (tenant_id, score_id, source_part_index, source_staff, source_voice,
                   role, label, confidence)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (job["tenant_id"], job["score_id"], c.source_part_index, c.source_staff,
                  c.source_voice, c.role, c.label, c.confidence))
        cur.execute("""
            UPDATE gw_parttrack_scores
            SET validation_report = %s, status = 'awaiting_confirmation', error_message = NULL
            WHERE id = %s
        """, (json.dumps(warnings), job["score_id"]))
    conn.commit()
