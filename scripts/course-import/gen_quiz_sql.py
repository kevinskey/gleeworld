#!/usr/bin/env python3
"""Emit the quiz-bank migration from quizzes.json."""
import json
from pathlib import Path

d = json.load(open("quizzes.json"))

# Which module each quiz belongs to, following the structure migration's
# chapter groupings. Quiz N tests chapter N.
CH_TO_MODULE = {
    1: "mass-w01", 2: "mass-w02", 3: "mass-w02",
    4: "mass-w03", 5: "mass-w03", 6: "mass-w04", 7: "mass-w04", 8: "mass-w04",
    9: "mass-w05", 10: "mass-w06",
    11: "mass-w07", 12: "mass-w08", 13: "mass-w09", 14: "mass-w10",
    15: "mass-w11", 16: "mass-w11", 17: "mass-w11",
    18: "mass-w12", 19: "mass-w13", 20: "mass-w13", 21: "mass-w14",
}


def q(s):
    """Single-quote a SQL string literal."""
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def jsonb(v):
    if v is None:
        return "NULL"
    return q(json.dumps(v, ensure_ascii=False)) + "::jsonb"


def answer_sql(qtype, ans):
    if qtype == "multiple_choice" and ans in ("a", "b", "c", "d"):
        return jsonb(ans)
    if qtype == "true_false" and isinstance(ans, bool):
        return jsonb(ans)
    return "NULL"  # short answer — graded by the instructor


rows = []          # (test_key, position, qtype, prompt, options, answer, expl, points)
tests = []         # (test_key, title, description, instructions, type, points, minutes)

for quiz in d["quizzes"]:
    n = quiz["quiz"]
    key = f"mass-quiz-{n:02d}"
    keys = d["keys"][str(n)]
    pts = len(quiz["questions"])
    tests.append((
        key,
        f"Quiz {n} — {quiz['title']}",
        f"Chapter {n} of Understanding the Mass. {pts} questions, {pts} points.",
        "Multiple choice and true/false grade automatically. Short answers are "
        "read by the instructor — answer in a sentence or two; the model answer "
        "is released with your grade.",
        "quiz", pts, 20,
        CH_TO_MODULE.get(n),
    ))
    for i, question in enumerate(quiz["questions"]):
        ans, expl = keys.get(str(question["number"]), (None, None))
        rows.append((key, i, question["type"], question["prompt"],
                     question["options"], answer_sql(question["type"], ans),
                     expl, 1))

# Final examination, Sections I-III. Section IV (essays) ships as an
# assignment in the structure migration — prose essays cannot auto-grade.
FINAL = "mass-final-exam"
fk = d["final_keys"]
final_pts = sum(qq["points"] for s in d["final_sections"] for qq in s["questions"])
tests.append((
    FINAL,
    "Final Examination — Sections I–III",
    f"Comprehensive final covering the whole handbook. {final_pts} points here; "
    "Section IV (four essays, 60 points) is submitted as an assignment. 200 total.",
    "Time: 3 hours for the complete examination including the essays. "
    "Passing is 150 of 200 (75%). Multiple choice and true/false grade "
    "automatically; short answers are read by the instructor.",
    "exam", final_pts, 180, "mass-w15",
))
pos = 0
for sec in d["final_sections"]:
    for question in sec["questions"]:
        ans, expl = fk.get(str(question["number"]), (None, None))
        rows.append((FINAL, pos, question["type"], question["prompt"],
                     question["options"], answer_sql(question["type"], ans),
                     expl, question["points"]))
        pos += 1

out = []
w = out.append
w("""-- Bowman Scholars (MUS-240), Fall 2026 — quiz bank.
--
-- 21 chapter quizzes (210 questions) and the comprehensive final examination
-- Sections I-III (65 questions), transcribed from Chapters 22-24 of
-- "Understanding the Mass." Answers come from the handbook's own answer keys;
-- where a key is prose, the question is instructor-graded and the key text is
-- stored as the explanation released with the grade.
--
-- Section IV of the final (four essays, 60 points) is NOT here — it ships as
-- an assignment in 20260806140000_bowman_mass_handbook_structure.sql, because
-- prose essays cannot auto-grade.
--
-- Companion to that structure migration; apply it FIRST (this one reuses its
-- module keys for placement, and fails loudly if the course is missing).
--
-- SAFE TO RE-RUN. Tests are keyed on a stable title; a re-run replaces each
-- test's questions wholesale rather than appending duplicates.

DO $$
DECLARE
  v_course_id uuid;
  v_tenant_id uuid;
  v_test_id   uuid;
BEGIN
  SELECT id, tenant_id INTO v_course_id, v_tenant_id
  FROM public.gw_courses
  WHERE (course_code = 'MUS-240' OR code = 'MUS-240')
    AND (semester ILIKE '%Fall%2026%' OR term ILIKE '%Fall%2026%')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Bowman Scholars MUS-240 Fall 2026 not found; apply the structure migration first.';
  END IF;
""")

for (key, title, desc, instr, ttype, points, minutes, module) in tests:
    w(f"""
  -- ---------------------------------------------------------------
  -- {title}
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = {q(title)};

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, {q(title)}, {q(desc)}, {q(instr)},
            {q(ttype)}, {points}, {minutes},
            {'true' if ttype == 'quiz' else 'false'},
            {2 if ttype == 'quiz' else 1},
            {'true' if ttype == 'quiz' else 'false'}, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = {q(desc)}, instructions = {q(instr)},
           total_points = {points}, duration_minutes = {minutes}, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;
""")
    qrows = [r for r in rows if r[0] == key]
    w("  INSERT INTO public.gw_course_test_questions")
    w("    (test_id, position, question_type, prompt, options, correct_answer,"
      " explanation, points, tenant_id)")
    w("  VALUES")
    vals = []
    for (_k, position, qtype, prompt, options, ans, expl, pts) in qrows:
        opts = None
        if options:
            opts = [{"id": o["id"], "text": o["text"]} for o in options]
        vals.append(
            f"    (v_test_id, {position}, {q(qtype)}, {q(prompt)}, {jsonb(opts)}, "
            f"{ans}, {q(expl)}, {pts}, v_tenant_id)"
        )
    w(",\n".join(vals) + ";")

w("""
  RAISE NOTICE 'Quiz bank seeded for course %', v_course_id;
END $$;
""")

sql = "\n".join(out)
Path("quiz_bank.sql").write_text(sql)
print(f"wrote quiz_bank.sql — {len(tests)} tests, {len(rows)} questions, {len(sql)} bytes")
mc = sum(1 for r in rows if r[2] == "multiple_choice")
tf = sum(1 for r in rows if r[2] == "true_false")
sa = sum(1 for r in rows if r[2] == "short_answer")
auto = sum(1 for r in rows if r[5] != "NULL")
print(f"  types: mc={mc} tf={tf} short={sa}")
print(f"  auto-graded: {auto}/{len(rows)}  instructor-graded: {len(rows)-auto}")
