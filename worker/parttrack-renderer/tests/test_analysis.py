from classify import inventory_parts
from fixtures import condensed_satb, no_tempo, satb_piano
from analyze import extract_analysis


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
