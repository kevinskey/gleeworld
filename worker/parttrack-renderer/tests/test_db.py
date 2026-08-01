import os

import psycopg
import pytest

from db import claim_next_job, finish_job

DSN = os.environ.get("PARTTRACK_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DSN, reason="needs PARTTRACK_TEST_DATABASE_URL")


def test_claim_marks_running_and_skips_locked():
    with psycopg.connect(DSN) as conn:
        job = claim_next_job(conn)
        if job is None:
            pytest.skip("no queued jobs in test DB")
        assert job["status_was"] == "queued"
        # a second connection must not see the same job
        with psycopg.connect(DSN) as conn2:
            other = claim_next_job(conn2)
            assert other is None or other["id"] != job["id"]
        finish_job(conn, job["id"], error="test rollback")
