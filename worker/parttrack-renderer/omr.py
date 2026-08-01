# Audiveris headless OMR: PDF -> MusicXML (.mxl). Invoked as an unmodified
# separate-process CLI. Beta-quality by design; the confirm screen absorbs
# recognition errors.
import subprocess
from pathlib import Path

OMR_TIMEOUT_S = 600


class OmrError(Exception):
    pass


def pdf_to_mxl(pdf_path: Path, workdir: Path, audiveris_cmd: str) -> Path:
    workdir.mkdir(parents=True, exist_ok=True)
    cmd = [audiveris_cmd, "-batch", "-export", "-output", str(workdir), str(pdf_path)]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=OMR_TIMEOUT_S)
    except FileNotFoundError:
        raise OmrError("PDF reading is not set up on this server yet (Audiveris not found).")
    except subprocess.TimeoutExpired:
        raise OmrError("Reading the PDF took too long — try a shorter or cleaner scan.")
    if result.returncode != 0:
        tail = (result.stderr or b"")[-400:].decode(errors="replace")
        raise OmrError(f"Could not read the PDF: {tail}")
    candidates = sorted(workdir.rglob("*.mxl"), key=lambda p: p.stat().st_mtime)
    if not candidates:
        raise OmrError("The PDF was processed but produced no music — is it a scanned score?")
    return candidates[-1]
