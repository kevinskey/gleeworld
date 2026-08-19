# Repair Audiveris MusicXML defects that crash desktop notation editors.
#
# Verified against Sibelius 2026.2.1: an unterminated direction spanner
# (octave-shift or hairpin wedge) that runs across a <print> system/page
# break kills the importer outright, and Audiveris omits <time> entirely
# when it cannot read the meter, leaving measure math undefined. Repairs
# are reductive (drop unmatched spanner halves and volta brackets) except
# for the meter, which is inferred from the modal measure length.
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from fractions import Fraction
from pathlib import Path

SPANNER_TAGS = ("wedge", "octave-shift", "bracket", "dashes")


def _remove_unmatched_spanners(part) -> int:
    """Drop spanner starts with no stop and stops with no start, per part."""
    removed = 0
    open_spans = {}  # (tag, number) -> (direction, direction-type, spanner)
    for measure in part.findall("measure"):
        for direction in measure.findall("direction"):
            for dtype in direction.findall("direction-type"):
                for span in list(dtype):
                    if span.tag not in SPANNER_TAGS:
                        continue
                    key = (span.tag, span.get("number", "1"))
                    kind = span.get("type")
                    if kind == "stop":
                        if key in open_spans:
                            open_spans.pop(key)
                        else:
                            dtype.remove(span)
                            removed += 1
                    elif kind == "continue":
                        if key not in open_spans:
                            dtype.remove(span)
                            removed += 1
                    else:  # start forms: crescendo/diminuendo/up/down/...
                        if key in open_spans:  # reopened without a stop
                            d, dt, s = open_spans.pop(key)
                            dt.remove(s)
                            removed += 1
                        open_spans[key] = (direction, dtype, span)
    for _, dtype, span in open_spans.values():
        dtype.remove(span)
        removed += 1
    # A <direction> with no <direction-type> left is schema-invalid: drop
    # it, hoisting any <sound> payload out as a standalone measure child.
    for measure in part.findall("measure"):
        for i, direction in reversed(list(enumerate(measure))):
            if direction.tag != "direction":
                continue
            for dtype in list(direction.findall("direction-type")):
                if len(dtype) == 0:
                    direction.remove(dtype)
            if not direction.findall("direction-type"):
                sound = direction.find("sound")
                measure.remove(direction)
                if sound is not None:
                    measure.insert(i, sound)
    return removed


def _remove_unmatched_endings(part) -> int:
    """Drop volta brackets that never close (or close without opening)."""
    removed = 0
    open_ending = None  # (barline, ending)
    for measure in part.findall("measure"):
        for barline in measure.findall("barline"):
            ending = barline.find("ending")
            if ending is None:
                continue
            kind = ending.get("type")
            if kind == "start":
                if open_ending is not None:
                    bl, e = open_ending
                    bl.remove(e)
                    removed += 1
                open_ending = (barline, ending)
            elif kind in ("stop", "discontinue"):
                if open_ending is None:
                    barline.remove(ending)
                    removed += 1
                else:
                    open_ending = None
    if open_ending is not None:
        bl, e = open_ending
        bl.remove(e)
        removed += 1
    return removed


def _remove_dangling_tie_stops(part) -> int:
    """Drop tied/tie stops whose start never happened.

    Audiveris emits these when it misreads the first note of a tie; a
    <tied type="stop"> with no origin is what Sibelius' deferred tie
    resolution crashes on (~a minute after the score opens and renders).
    Unmatched STARTS are left alone — a tie into nothing is a legal
    laissez-vibrer and harmless.
    """
    removed = 0
    open_ties = {}  # (voice, step, octave, alter) -> open count
    for measure in part.findall("measure"):
        for note in measure.findall("note"):
            pitch = note.find("pitch")
            if pitch is None:
                continue
            key = (note.findtext("voice") or "1", pitch.findtext("step"),
                   pitch.findtext("octave"), float(pitch.findtext("alter") or 0))
            for tied in list(note.findall("notations/tied")):
                kind = tied.get("type")
                if kind == "start":
                    open_ties[key] = open_ties.get(key, 0) + 1
                elif kind in ("stop", "continue"):
                    if open_ties.get(key, 0) > 0:
                        if kind == "stop":
                            open_ties[key] -= 1
                    else:
                        note.find("notations").remove(tied)
                        removed += 1
                        for tie in list(note.findall("tie")):
                            if tie.get("type") == "stop":
                                note.remove(tie)
    return removed


def _measure_fill_quarters(part):
    """Yield each measure's occupied length in quarter notes."""
    divisions = None
    for measure in part.findall("measure"):
        attrs = measure.find("attributes")
        if attrs is not None and attrs.findtext("divisions"):
            divisions = int(attrs.findtext("divisions"))
        if not divisions:
            continue
        cursor = high = 0
        for el in measure:
            if el.tag == "note":
                if el.find("chord") is not None or el.find("grace") is not None:
                    continue
                cursor += int(el.findtext("duration") or 0)
            elif el.tag == "backup":
                cursor -= int(el.findtext("duration") or 0)
            elif el.tag == "forward":
                cursor += int(el.findtext("duration") or 0)
            high = max(high, cursor)
        if high > 0:
            yield Fraction(high, divisions)


def _infer_time(root):
    """Modal measure length in quarters -> (beats, beat_type), or None.

    Only infers when nearly every measure matches the mode: declaring a
    meter that contradicts measure contents is itself a Sibelius crash
    (verified — 4/4 injected over OMR-garbled 6- and 9-quarter measures
    kills the import just like the spanner bug). A meterless score, by
    contrast, opens fine, so when in doubt we leave it meterless.
    """
    fills = Counter()
    for part in root.findall("part"):
        fills.update(_measure_fill_quarters(part))
    if not fills:
        return None
    mode, mode_count = fills.most_common(1)[0]
    # Underfull measures are legitimate pickups, but any measure LONGER
    # than the declared meter is the contradiction Sibelius dies on.
    if max(fills) > mode:
        return None
    if mode_count / sum(fills.values()) < 0.9:
        return None
    if mode.denominator == 1 and 1 <= mode.numerator <= 12:
        return str(mode.numerator), "4"
    return None


def _inject_time(root) -> bool:
    """If the score has no <time> anywhere and the measures agree on a
    length, write the implied meter into every part."""
    if root.find("part/measure/attributes/time") is not None:
        return False
    inferred = _infer_time(root)
    if inferred is None:
        return False
    beats, beat_type = inferred
    time_el = ET.Element("time")
    ET.SubElement(time_el, "beats").text = beats
    ET.SubElement(time_el, "beat-type").text = beat_type
    for part in root.findall("part"):
        first_measure = part.find("measure")
        if first_measure is None:
            continue
        attrs = first_measure.find("attributes")
        if attrs is None:
            attrs = ET.Element("attributes")
            first_measure.insert(0, attrs)
        children = list(attrs)
        after = {"divisions", "key"}
        idx = 0
        for i, child in enumerate(children):
            if child.tag in after:
                idx = i + 1
        attrs.insert(idx, _copy(time_el))
    return True


def _copy(el):
    return ET.fromstring(ET.tostring(el))


def sanitize_musicxml_tree(root) -> list[str]:
    """Repair a parsed score-partwise tree in place; return applied fix codes."""
    fixes = []
    spanners = endings = ties = 0
    for part in root.findall("part"):
        spanners += _remove_unmatched_spanners(part)
        endings += _remove_unmatched_endings(part)
        ties += _remove_dangling_tie_stops(part)
    if spanners:
        fixes.append(f"removed_unmatched_spanners:{spanners}")
    if endings:
        fixes.append(f"removed_unmatched_endings:{endings}")
    if ties:
        fixes.append(f"removed_dangling_tie_stops:{ties}")
    if _inject_time(root):
        fixes.append("injected_time_signature")
    return fixes


def sanitize_mxl(path: Path) -> list[str]:
    """Sanitize every .xml inside a compressed .mxl, rewriting it in place."""
    path = Path(path)
    fixes = []
    entries = []
    with zipfile.ZipFile(path) as z:
        for info in z.infolist():
            data = z.read(info.filename)
            name = info.filename.lower()
            if name.endswith((".xml", ".musicxml")) and not name.startswith("meta-inf"):
                root = ET.fromstring(data)
                if root.tag == "score-partwise":
                    applied = sanitize_musicxml_tree(root)
                    if applied:
                        fixes = applied
                        data = ET.tostring(root, encoding="UTF-8", xml_declaration=True)
            entries.append((info.filename, data))
    if fixes:
        tmp = path.with_suffix(".sanitized.mxl")
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
            for name, data in entries:
                z.writestr(name, data)
        tmp.replace(path)
    return fixes
