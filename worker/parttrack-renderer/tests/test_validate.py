from fixtures import no_tempo, satb_piano, with_repeats
from validate import validate_score


def test_clean_score_no_warnings():
    assert validate_score(satb_piano()) == []


def test_missing_tempo_warns():
    codes = [w["code"] for w in validate_score(no_tempo())]
    assert "no_tempo" in codes


def test_repeats_ok():
    assert "repeats_unexpandable" not in [w["code"] for w in validate_score(with_repeats())]
