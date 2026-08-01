# Analyze handler: parse source, classify parts, store inventory + warnings.
import json
import tempfile
from pathlib import Path

from music21 import converter

import config
import db
import storage
from classify import inventory_parts
from validate import validate_score


def _load_score(conn, job, settings):
    with conn.cursor() as cur:
        cur.execute("SELECT source_path, source_type FROM gw_parttrack_scores WHERE id = %s",
                    (job["score_id"],))
        source_path, source_type = cur.fetchone()
    ext = {"musicxml": ".musicxml", "mxl": ".mxl", "midi": ".mid"}[source_type]
    tmp = Path(tempfile.mkdtemp()) / f"source{ext}"
    storage.download(settings, "parttrack", source_path, tmp)
    return converter.parse(str(tmp))


def run_analyze(conn, job):
    settings = config.load()
    db.set_score_status(conn, job["score_id"], "analyzing")
    score = _load_score(conn, job, settings)
    cands = inventory_parts(score)
    warnings = validate_score(score)
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
