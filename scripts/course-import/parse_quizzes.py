#!/usr/bin/env python3
"""Parse the handbook's Chapters 22-24 into structured quiz JSON.

Chapter 22 = 21 chapter quizzes, 10 questions each.
Chapter 23 = final exam, Sections I-IV.
Chapter 24 = answer keys for all of the above.

Output is validated by count before anything is emitted; a silent partial
parse producing 180 of 210 questions would be worse than a hard failure,
because nobody re-counts a file that looks plausible.
"""
import json
import re
import sys
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "mass-full.txt")
text = SRC.read_text(encoding="utf-8")
# pdftotext emits a form feed at every page break, and it lands GLUED to the
# first line of the new page ("\x0cChapter 23. Final Examination"). Any
# ^-anchored heading match silently fails on those lines, which is how Quiz 21
# swallowed the rest of the document. Strip them before anything else looks.
text = text.replace("\x0c", "")
lines = text.split("\n")

# ---------------------------------------------------------------- helpers

# Page furniture that pdftotext leaves interleaved with the content.
NOISE = re.compile(
    r"^\s*(\d{1,3}|Chapter 2[234]\..*|Quiz \d+ — .*\.\s*\.\s*\..*|"
    r"Key — .*\.\s*\.\s*\..*|Section [IV]+ — .*\.\s*\.\s*\..*)\s*$"
)

def clean(seq):
    """Drop page numbers and running heads, join hyphenated line breaks."""
    out = []
    for ln in seq:
        if NOISE.match(ln):
            continue
        if ln.strip() in ("", "Chapter 22. Chapter Quizzes",
                          "Chapter 23. Final Examination",
                          "Chapter 24. Answer Keys"):
            continue
        out.append(ln.rstrip())
    return out

# The table of contents repeats every heading with dot leaders ("Quiz 1 — ...
# . . . . 111"). Those lines match the same patterns as the real headings, so
# every block() call was slicing the TOC and finding zero questions. A heading
# is only real if it has no dot leaders.
DOTS = re.compile(r"\.\s*\.\s*\.")

def is_heading(ln, pat):
    return bool(re.match(pat, ln)) and not DOTS.search(ln)

def block(start_pat, end_pat, start_from=0):
    """Lines strictly between the first real start_pat and the next end_pat."""
    s = e = None
    for i in range(start_from, len(lines)):
        if s is None and is_heading(lines[i], start_pat):
            s = i + 1
        elif s is not None and is_heading(lines[i], end_pat):
            e = i
            break
    if s is None:
        raise SystemExit(f"start pattern never matched outside the TOC: {start_pat}")
    return clean(lines[s:e if e else len(lines)])

# Question numbering restarts per quiz; items wrap across lines.
ITEM = re.compile(r"^(\d{1,3})\.\s*(.*)$")
# Options appear one-per-line ("a) text") or inline ("a) 7 b) 10 c) 14").
OPT_LINE = re.compile(r"^([a-d])\)\s+(.*)$")
OPT_INLINE = re.compile(r"([a-d])\)\s*([^)]*?)(?=\s+[a-d]\)|$)")

def split_items(seq):
    """Group a cleaned line list into (number, [lines]) items."""
    items, num, buf = [], None, []
    for ln in seq:
        m = ITEM.match(ln)
        if m:
            if num is not None:
                items.append((num, buf))
            num, buf = int(m.group(1)), [m.group(2)]
        elif num is not None:
            buf.append(ln)
    if num is not None:
        items.append((num, buf))
    return items

def parse_question(num, body, force_type=None):
    """Infer question type and pull options out of the prompt."""
    joined = " ".join(b.strip() for b in body if b.strip())
    joined = re.sub(r"\s+", " ", joined).strip()

    options, opt_lines = [], []
    in_opts = False
    for ln in body:
        m = OPT_LINE.match(ln.strip())
        if m:
            opt_lines.append([m.group(1), m.group(2).strip()])
            in_opts = True
        elif in_opts and ln.strip():
            # Continuation of the previous option's wrapped text.
            opt_lines[-1][1] = (opt_lines[-1][1] + " " + ln.strip()).strip()
    opt_lines = [(k, v) for k, v in opt_lines]

    if opt_lines:
        # A single "option line" may actually carry all four inline.
        if len(opt_lines) == 1 and re.search(r"\s[b-d]\)\s", opt_lines[0][1]):
            whole = f"{opt_lines[0][0]}) {opt_lines[0][1]}"
            opt_lines = [(k, v.strip()) for k, v in OPT_INLINE.findall(whole)]
        options = opt_lines
        # Remove the option text from the prompt.
        first = body.index(next(l for l in body if OPT_LINE.match(l.strip())))
        prompt = " ".join(b.strip() for b in body[:first])
    else:
        found = OPT_INLINE.findall(joined)
        if len(found) >= 3:  # inline a) .. b) .. c) .. d)
            options = [(k, v.strip()) for k, v in found]
            prompt = joined[: joined.index("a)")].strip()
        else:
            prompt = joined

    prompt = re.sub(r"\s+", " ", prompt).strip()

    if options:
        qtype = "multiple_choice"
    elif re.match(r"^(True or False|True/False)\b", prompt, re.I):
        qtype = "true_false"
        prompt = re.sub(r"^(True or False\.?|True/False\.?)\s*", "", prompt, flags=re.I)
    else:
        qtype = "short_answer"

    # Strip the leading label the handbook uses on some items.
    prompt = re.sub(r"^(Multiple choice|Short answer|Fill in the blank)\.\s*", "",
                    prompt, flags=re.I)

    if force_type:
        qtype = force_type

    return {
        "number": num,
        "type": qtype,
        "prompt": prompt,
        "options": [{"id": k, "text": v} for k, v in options] or None,
    }

def parse_key_item(body, qtype):
    """Return (answer, explanation) for one key entry, read AGAINST its question type.

    Inferring the key's type independently is wrong: quiz 2's key for a
    short-answer question reads "c. AD 155. Readings from the apostles..."
    where "c." is a sub-label, and a type-blind parser scores it as
    multiple-choice answer 'c'. The question decides how its key is read.
    """
    joined = re.sub(r"\s+", " ", " ".join(b.strip() for b in body)).strip()

    if qtype == "multiple_choice":
        m = re.match(r"^([a-d])\b[.,)]?\s*(.*)$", joined)
        if m:
            return m.group(1), (m.group(2).strip() or None)
        return None, joined  # malformed; surfaced by validation below

    if qtype == "true_false":
        m = re.match(r"^(True|False)\b\.?\s*(.*)$", joined, re.I)
        if m:
            return m.group(1).lower() == "true", (m.group(2).strip() or None)
        # The final examination's key uses bare T / F rather than the words.
        m = re.match(r"^([TF])\b\.?\s*(.*)$", joined)
        if m:
            return m.group(1) == "T", (m.group(2).strip() or None)
        return None, joined

    # short_answer: the key text IS the model answer; graded by the instructor.
    return None, joined

# ---------------------------------------------------------------- parse

QUIZ_TITLES = {}
for ln in lines:
    m = re.match(r"^Quiz (\d+) — (.+?)(?:\s*\.\s*\.|$)", ln)
    if m and int(m.group(1)) not in QUIZ_TITLES:
        QUIZ_TITLES[int(m.group(1))] = m.group(2).strip()

quizzes = []
for n in range(1, 22):
    # Quiz 21 must end at Chapter 23, NOT at "^Short answer\." — its own
    # question 9 begins with that literal label, so the old pattern
    # truncated the block mid-question and produced an empty prompt.
    end = rf"^Quiz {n+1} — " if n < 21 else r"^Chapter 23\."
    body = block(rf"^Quiz {n} — ", end)
    qs = [parse_question(num, b) for num, b in split_items(body)]
    quizzes.append({"quiz": n, "title": QUIZ_TITLES.get(n, f"Quiz {n}"), "questions": qs})

qtype_of = {q["quiz"]: {x["number"]: x["type"] for x in q["questions"]} for q in quizzes}

keys = {}
for n in range(1, 22):
    end = rf"^Key — Quiz {n+1}\s*$" if n < 21 else r"^Key — Final Examination\s*$"
    body = block(rf"^Key — Quiz {n}\s*$", end)
    keys[n] = {
        num: parse_key_item(b, qtype_of[n].get(num, "short_answer"))
        for num, b in split_items(body)
    }

# Final exam sections I-III (IV is an essay assignment, not an auto-graded test).
final_sections = []
for label, pat, endpat, pts in [
    ("Multiple Choice", r"^Section I — Multiple Choice", r"^Section II — True or False", 2),
    ("True or False", r"^Section II — True or False", r"^Section III — Short Answer", 1),  # noqa
    ("Short Answer", r"^Section III — Short Answer", r"^Section IV — Essay", 4),
]:
    body = block(pat, endpat)
    forced = {"True or False": "true_false", "Short Answer": "short_answer"}.get(label)
    qs = [parse_question(num, b, force_type=forced) for num, b in split_items(body)]
    for q in qs:
        q["points"] = pts
    final_sections.append({"section": label, "questions": qs})

# Final examination key. Sections I and II are printed in a THREE-COLUMN
# layout that pdftotext interleaves (1, 11, 21 / 2, 12, 22 / ...), so the
# numbering arrives out of order. Each "N. answer" pair survives intact, so
# order is irrelevant — but contiguity checks are, and would false-alarm here.
final_keys = {}
_fk_types = {}
for sec in final_sections:
    for q in sec["questions"]:
        _fk_types[q["number"]] = q["type"]

for label, pat, endpat in [
    ("I", r"^Section I — Multiple Choice\s*$", r"^Section II — True or False\s*$"),
    ("II", r"^Section II — True or False\s*$", r"^Section III — Short Answer\s*$"),
    ("III", r"^Section III — Short Answer\s*$", r"^Section IV — Essay\s*$"),
]:
    try:
        start = next(i for i, l in enumerate(lines)
                     if is_heading(l, r"^Key — Final Examination\s*$"))
    except StopIteration:
        raise SystemExit("final examination key not found")
    body = block(pat, endpat, start_from=start)
    for num, b in split_items(body):
        final_keys[num] = parse_key_item(b, _fk_types.get(num, "short_answer"))

# ---------------------------------------------------------------- validate

problems = []
for q in quizzes:
    nums = [x["number"] for x in q["questions"]]
    if nums != list(range(1, len(nums) + 1)):
        problems.append(f"Quiz {q['quiz']}: non-contiguous numbering {nums}")
    for question in q["questions"]:
        opts = question["options"] or []
        if question["type"] == "multiple_choice" and len(opts) < 2:
            problems.append(f"Quiz {q['quiz']} Q{question['number']}: MC with <2 options")
        for o in opts:
            if re.search(r"\b(from|of|the|and|to|in|which|that|by|for|with)$", o["text"].rstrip()):
                problems.append(
                    f"Quiz {q['quiz']} Q{question['number']}: option {o['id']} truncated mid-clause")
            if re.search(r"\s[b-d]\)\s", o["text"]):
                problems.append(
                    f"Quiz {q['quiz']} Q{question['number']}: option {o['id']} swallowed siblings")
        if not question["prompt"]:
            problems.append(f"Quiz {q['quiz']} Q{question['number']}: empty prompt")
    missing = [x["number"] for x in q["questions"] if x["number"] not in keys[q["quiz"]]]
    if missing:
        problems.append(f"Quiz {q['quiz']}: no key for questions {missing}")

expected = {"Multiple Choice": 30, "True or False": 20, "Short Answer": 15}
for s in final_sections:
    if len(s["questions"]) != expected[s["section"]]:
        problems.append(
            f"Final {s['section']}: {len(s['questions'])} questions, expected {expected[s['section']]}"
        )

total_quiz = sum(len(q["questions"]) for q in quizzes)
total_final = sum(len(s["questions"]) for s in final_sections)

print(f"chapter quizzes : {len(quizzes)} quizzes, {total_quiz} questions (expect 21 / 210)")
print(f"final exam I-III: {total_final} questions (expect 65)")
by_type = {}
for q in quizzes:
    for question in q["questions"]:
        by_type[question["type"]] = by_type.get(question["type"], 0) + 1
print(f"quiz types      : {by_type}")

# Final-key coverage, by section range.
for lo, hi, want, label in [(1, 30, "mc", "Section I"), (31, 50, "tf", "Section II"),
                            (51, 65, "sa", "Section III")]:
    got = [n for n in range(lo, hi + 1) if n in final_keys]
    if len(got) != hi - lo + 1:
        problems.append(f"Final key {label}: {len(got)}/{hi-lo+1} answers found")
    if want == "mc":
        bad = [n for n in got if final_keys[n][0] not in ("a", "b", "c", "d")]
        if bad:
            problems.append(f"Final key {label}: non-letter answers at {bad[:8]}")
    if want == "tf":
        bad = [n for n in got if not isinstance(final_keys[n][0], bool)]
        if bad:
            problems.append(f"Final key {label}: non-boolean answers at {bad[:8]}")

print(f"final exam key  : {len(final_keys)} answers (expect 65)")

out = {"final_keys": {str(k): v for k, v in final_keys.items()},
       "quizzes": quizzes, "keys": {str(k): {str(n): v for n, v in d.items()}
                                     for k, d in keys.items()},
       "final_sections": final_sections}
Path("quizzes.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
print(f"\nwrote quizzes.json ({len(json.dumps(out))} bytes)")

# Printed LAST, after every check has appended, so a late check cannot be
# silently swallowed the way the final-key coverage check was.
if problems:
    print(f"\n{len(problems)} PROBLEM(S):")
    for pr in problems[:25]:
        print(f"  - {pr}")
    if len(problems) > 25:
        print(f"  ... and {len(problems)-25} more")
else:
    print("no problems")
sys.exit(1 if problems else 0)
