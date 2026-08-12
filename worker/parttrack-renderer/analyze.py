# Analyze handler: parse source, classify parts, store inventory + warnings.
import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from music21 import converter, key as m21key, meter as m21meter, tempo as m21tempo

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


# ---- Musical-facts extraction (assistant get_score_analysis bridge). ----
# Spec: docs/superpowers/specs/2026-08-11-assistant-score-analysis-design.md

def _candidate_notes(score, cand):
    """Mirror classify._voice_split_candidates' note selection so ranges
    line up 1:1 with the inventoried parts."""
    part = score.parts[cand.source_part_index]
    if cand.source_voice is None:
        return list(part.recurse().notes)
    voice_ids = []
    for m in part.getElementsByClass("Measure"):
        for v in m.voices:
            if v.id not in voice_ids:
                voice_ids.append(v.id)
    ordered = sorted(voice_ids, key=str)
    if cand.source_voice > len(ordered):
        return []
    vid = ordered[cand.source_voice - 1]
    return [n for m in part.getElementsByClass("Measure")
            for v in m.voices if str(v.id) == str(vid)
            for n in v.notes]


def _pitch_range(notes):
    pitches = [p for n in notes for p in getattr(n, "pitches", [])]
    if not pitches:
        return None
    lo = min(pitches, key=lambda p: p.midi)
    hi = max(pitches, key=lambda p: p.midi)
    # music21 spells flats as "B-4"; humans read "Bb4".
    return {"low": lo.nameWithOctave.replace("-", "b"),
            "high": hi.nameWithOctave.replace("-", "b")}


def _key_facts(score):
    try:
        k = score.analyze("key")
        initial = f"{k.tonic.name.replace('-', 'b')} {k.mode}"
    except Exception:
        initial = None
    sigs = []
    parts = list(score.parts)
    src = parts[0] if parts else score
    for ks in src.recurse().getElementsByClass(m21key.KeySignature):
        if not sigs or sigs[-1] != ks.sharps:
            sigs.append(ks.sharps)
    return {"initial": initial, "changes": max(0, len(sigs) - 1)}


def _time_signatures(score):
    out = []
    parts = list(score.parts)
    src = parts[0] if parts else score
    for ts in src.recurse().getElementsByClass(m21meter.TimeSignature):
        if not out or out[-1] != ts.ratioString:
            out.append(ts.ratioString)
    return out


def _tempo_bpm(score):
    for mm in score.recurse().getElementsByClass(m21tempo.MetronomeMark):
        bpm = mm.getQuarterBPM()
        if bpm:
            return round(bpm)
    return None


def extract_analysis(score, cands):
    """Versioned musical-facts blob for gw_parttrack_scores.analysis (v1)."""
    return {
        "v": 1,
        "computed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "key": _key_facts(score),
        "time_signatures": _time_signatures(score),
        "tempo_bpm": _tempo_bpm(score),
        "measures": max((len(p.getElementsByClass("Measure")) for p in score.parts),
                        default=0),
        "parts": [
            {"source_part_index": c.source_part_index,
             "source_staff": c.source_staff,
             "source_voice": c.source_voice,
             "role": c.role,
             "label": c.label,
             "range": _pitch_range(_candidate_notes(score, c))}
            for c in cands
        ],
    }
