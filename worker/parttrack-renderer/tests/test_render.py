import os
import shutil
import wave

import pytest

from fixtures import no_tempo, satb_piano, with_repeats
from render import build_manifest, build_mixes, render_stems

HAVE_TOOLS = shutil.which("fluidsynth") and shutil.which("ffmpeg") and os.environ.get("SOUNDFONT_PATH")
needs_tools = pytest.mark.skipif(not HAVE_TOOLS, reason="needs fluidsynth+ffmpeg+SOUNDFONT_PATH")

PARTS = [
    {"role": r, "label": r.title(), "source_part_index": i, "source_voice": None, "include": True}
    for i, r in enumerate(["soprano", "alto", "tenor", "bass", "piano"])
]


def _wav_seconds(p):
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


@needs_tools
def test_stems_one_per_part_same_duration(tmp_path):
    stems = render_stems(satb_piano(), PARTS, "piano", tmp_path)
    assert set(stems) == {"soprano", "alto", "tenor", "bass", "piano"}
    secs = [_wav_seconds(p) for p in stems.values()]
    assert max(secs) - min(secs) < 0.1          # aligned stems
    assert 19 < max(secs) < 24                  # 20s of notes + fluidsynth decay tail


@needs_tools
def test_mix_count_for_satb_piano(tmp_path):
    stems = render_stems(satb_piano(), PARTS, "piano", tmp_path)
    mixes = build_mixes(stems, tmp_path)
    # 4 voices x (strong, plus_piano, alone) + full + piano_only = 14
    assert len(mixes) == 14


def test_manifest_measures_and_tempo():
    m = build_manifest(satb_piano())
    assert len(m["measures"]) == 8
    assert m["tempo_map"][0]["bpm"] == 96
    assert m["measures"][1]["seconds"] == pytest.approx(2.5, abs=0.01)  # 4 beats at 96


def test_manifest_expands_repeats():
    assert len(build_manifest(with_repeats())["measures"]) == 12


def test_manifest_defaults_missing_tempo_to_100():
    assert build_manifest(no_tempo())["tempo_map"][0]["bpm"] == 100


@needs_tools
def test_duplicate_roles_produce_distinct_stems(tmp_path):
    # Six parts all confirmed "piano" must NOT collapse into one stem
    # (live bug: "only pulled one staff out of 6").
    dupes = [
        {"role": "piano", "label": f"Voice {i}", "source_part_index": i,
         "source_voice": None, "include": True}
        for i in range(3)
    ]
    stems = render_stems(satb_piano(), dupes, "piano", tmp_path)
    assert len(stems) == 3
    assert sorted(stems) == ["piano", "piano_2", "piano_3"]


def test_mixes_treat_suffixed_piano_as_accompaniment(tmp_path):
    from render import build_mixes
    fake = {"soprano": tmp_path / "s.wav", "piano": tmp_path / "p1.wav", "piano_2": tmp_path / "p2.wav"}
    for p in fake.values():
        p.write_bytes(b"x")
    import render
    calls = []
    orig = render._amix
    render._amix = lambda ig, out: calls.append((tuple(str(p) for p, _ in ig), str(out))) or out
    try:
        mixes = build_mixes(fake, tmp_path)
    finally:
        render._amix = orig
    # only soprano is a voice: 3 featured presets + full + piano_only = 5
    assert len(mixes) == 5
    featured = [k for k in mixes if k[1] == "piano_2"]
    assert featured == []
