import copy
import os
import subprocess
from pathlib import Path

from music21 import instrument, tempo

GM_PROGRAMS = {"piano": 0, "oboe": 68, "choir": 52}

MIX_MATRIX = {          # (voices_gain, piano_gain, featured_gain)
    "strong":     (0.15, 0.45, 1.0),
    "plus_piano": (0.0,  0.55, 1.0),
    "alone":      (0.0,  0.0,  1.0),
}
FULL_VOICES, FULL_PIANO = 0.75, 0.6


def _prepared(score):
    s = copy.deepcopy(score)
    if not s.recurse().getElementsByClass("MetronomeMark"):
        s.insert(0, tempo.MetronomeMark(number=100))
    try:
        s = s.expandRepeats()
    except Exception:
        pass  # validated earlier; render written-through as fallback
    return s


def _extract(score, row):
    part = copy.deepcopy(score.parts[row["source_part_index"]])
    if row["source_voice"] is not None:
        split = part.voicesToParts()
        idx = min(row["source_voice"] - 1, len(split.parts) - 1)
        part = split.parts[idx]
    return part


def _run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def _is_piano_role(role: str) -> bool:
    return role.startswith("piano")


def render_stems(score, parts, timbre, workdir) -> dict:
    workdir = Path(workdir)
    prepared = _prepared(score)
    stems = {}
    for row in parts:
        if not row["include"]:
            continue
        # Duplicate roles must not collapse into one stem (six parts all
        # confirmed "piano" once rendered as a single staff): suffix dupes.
        base_role = row["role"]
        key = base_role
        n = 2
        while key in stems:
            key = f"{base_role}_{n}"
            n += 1
        row = {**row, "role": key}
        part = _extract(prepared, row)
        program = GM_PROGRAMS["piano"] if _is_piano_role(base_role) else GM_PROGRAMS[timbre]
        for el in list(part.recurse().getElementsByClass(instrument.Instrument)):
            el.activeSite.remove(el)
        inst = instrument.instrumentFromMidiProgram(program)
        part.insert(0, inst)
        # carry the score-level tempo into the solo part so MIDI timing matches
        if not part.recurse().getElementsByClass("MetronomeMark"):
            for mm in prepared.recurse().getElementsByClass("MetronomeMark"):
                part.insert(0, copy.deepcopy(mm))
                break
        mid = workdir / f"{row['role']}.mid"
        raw = workdir / f"{row['role']}.raw.wav"
        out = workdir / f"{row['role']}.wav"
        part.write("midi", fp=str(mid))
        _run(["fluidsynth", "-ni", "-F", str(raw), "-r", "44100",
              os.environ["SOUNDFONT_PATH"], str(mid)])
        _run(["ffmpeg", "-y", "-i", str(raw),
              "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", str(out)])
        stems[row["role"]] = out
    return stems


def _amix(inputs_gains, out):
    cmd, filters, tags = ["ffmpeg", "-y"], [], []
    for i, (path, gain) in enumerate(inputs_gains):
        cmd += ["-i", str(path)]
        filters.append(f"[{i}:a]volume={gain}[a{i}]")
        tags.append(f"[a{i}]")
    fc = ";".join(filters) + f";{''.join(tags)}amix=inputs={len(tags)}:normalize=0[out]"
    _run(cmd + ["-filter_complex", fc, "-map", "[out]", "-ar", "44100", str(out)])
    return out


def build_mixes(stems: dict, workdir) -> dict:
    workdir = Path(workdir)
    voices = {r: p for r, p in stems.items() if not _is_piano_role(r)}
    pianos = [p for r, p in stems.items() if _is_piano_role(r)]
    mixes = {}
    for featured, fpath in voices.items():
        for preset, (vg, pg, fg) in MIX_MATRIX.items():
            ig = [(fpath, fg)]
            ig += [(p, vg) for r, p in voices.items() if r != featured and vg > 0]
            if pianos and pg > 0:
                ig += [(p, pg) for p in pianos]
            mixes[(preset, featured)] = _amix(ig, workdir / f"{featured}_{preset}.wav")
    full = [(p, FULL_VOICES) for p in voices.values()]
    full += [(p, FULL_PIANO) for p in pianos]
    if full:
        mixes[("full", None)] = _amix(full, workdir / "full.wav")
    if pianos:
        mixes[("piano_only", None)] = _amix([(p, 1.0) for p in pianos], workdir / "piano_only.wav")
    return mixes


def encode_mp3(wav: Path) -> Path:
    out = Path(wav).with_suffix(".mp3")
    _run(["ffmpeg", "-y", "-i", str(wav), "-codec:a", "libmp3lame",
          "-b:a", "192k", "-ar", "44100", str(out)])
    return out


def build_manifest(score) -> dict:
    # Timing is computed arithmetically from the first tempo mark (the
    # manifest carries a single tempo entry by design — see the plan's
    # self-review notes). Multi-tempo pieces refine in Plan 2.
    prepared = _prepared(score)
    ref = prepared.parts[0]
    measure_list = list(ref.getElementsByClass("Measure"))
    tempo_map = [{"measure": 1, "bpm": float(mm.number)}
                 for mm in prepared.recurse().getElementsByClass("MetronomeMark")][:1] or \
                [{"measure": 1, "bpm": 100.0}]
    sec_per_quarter = 60.0 / tempo_map[0]["bpm"]
    measures, marks, beats = [], [], []
    for i, m in enumerate(measure_list):
        secs = float(m.offset) * sec_per_quarter
        measures.append({"number": i + 1, "seconds": round(secs, 3)})
        ts = m.timeSignature
        if ts:
            beats.append({"measure": i + 1, "count": ts.numerator})
        for rm in m.getElementsByClass("RehearsalMark"):
            marks.append({"measure": i + 1, "label": str(rm.content)})
    last = measure_list[-1]
    dur = (float(last.offset) + float(last.duration.quarterLength)) * sec_per_quarter
    return {"duration_ms": int(dur * 1000), "tempo_map": tempo_map,
            "measures": measures, "rehearsal_marks": marks, "beats": beats}
