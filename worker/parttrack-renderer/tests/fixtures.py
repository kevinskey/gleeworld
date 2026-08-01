# Deterministic music21 fixture scores; no binary files in the repo.
from music21 import bar, clef, instrument, meter, note, stream, tempo


def _measures(part, pitches, lyric=None, n=8):
    for i in range(n):
        m = stream.Measure(number=i + 1)
        if i == 0:
            m.append(meter.TimeSignature("4/4"))
        for beat in range(4):
            nt = note.Note(pitches[(i + beat) % len(pitches)], quarterLength=1)
            if lyric:
                nt.lyric = lyric
            m.append(nt)
        part.append(m)
    return part


def _vocal(name, pitches, cl):
    p = stream.Part()
    p.partName = name
    p.append(cl)
    return _measures(p, pitches, lyric="la")


def satb_piano():
    s = stream.Score()
    s.append(tempo.MetronomeMark(number=96))
    s.append(_vocal("Soprano", ["C5", "D5", "E5", "F5"], clef.TrebleClef()))
    s.append(_vocal("Alto", ["G4", "A4", "B4", "C5"], clef.TrebleClef()))
    s.append(_vocal("Tenor", ["C4", "D4", "E4", "F4"], clef.Treble8vbClef()))
    s.append(_vocal("Bass", ["C3", "D3", "E3", "F3"], clef.BassClef()))
    piano = stream.Part()
    piano.partName = "Piano"
    piano.insert(0, instrument.Piano())
    piano.append(clef.TrebleClef())
    s.append(_measures(piano, ["C4", "E4", "G4", "C5"]))
    return s


def condensed_satb():
    s = stream.Score()
    s.append(tempo.MetronomeMark(number=90))
    for cl, hi, lo in [
        (clef.TrebleClef(), ["C5", "D5", "E5", "F5"], ["E4", "F4", "G4", "A4"]),
        (clef.BassClef(), ["G3", "A3", "B3", "C4"], ["C3", "D3", "E3", "F3"]),
    ]:
        p = stream.Part()
        p.append(cl)
        for i in range(8):
            m = stream.Measure(number=i + 1)
            if i == 0:
                m.append(meter.TimeSignature("4/4"))
            v1, v2 = stream.Voice(id="1"), stream.Voice(id="2")
            for beat in range(4):
                a = note.Note(hi[(i + beat) % 4], quarterLength=1)
                a.lyric = "la"
                b = note.Note(lo[(i + beat) % 4], quarterLength=1)
                b.lyric = "la"
                v1.append(a)
                v2.append(b)
            m.insert(0, v1)
            m.insert(0, v2)
            p.append(m)
        s.append(p)
    return s


def no_tempo():
    s = satb_piano()
    for mm in list(s.recurse().getElementsByClass("MetronomeMark")):
        mm.activeSite.remove(mm)
    return s


def with_repeats():
    s = satb_piano()
    for p in s.parts:
        ms = p.getElementsByClass("Measure")
        ms[0].leftBarline = bar.Repeat(direction="start")
        ms[3].rightBarline = bar.Repeat(direction="end")
    return s


def write_musicxml(score, path):
    score.write("musicxml", fp=str(path))
    return str(path)
