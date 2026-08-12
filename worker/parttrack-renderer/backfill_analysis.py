#!/usr/bin/env python3
"""One-off backfill: fill gw_parttrack_scores.analysis for successfully
analyzed rows (awaiting_confirmation/rendering/ready) processed before the
column existed.

Touches ONLY the analysis column — parts, status, and confirmations are
never modified (re-running a full analyze would reset confirmed scores).

Run on the droplet under the worker env (needs music21 + storage creds):
    sudo -u parttrack env $(cat /etc/gleeworld-parttrack-worker.env | xargs) \
        /opt/gleeworld-parttrack/venv/bin/python backfill_analysis.py --dry-run
Drop --dry-run to write.
"""
import json
import sys
import tempfile
from pathlib import Path

import psycopg
from music21 import converter

import config
import storage
from analyze import extract_analysis
from classify import inventory_parts

EXT = {"musicxml": ".musicxml", "mxl": ".mxl", "midi": ".mid", "pdf_omr": ".mxl"}


def main() -> int:
    dry = "--dry-run" in sys.argv
    settings = config.load()
    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, source_type, source_path, normalized_mxl_path
                FROM gw_parttrack_scores
                WHERE analysis IS NULL
                AND status IN ('awaiting_confirmation','rendering','ready')
                ORDER BY created_at
            """)
            rows = cur.fetchall()
        print(f"{len(rows)} score(s) to backfill{' (dry run)' if dry else ''}")
        failures = 0
        for score_id, source_type, source_path, normalized_mxl_path in rows:
            path = normalized_mxl_path or source_path
            if source_type == "pdf_omr" and not normalized_mxl_path:
                print(f"  {score_id}: SKIP — pdf_omr without normalized mxl (never analyzed)")
                continue
            try:
                tmp = Path(tempfile.mkdtemp()) / f"score{EXT[source_type]}"
                storage.download(settings, "parttrack", path, tmp)
                score = converter.parse(str(tmp))
                analysis = extract_analysis(score, inventory_parts(score))
            except Exception as e:  # keep going; report at the end
                failures += 1
                print(f"  {score_id}: FAILED — {e}")
                continue
            print(f"  {score_id}: {analysis['key']['initial']}, "
                  f"{analysis['measures']} measures, {len(analysis['parts'])} parts")
            if not dry:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE gw_parttrack_scores SET analysis = %s WHERE id = %s",
                        (json.dumps(analysis), score_id))
                conn.commit()
        print(f"done, {failures} failure(s)")
        return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
