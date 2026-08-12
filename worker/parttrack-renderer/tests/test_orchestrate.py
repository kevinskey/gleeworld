# Regression: run_render must unpack _load_score's (score, fixes) tuple.
# PR #623 changed the return shape; the analyze path was updated but the
# render path passed the raw tuple into render_stems ("'tuple' object has
# no attribute 'recurse'" on every render).
from contextlib import contextmanager
from unittest.mock import patch

from fixtures import satb_piano
import orchestrate


class FakeCursor:
    def __init__(self, parts, row):
        self._parts = parts
        self._row = row
        self._last = None

    def execute(self, sql, params=None):
        self._last = sql

    def fetchall(self):
        return self._parts

    def fetchone(self):
        return self._row


class FakeConn:
    def __init__(self, parts, row):
        self._cursor = FakeCursor(parts, row)

    @contextmanager
    def cursor(self, row_factory=None):
        yield self._cursor

    def commit(self):
        pass


def test_run_render_passes_stream_not_tuple():
    score = satb_piano()
    parts = [{"role": "soprano", "label": "Soprano", "source_part_index": 0,
              "source_voice": None, "include": True}]
    row = {"timbre": "piano", "tenant_id": "t1", "tempo_override_bpm": None}
    seen = {}

    def fake_render_stems(s, *a, **kw):
        seen["score"] = s
        raise RuntimeError("stop-here")  # don't run the real pipeline

    with patch.object(orchestrate, "_load_score", return_value=(score, [])), \
         patch.object(orchestrate.config, "load", return_value=object()), \
         patch.object(orchestrate.db, "set_score_status"), \
         patch.object(orchestrate, "render_stems", side_effect=fake_render_stems):
        try:
            orchestrate.run_render(FakeConn(parts, row), {"score_id": "s1", "tenant_id": "t1"})
        except RuntimeError as e:
            assert str(e) == "stop-here"

    # The exact bug: a (score, fixes) tuple reaching the renderer.
    assert not isinstance(seen["score"], tuple), \
        "run_render passed _load_score's raw tuple to render_stems"
    assert hasattr(seen["score"], "recurse")
