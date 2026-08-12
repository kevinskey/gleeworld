from classify import inventory_parts, voice_notes
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


def test_candidate_notes_wiring():
    """Verify _candidate_notes correctly wires to the shared voice_notes function.

    _candidate_notes must return exactly what voice_notes returns for split candidates,
    ensuring both analyze.py and classify.py use the same voice selection logic.
    """
    score = condensed_satb()
    cands = inventory_parts(score)
    voice_split_cands = [c for c in cands if c.source_voice is not None]
    assert len(voice_split_cands) == 4, "condensed_satb must have 4 voice-split candidates"

    for cand in voice_split_cands:
        part = score.parts[cand.source_part_index]
        # Both functions must return the same notes.
        notes_from_candidate = _candidate_notes(score, cand)
        notes_from_voice = voice_notes(part, cand.source_voice)
        assert notes_from_candidate == notes_from_voice, \
            f"_candidate_notes and voice_notes mismatch for {cand.label}"
        assert len(notes_from_candidate) > 0, \
            f"voice_notes must return non-empty for {cand.label}"
