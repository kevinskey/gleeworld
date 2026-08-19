from dataclasses import dataclass
from statistics import median

NAME_ROLES = {
    "soprano": "soprano", "sop": "soprano", "s.": "soprano",
    "alto": "alto", "a.": "alto",
    "tenor": "tenor", "ten": "tenor", "t.": "tenor",
    "bass": "bass", "baritone": "bass", "b.": "bass",
    "piano": "piano", "pno": "piano", "accomp": "piano", "organ": "piano",
}


@dataclass
class PartCandidate:
    source_part_index: int
    source_staff: int | None
    source_voice: int | None
    role: str
    label: str
    confidence: float


def _role_from_name(name: str | None) -> str | None:
    if not name:
        return None
    n = name.lower()
    for key, role in NAME_ROLES.items():
        if key in n:
            return role
    return None


def _is_generic_vocal_name(name: str | None) -> bool:
    # OMR output (and some engravers) name every sung staff "Voice" —
    # vocal for sure, but which part must come from the pitch range.
    if not name:
        return False
    n = name.lower()
    return "voice" in n or "vox" in n or n in ("choir", "chorus", "vocal")


def _median_midi(notes) -> float | None:
    vals = [p.midi for n in notes for p in n.pitches]
    return median(vals) if vals else None


def _role_from_pitch(mid: float | None, has_lyrics: bool) -> tuple[str, float]:
    if mid is None:
        return "other", 0.3
    if not has_lyrics:
        return "piano", 0.5
    if mid >= 69:
        return "soprano", 0.6
    if mid >= 62:
        return "alto", 0.6
    if mid >= 55:
        return "tenor", 0.6
    return "bass", 0.6


def voice_notes(part, voice_position):
    """Notes of the voice at 1-based voice_position, in the stable ordering
    used to number split voices (sorted voice ids, key=str)."""
    voice_ids = []
    for m in part.getElementsByClass("Measure"):
        for v in m.voices:
            if v.id not in voice_ids:
                voice_ids.append(v.id)
    ordered = sorted(voice_ids, key=str)
    if voice_position > len(ordered):
        return []
    vid = ordered[voice_position - 1]
    return [n for m in part.getElementsByClass("Measure")
            for v in m.voices if str(v.id) == str(vid)
            for n in v.notes]


def _voice_split_candidates(part, idx):
    out = []
    voice_ids = []
    for m in part.getElementsByClass("Measure"):
        for v in m.voices:
            if v.id not in voice_ids:
                voice_ids.append(v.id)
    for vpos, vid in enumerate(sorted(voice_ids, key=str), start=1):
        notes = voice_notes(part, vpos)
        has_lyrics = any(n.lyric for n in notes)
        role, conf = _role_from_pitch(_median_midi(notes), has_lyrics)
        out.append(PartCandidate(idx, idx, int(vpos), role,
                                 f"Staff {idx + 1} voice {vpos}", conf))
    return out


def inventory_parts(score):
    cands = []
    for idx, part in enumerate(score.parts):
        measures = part.getElementsByClass("Measure")
        voiced = sum(1 for m in measures if len(m.voices) >= 2)
        named = _role_from_name(part.partName)
        if named:
            cands.append(PartCandidate(idx, None, None, named, part.partName, 0.95))
        elif measures and voiced / len(measures) >= 0.3:
            cands.extend(_voice_split_candidates(part, idx))
        else:
            notes = list(part.recurse().notes)
            # A generically-named vocal staff counts as "has lyrics" for the
            # pitch heuristic: it is definitely sung, just unlabeled.
            has_lyrics = any(n.lyric for n in notes) or _is_generic_vocal_name(part.partName)
            role, conf = _role_from_pitch(_median_midi(notes), has_lyrics)
            cands.append(PartCandidate(idx, None, None, role,
                                       part.partName or f"Part {idx + 1}", conf))
    return cands
