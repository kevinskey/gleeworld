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
