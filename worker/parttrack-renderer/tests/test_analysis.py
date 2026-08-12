from classify import inventory_parts
from fixtures import condensed_satb, no_tempo, satb_piano
from analyze import extract_analysis, _candidate_notes


def _analysis(score):
    return extract_analysis(score, inventory_parts(score))


def test_satb_piano_facts():
    a = _analysis(satb_piano())
    assert a["v"] == 1
    assert a["computed_at"]  # ISO timestamp, non-empty
    assert a["tempo_bpm"] == 96
    assert a["measures"] == 8
    assert a["time_signatures"] == ["4/4"]
    # Krumhansl on a C-major-ish scale fixture: mode+tonic both present.
    assert a["key"]["initial"] is not None
    assert " " in a["key"]["initial"]          # "C major"-shaped
    assert a["key"]["changes"] == 0


def test_satb_piano_part_ranges():
    a = _analysis(satb_piano())
    by_label = {p["label"]: p for p in a["parts"]}
    assert by_label["Soprano"]["range"] == {"low": "C5", "high": "F5"}
    assert by_label["Bass"]["range"] == {"low": "C3", "high": "F3"}
    assert by_label["Soprano"]["role"] == "soprano"
    # Every part row carries the join keys Task 5 matches on.
    for p in a["parts"]:
        assert set(p) >= {"source_part_index", "source_staff", "source_voice",
                          "role", "label", "range"}


def test_voice_split_ranges_differ():
    # condensed_satb: 2 staves x 2 voices; each split voice gets its OWN range.
    a = _analysis(condensed_satb())
    split = [p for p in a["parts"] if p["source_voice"] is not None]
    assert len(split) == 4
    treble = {p["source_voice"]: p["range"] for p in split if p["source_part_index"] == 0}
    assert treble[1] == {"low": "C5", "high": "F5"}
    assert treble[2] == {"low": "E4", "high": "A4"}


def test_no_tempo_is_null_not_default():
    assert _analysis(no_tempo())["tempo_bpm"] is None


def test_candidate_notes_drift_guard():
    """Verify _candidate_notes mirrors classify._voice_split_candidates' voice selection.

    Both implementations must independently reconstruct the voice-id ordering
    (collect, sort by str, enumerate) and select the same notes. This test catches
    divergence between the two copies if either is accidentally modified.
    """
    score = condensed_satb()
    cands = inventory_parts(score)
    voice_split_cands = [c for c in cands if c.source_voice is not None]
    assert len(voice_split_cands) == 4, "condensed_satb must have 4 voice-split candidates"

    for cand in voice_split_cands:
        # Get the notes via _candidate_notes (the implementation being tested).
        notes_from_analyze = _candidate_notes(score, cand)
        assert len(notes_from_analyze) > 0, \
            f"_candidate_notes must return non-empty list for {cand.label}"

        # Independently reconstruct what _voice_split_candidates would select.
        part = score.parts[cand.source_part_index]
        voice_ids = []
        for m in part.getElementsByClass("Measure"):
            for v in m.voices:
                if v.id not in voice_ids:
                    voice_ids.append(v.id)
        ordered = sorted(voice_ids, key=str)
        vid = ordered[cand.source_voice - 1]
        notes_from_classify = [n for m in part.getElementsByClass("Measure")
                               for v in m.voices if str(v.id) == str(vid)
                               for n in v.notes]

        # Both should select the same notes (same count, same MIDI values).
        assert len(notes_from_analyze) == len(notes_from_classify), \
            f"Note count mismatch for {cand.label}: {len(notes_from_analyze)} != {len(notes_from_classify)}"

        midi_from_analyze = sorted([p.midi for n in notes_from_analyze for p in n.pitches])
        midi_from_classify = sorted([p.midi for n in notes_from_classify for p in n.pitches])
        assert midi_from_analyze == midi_from_classify, \
            f"MIDI pitch mismatch for {cand.label}: {midi_from_analyze} != {midi_from_classify}"
