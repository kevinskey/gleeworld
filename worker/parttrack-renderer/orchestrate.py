# Render handler: stems -> mixes -> mp3 -> storage -> render rows + manifest.
import json
import tempfile
from pathlib import Path

from psycopg.rows import dict_row

import config
import db
import storage
from analyze import _load_score
from render import build_manifest, build_mixes, encode_mp3, render_stems


def run_render(conn, job):
    settings = config.load()
    db.set_score_status(conn, job["score_id"], "rendering")
    score, _fixes = _load_score(conn, job, settings)
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""
            SELECT role, label, source_part_index, source_voice, include
            FROM gw_parttrack_parts
            WHERE score_id = %s AND confirmed AND include
            ORDER BY source_part_index, source_voice NULLS FIRST
        """, (job["score_id"],))
        parts = cur.fetchall()
        cur.execute("SELECT timbre, tenant_id, tempo_override_bpm FROM gw_parttrack_scores WHERE id = %s",
                    (job["score_id"],))
        row = cur.fetchone()
    if not parts:
        raise ValueError("No confirmed parts to render — confirm the part mapping first")

    workdir = Path(tempfile.mkdtemp())
    prefix = f"{row['tenant_id']}/{job['score_id']}"
    stems = render_stems(score, parts, row["timbre"], workdir,
                         tempo_override_bpm=row["tempo_override_bpm"])
    mixes = build_mixes(stems, workdir)
    manifest = build_manifest(score, tempo_override_bpm=row["tempo_override_bpm"])

    with conn.cursor() as cur:
        cur.execute("DELETE FROM gw_parttrack_renders WHERE score_id = %s", (job["score_id"],))
        for role, wav in stems.items():
            mp3 = encode_mp3(wav)
            path = f"{prefix}/stems/{role}.mp3"
            storage.upload(settings, "parttrack", path, mp3, "audio/mpeg")
            cur.execute("""
                INSERT INTO gw_parttrack_renders
                  (tenant_id, score_id, kind, part_role, audio_path, duration_ms)
                VALUES (%s, %s, 'stem', %s, %s, %s)
            """, (job["tenant_id"], job["score_id"], role, path, manifest["duration_ms"]))
        for (preset, featured), wav in mixes.items():
            mp3 = encode_mp3(wav)
            name = f"{featured}_{preset}.mp3" if featured else f"{preset}.mp3"
            path = f"{prefix}/mixes/{name}"
            storage.upload(settings, "parttrack", path, mp3, "audio/mpeg")
            cur.execute("""
                INSERT INTO gw_parttrack_renders
                  (tenant_id, score_id, kind, part_role, mix_preset, audio_path, duration_ms)
                VALUES (%s, %s, 'mix', %s, %s, %s, %s)
            """, (job["tenant_id"], job["score_id"], featured, preset, path,
                  manifest["duration_ms"]))
        cur.execute("""
            UPDATE gw_parttrack_scores
            SET manifest = %s, status = 'ready', error_message = NULL
            WHERE id = %s
        """, (json.dumps(manifest), job["score_id"]))
    conn.commit()
