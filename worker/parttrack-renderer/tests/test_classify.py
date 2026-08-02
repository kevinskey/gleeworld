from classify import inventory_parts
from fixtures import condensed_satb, satb_piano


def test_named_satb_piano_classified_by_name():
    cands = inventory_parts(satb_piano())
    roles = [c.role for c in cands]
    assert roles == ["soprano", "alto", "tenor", "bass", "piano"]
    assert all(c.confidence >= 0.9 for c in cands)


def test_condensed_yields_four_voice_candidates():
    cands = inventory_parts(condensed_satb())
    assert len(cands) == 4
    assert [(c.source_part_index, c.source_voice) for c in cands] == \
           [(0, 1), (0, 2), (1, 1), (1, 2)]
    # pitch-range heuristic ordering: S, A from staff 0; T, B from staff 1
    assert [c.role for c in cands] == ["soprano", "alto", "tenor", "bass"]
    assert all(c.confidence < 0.9 for c in cands)  # heuristic, needs confirmation


def test_voice_named_parts_classified_by_pitch():
    # OMR output: parts literally named "Voice", no lyrics survive.
    from music21 import clef, stream
    from fixtures import _measures
    s = stream.Score()
    for name, pitches, cl in [
        ("Voice", ["C5", "D5", "E5", "F5"], clef.TrebleClef()),
        ("Voice", ["E4", "F4", "G4", "A4"], clef.TrebleClef()),
        ("Voice", ["G3", "A3", "B3", "C4"], clef.BassClef()),
        ("Voice", ["C3", "D3", "E3", "F3"], clef.BassClef()),
    ]:
        p = stream.Part()
        p.partName = name
        p.append(cl)
        s.append(_measures(p, pitches))  # note: no lyrics
    roles = [c.role for c in inventory_parts(s)]
    assert roles == ["soprano", "alto", "tenor", "bass"]
