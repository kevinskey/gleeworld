def validate_score(score) -> list[dict]:
    warnings = []
    counts = {len(p.getElementsByClass("Measure")) for p in score.parts}
    if len(counts) > 1:
        warnings.append({"code": "measure_count_mismatch", "severity": "warning",
                         "message": f"Parts disagree on measure count: {sorted(counts)}"})
    if not score.recurse().getElementsByClass("MetronomeMark"):
        warnings.append({"code": "no_tempo", "severity": "warning",
                         "message": "No tempo marking found — rendering will assume 100 bpm."})
    try:
        score.expandRepeats()
    except Exception as e:
        warnings.append({"code": "repeats_unexpandable", "severity": "warning",
                         "message": f"Repeat structure could not be expanded: {e}"})
    return warnings
