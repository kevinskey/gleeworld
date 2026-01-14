-- Delete all Week-based and old Finals Week generic assignments for MUS 210
DELETE FROM gw_assignments 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' 
AND (category LIKE 'Week%' OR category = 'Finals Week');

-- Now update the Phase-based assignments with proper Spring 2026 dates
-- Phase I: Jan 14 – Feb 4
UPDATE gw_assignments SET due_at = '2026-01-21 23:59:00-05' WHERE id = '091ea657-67a2-4788-af73-389ff18a80db'; -- Conducting Video #1
UPDATE gw_assignments SET due_at = '2026-01-28 23:59:00-05' WHERE id = '974511e9-c3e2-437e-ad1f-025f371fe7f3'; -- Conducting Video #2
UPDATE gw_assignments SET due_at = '2026-02-04 23:59:00-05' WHERE id = 'bdcba4c5-2e33-47c7-8ecb-3fd91d04a2ae'; -- Mirror Drill Log
UPDATE gw_assignments SET due_at = '2026-02-04 17:00:00-05' WHERE id = '78b619fe-a567-4a22-9e1f-7d8341180c52'; -- Technique Jury #1

-- Phase II: Feb 9 – Feb 18
UPDATE gw_assignments SET due_at = '2026-02-11 23:59:00-05' WHERE id = 'c16518c8-5f66-43b0-9775-7d5a88d2c88e'; -- Final Major Work Selection
UPDATE gw_assignments SET due_at = '2026-02-18 23:59:00-05' WHERE id = 'b10311c7-16ba-40e2-8b25-f929c7b6549d'; -- Score Marking
UPDATE gw_assignments SET due_at = '2026-02-18 23:59:00-05' WHERE id = 'fe968f0c-2376-49dd-a3e8-1b562200baa4'; -- Score Memory Progress Check #1

-- Phase III: Feb 23 – Mar 6 (Spring Break Mar 9-13)
UPDATE gw_assignments SET due_at = '2026-02-23 12:00:00-05' WHERE id = 'ab7ed4df-5336-4fcb-a37d-c2620ea59212'; -- Rehearsal Plan
UPDATE gw_assignments SET due_at = '2026-02-23 12:00:00-05' WHERE id = '56bab97b-1a56-4625-984e-af00a0b76064'; -- Marked Score
UPDATE gw_assignments SET due_at = '2026-02-25 23:59:00-05' WHERE id = '4e7c67c0-979a-4813-ae1a-0261f68b3674'; -- Practicum Video #1
UPDATE gw_assignments SET due_at = '2026-02-27 23:59:00-05' WHERE id = '418f8679-8b2e-4fd3-8ad5-a6d90abb3aa6'; -- Practicum Video #2
UPDATE gw_assignments SET due_at = '2026-03-02 23:59:00-05' WHERE id = 'f2bdca1f-ce63-4bf4-8099-6b4254547a1d'; -- Practicum Video #3
UPDATE gw_assignments SET due_at = '2026-03-04 23:59:00-05' WHERE id = '83c08bc7-19f7-4ac4-9451-7457e4b75b50'; -- Practicum Video #4
UPDATE gw_assignments SET due_at = '2026-03-06 23:59:00-05' WHERE id = '0051fa61-d4c7-4f0e-925e-18ee713f732b'; -- Post-Rehearsal Reflection

-- Phase IV: Mar 16 – Apr 1
UPDATE gw_assignments SET due_at = '2026-03-20 23:59:00-04' WHERE id = 'dc80d494-1724-44cc-860c-0b810ea5ebc0'; -- Rubato & Fermata Video
UPDATE gw_assignments SET due_at = '2026-03-27 23:59:00-04' WHERE id = '8d2593e9-ebd9-4213-b4c7-fe0541ad9a31'; -- Mixed Meter Video
UPDATE gw_assignments SET due_at = '2026-03-31 23:59:00-04' WHERE id = 'a0b99d65-7411-44c4-bad9-cc1857ac4a23'; -- Melding Exercise
UPDATE gw_assignments SET due_at = '2026-04-01 17:00:00-04' WHERE id = 'd7e3c42e-ee20-4665-a71d-06fbfc1c76b2'; -- Technique Jury #2

-- Phase V: Apr 6 – Apr 22
UPDATE gw_assignments SET due_at = '2026-04-10 23:59:00-04' WHERE id = 'fbda2ad9-2000-40b7-846e-1f3a081babdc'; -- Score Memory Check #2
UPDATE gw_assignments SET due_at = '2026-04-15 23:59:00-04' WHERE id = 'e5e8edff-913a-4463-b9e9-0fb59b872299'; -- Cue Accuracy Drill
UPDATE gw_assignments SET due_at = '2026-04-22 23:59:00-04' WHERE id = 'adb3fb20-7587-4bfb-bcea-5c86294d46cd'; -- Full Run-Through

-- Phase VI: Final Jury Apr 29
UPDATE gw_assignments SET due_at = '2026-04-29 17:00:00-04' WHERE id = '2b7a91f7-b1c8-4b0e-933b-e76141872a39'; -- Final Jury