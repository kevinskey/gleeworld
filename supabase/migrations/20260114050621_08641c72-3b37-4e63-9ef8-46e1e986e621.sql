-- Update MUS 210 assignments to use weekly categories based on their due dates

-- Week 1: Jan 14-20
UPDATE gw_assignments SET category = 'Week 1: Jan 14–20' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-01-14' AND due_at < '2026-01-21';

-- Week 2: Jan 21-27
UPDATE gw_assignments SET category = 'Week 2: Jan 21–27' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-01-21' AND due_at < '2026-01-28';

-- Week 3: Jan 28-Feb 3
UPDATE gw_assignments SET category = 'Week 3: Jan 28–Feb 3' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-01-28' AND due_at < '2026-02-04';

-- Week 4: Feb 4-10
UPDATE gw_assignments SET category = 'Week 4: Feb 4–10' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-02-04' AND due_at < '2026-02-11';

-- Week 5: Feb 11-17
UPDATE gw_assignments SET category = 'Week 5: Feb 11–17' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-02-11' AND due_at < '2026-02-18';

-- Week 6: Feb 18-24
UPDATE gw_assignments SET category = 'Week 6: Feb 18–24' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-02-18' AND due_at < '2026-02-25';

-- Week 7: Feb 25-Mar 3
UPDATE gw_assignments SET category = 'Week 7: Feb 25–Mar 3' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-02-25' AND due_at < '2026-03-04';

-- Week 8: Mar 4-10
UPDATE gw_assignments SET category = 'Week 8: Mar 4–10' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-03-04' AND due_at < '2026-03-11';

-- Week 9: Mar 11-17 (Spring Break)
UPDATE gw_assignments SET category = 'Week 9: Mar 11–17 (Spring Break)' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-03-11' AND due_at < '2026-03-18';

-- Week 10: Mar 18-24
UPDATE gw_assignments SET category = 'Week 10: Mar 18–24' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-03-18' AND due_at < '2026-03-25';

-- Week 11: Mar 25-31
UPDATE gw_assignments SET category = 'Week 11: Mar 25–31' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-03-25' AND due_at < '2026-04-01';

-- Week 12: Apr 1-7
UPDATE gw_assignments SET category = 'Week 12: Apr 1–7' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-04-01' AND due_at < '2026-04-08';

-- Week 13: Apr 8-14
UPDATE gw_assignments SET category = 'Week 13: Apr 8–14' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-04-08' AND due_at < '2026-04-15';

-- Week 14: Apr 15-21
UPDATE gw_assignments SET category = 'Week 14: Apr 15–21' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-04-15' AND due_at < '2026-04-22';

-- Week 15: Apr 22-28
UPDATE gw_assignments SET category = 'Week 15: Apr 22–28' 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND due_at >= '2026-04-22' AND due_at < '2026-04-29';