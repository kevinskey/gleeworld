import subprocess
from unittest.mock import patch

import pytest

from omr import OmrError, pdf_to_mxl


def _touch(p):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(b"x")
    return p


def test_finds_nested_mxl(tmp_path):
    pdf = _touch(tmp_path / "score.pdf")
    out = tmp_path / "out"

    def fake_run(cmd, **kw):
        _touch(out / "score" / "score.mxl")
        return subprocess.CompletedProcess(cmd, 0, stdout=b"", stderr=b"")

    with patch("omr.subprocess.run", side_effect=fake_run):
        assert pdf_to_mxl(pdf, out, "audiveris").name == "score.mxl"


def test_raises_on_failure_with_stderr(tmp_path):
    pdf = _touch(tmp_path / "score.pdf")

    def fake_run(cmd, **kw):
        return subprocess.CompletedProcess(cmd, 1, stdout=b"", stderr=b"boom: bad page")

    with patch("omr.subprocess.run", side_effect=fake_run):
        with pytest.raises(OmrError, match="bad page"):
            pdf_to_mxl(pdf, tmp_path / "out", "audiveris")


def test_raises_when_no_mxl_produced(tmp_path):
    pdf = _touch(tmp_path / "score.pdf")

    def fake_run(cmd, **kw):
        return subprocess.CompletedProcess(cmd, 0, stdout=b"", stderr=b"")

    with patch("omr.subprocess.run", side_effect=fake_run):
        with pytest.raises(OmrError, match="produced no music"):
            pdf_to_mxl(pdf, tmp_path / "out", "audiveris")
