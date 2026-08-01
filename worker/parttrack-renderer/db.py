from psycopg.rows import dict_row


def claim_next_job(conn) -> dict | None:
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""
            SELECT id, tenant_id, score_id, kind, attempts, 'queued' AS status_was
            FROM gw_parttrack_jobs
            WHERE status = 'queued' AND attempts < 2
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        """)
        job = cur.fetchone()
        if not job:
            conn.commit()
            return None
        cur.execute("""
            UPDATE gw_parttrack_jobs
            SET status = 'running', attempts = attempts + 1, started_at = now()
            WHERE id = %s
        """, (job["id"],))
        conn.commit()
        return job


def finish_job(conn, job_id, error: str | None = None):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE gw_parttrack_jobs
            SET status = %s, error_message = %s, finished_at = now()
            WHERE id = %s
        """, ("error" if error else "done", error, job_id))
    conn.commit()


def set_score_status(conn, score_id, status, error_message: str | None = None):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE gw_parttrack_scores
            SET status = %s, error_message = %s
            WHERE id = %s
        """, (status, error_message, score_id))
    conn.commit()
