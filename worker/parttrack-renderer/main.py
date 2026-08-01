# gleeworld-parttrack-worker — polls gw_parttrack_jobs, runs analyze/render.
import time
import traceback

import psycopg

import config
import db


def handle_job(conn, job):
    # analyze/render handlers are wired in later tasks
    from analyze import run_analyze
    from orchestrate import run_render
    if job["kind"] == "analyze":
        run_analyze(conn, job)
    elif job["kind"] == "render":
        run_render(conn, job)
    else:
        raise ValueError(f"unknown job kind {job['kind']}")


def loop():
    settings = config.load()
    while True:
        try:
            with psycopg.connect(settings.database_url) as conn:
                job = db.claim_next_job(conn)
                if job is None:
                    time.sleep(settings.poll_interval_s)
                    continue
                try:
                    handle_job(conn, job)
                    db.finish_job(conn, job["id"])
                except Exception as e:
                    traceback.print_exc()
                    db.finish_job(conn, job["id"], error=str(e)[:500])
                    db.set_score_status(conn, job["score_id"], "failed", str(e)[:500])
        except Exception:
            traceback.print_exc()
            time.sleep(10)


if __name__ == "__main__":
    loop()
