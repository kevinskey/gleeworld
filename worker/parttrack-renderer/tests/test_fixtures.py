from fixtures import condensed_satb, no_tempo, satb_piano, with_repeats


def test_satb_piano_shape():
    s = satb_piano()
    assert len(s.parts) == 5
    assert [p.partName for p in s.parts] == ["Soprano", "Alto", "Tenor", "Bass", "Piano"]
    assert len(s.parts[0].getElementsByClass("Measure")) == 8


def test_condensed_has_two_voices_per_staff():
    s = condensed_satb()
    assert len(s.parts) == 2
    m1 = s.parts[0].getElementsByClass("Measure")[0]
    assert len(m1.voices) == 2


def test_no_tempo_has_no_metronome_marks():
    assert len(no_tempo().recurse().getElementsByClass("MetronomeMark")) == 0


def test_repeats_expand_longer():
    s = with_repeats()
    assert len(s.expandRepeats().parts[0].getElementsByClass("Measure")) > \
           len(s.parts[0].getElementsByClass("Measure"))
