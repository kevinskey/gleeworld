import xml.etree.ElementTree as ET
import zipfile

from sanitize import sanitize_musicxml_tree, sanitize_mxl


def _score(measures_xml, attrs="<divisions>4</divisions>"):
    return ET.fromstring(f"""<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1"><attributes>{attrs}</attributes>{measures_xml}</measure>
  </part>
</score-partwise>""")


NOTE = "<note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration></note>"
TIME = "<time><beats>3</beats><beat-type>4</beat-type></time>"


def test_unmatched_wedge_start_is_removed():
    root = _score(f"""
      <direction><direction-type><wedge type="crescendo"/></direction-type></direction>
      {NOTE}""")
    fixes = sanitize_musicxml_tree(root)
    assert fixes[0] == "removed_unmatched_spanners:1"
    assert root.find(".//wedge") is None
    assert root.find(".//direction") is None  # emptied direction pruned


def test_matched_wedge_pair_is_kept():
    root = _score(f"""
      <direction><direction-type><wedge type="crescendo"/></direction-type></direction>
      {NOTE}
      <direction><direction-type><wedge type="stop"/></direction-type></direction>""")
    assert sanitize_musicxml_tree(root) == ["injected_time_signature"]
    assert len(root.findall(".//wedge")) == 2


def test_unmatched_octave_shift_is_removed():
    root = _score(f"""
      <direction><direction-type><octave-shift type="down" size="15"/></direction-type></direction>
      {NOTE}""")
    fixes = sanitize_musicxml_tree(root)
    assert "removed_unmatched_spanners:1" in fixes
    assert root.find(".//octave-shift") is None


def test_unmatched_ending_start_is_removed():
    root = _score(f"""{NOTE}
      <barline location="left"><bar-style>regular</bar-style>
        <ending number="1" type="start"/></barline>""")
    fixes = sanitize_musicxml_tree(root)
    assert "removed_unmatched_endings:1" in fixes
    assert root.find(".//ending") is None
    assert root.find(".//barline") is not None  # barline itself survives


def test_matched_volta_is_kept():
    root = _score(f"""
      <barline location="left"><ending number="1" type="start"/></barline>
      {NOTE}
      <barline location="right"><ending number="1" type="stop"/></barline>""")
    assert sanitize_musicxml_tree(root) == ["injected_time_signature"]
    assert len(root.findall(".//ending")) == 2


def test_missing_time_signature_is_inferred_from_fill():
    # 16 divisions of content at divisions=4 -> four quarters -> 4/4
    root = _score(NOTE)
    assert sanitize_musicxml_tree(root) == ["injected_time_signature"]
    time = root.find("part/measure/attributes/time")
    assert time.findtext("beats") == "4"
    assert time.findtext("beat-type") == "4"


def test_dangling_tie_stop_is_removed():
    root = _score("""
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>16</duration>
        <tie type="stop"/><notations><tied type="stop"/></notations></note>""")
    fixes = sanitize_musicxml_tree(root)
    assert "removed_dangling_tie_stops:1" in fixes
    assert root.find(".//tied") is None
    assert root.find(".//tie") is None


def test_real_tie_pair_is_kept():
    root = _score("""
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration>
        <tie type="start"/><notations><tied type="start"/></notations></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration>
        <tie type="stop"/><notations><tied type="stop"/></notations></note>""")
    assert "removed_dangling_tie_stops:1" not in " ".join(sanitize_musicxml_tree(root))
    assert len(root.findall(".//tied")) == 2


def test_no_injection_when_measure_lengths_disagree():
    # Second measure holds 6 quarters vs 4 in the first: declaring any
    # meter would contradict the content, so the score stays meterless.
    root = ET.fromstring(f"""<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1"><attributes><divisions>4</divisions></attributes>{NOTE}</measure>
    <measure number="2">{NOTE}<note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration></note></measure>
  </part>
</score-partwise>""")
    assert sanitize_musicxml_tree(root) == []
    assert root.find(".//time") is None


def test_existing_time_signature_untouched():
    root = _score(NOTE, attrs=f"<divisions>4</divisions>{TIME}")
    assert sanitize_musicxml_tree(root) == []
    assert root.find("part/measure/attributes/time").findtext("beats") == "3"


def test_sanitize_mxl_rewrites_zip_in_place(tmp_path):
    xml = ET.tostring(_score(
        '<direction><direction-type><wedge type="crescendo"/></direction-type></direction>'
        + NOTE))
    path = tmp_path / "score.mxl"
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("META-INF/container.xml",
                   '<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>')
        z.writestr("score.xml", xml)
    fixes = sanitize_mxl(path)
    assert "removed_unmatched_spanners:1" in fixes
    with zipfile.ZipFile(path) as z:
        assert sorted(z.namelist()) == ["META-INF/container.xml", "score.xml"]
        cleaned = ET.fromstring(z.read("score.xml"))
    assert cleaned.find(".//wedge") is None
    assert cleaned.find("part/measure/attributes/time") is not None


def test_sanitize_mxl_clean_file_untouched(tmp_path):
    xml = ET.tostring(_score(NOTE, attrs=f"<divisions>4</divisions>{TIME}"))
    path = tmp_path / "score.mxl"
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("score.xml", xml)
    before = path.read_bytes()
    assert sanitize_mxl(path) == []
    assert path.read_bytes() == before
