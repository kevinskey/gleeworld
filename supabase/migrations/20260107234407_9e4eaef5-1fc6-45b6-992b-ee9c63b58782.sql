-- Create Quiz 1: Fundamental Tempo & Dynamics (Week 3)
INSERT INTO glee_academy_tests (course_id, title, description, instructions, duration_minutes, total_points, passing_score, is_published, is_practice, allow_retakes, show_correct_answers, randomize_questions)
VALUES 
('2026c613-bda7-487a-a5d9-91e57c26a741', 'Glossary Quiz 1: Fundamental Tempo & Dynamics', 
 'Test your knowledge of basic tempo markings and dynamics terminology.', 
 'Select the correct definition for each musical term. You have 15 minutes to complete this quiz.', 
 15, 24, 70, true, false, true, true, true);

-- Get Quiz 1 ID and create questions
WITH quiz1 AS (
  SELECT id FROM glee_academy_tests WHERE title = 'Glossary Quiz 1: Fundamental Tempo & Dynamics' AND course_id = '2026c613-bda7-487a-a5d9-91e57c26a741'
)
INSERT INTO test_questions (test_id, question_type, question_text, points, display_order, required)
SELECT quiz1.id, 'multiple_choice', q.question_text, 2, q.display_order, true
FROM quiz1, (VALUES
  ('What does "Largo" mean?', 1),
  ('What does "Grave" mean?', 2),
  ('What does "Lento" mean?', 3),
  ('What does "Adagio" mean?', 4),
  ('What does "Andante" mean?', 5),
  ('What does "Moderato" mean?', 6),
  ('What does "Allegro" mean?', 7),
  ('What does "Accelerando" mean?', 8),
  ('What does "Ritardando" mean?', 9),
  ('What does "Pianissimo (pp)" mean?', 10),
  ('What does "Piano (p)" mean?', 11),
  ('What does "Mezzo forte (mf)" mean?', 12)
) AS q(question_text, display_order);

-- Quiz 1 Answer Options
WITH quiz1_questions AS (
  SELECT tq.id, tq.question_text 
  FROM test_questions tq
  JOIN glee_academy_tests t ON tq.test_id = t.id
  WHERE t.title = 'Glossary Quiz 1: Fundamental Tempo & Dynamics'
)
INSERT INTO test_answer_options (question_id, option_text, is_correct, display_order)
SELECT q.id, a.option_text, a.is_correct, a.display_order
FROM quiz1_questions q
JOIN (VALUES
  -- Largo
  ('What does "Largo" mean?', 'Very slow and broad (≈ 40–60 BPM)', true, 1),
  ('What does "Largo" mean?', 'Fast and bright', false, 2),
  ('What does "Largo" mean?', 'Moderate speed', false, 3),
  ('What does "Largo" mean?', 'Walking pace', false, 4),
  -- Grave
  ('What does "Grave" mean?', 'Very slow and solemn (≈ 25–45 BPM)', true, 1),
  ('What does "Grave" mean?', 'Lively and quick', false, 2),
  ('What does "Grave" mean?', 'Moderately loud', false, 3),
  ('What does "Grave" mean?', 'Gradually speeding up', false, 4),
  -- Lento
  ('What does "Lento" mean?', 'Slow (≈ 45–60 BPM)', true, 1),
  ('What does "Lento" mean?', 'Very fast', false, 2),
  ('What does "Lento" mean?', 'Very soft', false, 3),
  ('What does "Lento" mean?', 'Smooth and connected', false, 4),
  -- Adagio
  ('What does "Adagio" mean?', 'Slow, at ease (≈ 55–72 BPM)', true, 1),
  ('What does "Adagio" mean?', 'As fast as possible', false, 2),
  ('What does "Adagio" mean?', 'Gradually getting softer', false, 3),
  ('What does "Adagio" mean?', 'Short and detached', false, 4),
  -- Andante
  ('What does "Andante" mean?', 'Walking pace, moderate (≈ 72–108 BPM)', true, 1),
  ('What does "Andante" mean?', 'Very slow and broad', false, 2),
  ('What does "Andante" mean?', 'Very loud', false, 3),
  ('What does "Andante" mean?', 'Gradually slowing down', false, 4),
  -- Moderato
  ('What does "Moderato" mean?', 'Moderate speed (≈ 108–120 BPM)', true, 1),
  ('What does "Moderato" mean?', 'Very slow and solemn', false, 2),
  ('What does "Moderato" mean?', 'Very soft', false, 3),
  ('What does "Moderato" mean?', 'With fire', false, 4),
  -- Allegro
  ('What does "Allegro" mean?', 'Fast, bright, cheerful (≈ 120–156 BPM)', true, 1),
  ('What does "Allegro" mean?', 'Slow, at ease', false, 2),
  ('What does "Allegro" mean?', 'Soft', false, 3),
  ('What does "Allegro" mean?', 'Holding back', false, 4),
  -- Accelerando
  ('What does "Accelerando" mean?', 'Gradually speeding up', true, 1),
  ('What does "Accelerando" mean?', 'Gradually slowing down', false, 2),
  ('What does "Accelerando" mean?', 'Very loud', false, 3),
  ('What does "Accelerando" mean?', 'Slow tempo', false, 4),
  -- Ritardando
  ('What does "Ritardando" mean?', 'Gradually slowing down', true, 1),
  ('What does "Ritardando" mean?', 'Gradually speeding up', false, 2),
  ('What does "Ritardando" mean?', 'Very soft', false, 3),
  ('What does "Ritardando" mean?', 'Fast and lively', false, 4),
  -- Pianissimo
  ('What does "Pianissimo (pp)" mean?', 'Very soft', true, 1),
  ('What does "Pianissimo (pp)" mean?', 'Very loud', false, 2),
  ('What does "Pianissimo (pp)" mean?', 'Moderate speed', false, 3),
  ('What does "Pianissimo (pp)" mean?', 'Walking pace', false, 4),
  -- Piano
  ('What does "Piano (p)" mean?', 'Soft', true, 1),
  ('What does "Piano (p)" mean?', 'Loud', false, 2),
  ('What does "Piano (p)" mean?', 'Fast', false, 3),
  ('What does "Piano (p)" mean?', 'Slow', false, 4),
  -- Mezzo forte
  ('What does "Mezzo forte (mf)" mean?', 'Moderately loud', true, 1),
  ('What does "Mezzo forte (mf)" mean?', 'Very soft', false, 2),
  ('What does "Mezzo forte (mf)" mean?', 'Extremely fast', false, 3),
  ('What does "Mezzo forte (mf)" mean?', 'Gradually slowing', false, 4)
) AS a(question_text, option_text, is_correct, display_order) ON q.question_text = a.question_text;

-- Create Quiz 2: Advanced Tempo Changes, Dynamics & Articulation (Week 6)
INSERT INTO glee_academy_tests (course_id, title, description, instructions, duration_minutes, total_points, passing_score, is_published, is_practice, allow_retakes, show_correct_answers, randomize_questions)
VALUES 
('2026c613-bda7-487a-a5d9-91e57c26a741', 'Glossary Quiz 2: Advanced Tempo Changes, Dynamics & Articulation', 
 'Test your knowledge of advanced tempo, dynamics, and articulation terminology.', 
 'Select the correct definition for each musical term. You have 15 minutes to complete this quiz.', 
 15, 26, 70, true, false, true, true, true);

-- Quiz 2 Questions
WITH quiz2 AS (
  SELECT id FROM glee_academy_tests WHERE title = 'Glossary Quiz 2: Advanced Tempo Changes, Dynamics & Articulation' AND course_id = '2026c613-bda7-487a-a5d9-91e57c26a741'
)
INSERT INTO test_questions (test_id, question_type, question_text, points, display_order, required)
SELECT quiz2.id, 'multiple_choice', q.question_text, 2, q.display_order, true
FROM quiz2, (VALUES
  ('What does "Andantino" mean?', 1),
  ('What does "Allegretto" mean?', 2),
  ('What does "Vivace" mean?', 3),
  ('What does "Presto" mean?', 4),
  ('What does "Prestissimo" mean?', 5),
  ('What does "Meno mosso" mean?', 6),
  ('What does "Più mosso" mean?', 7),
  ('What does "Sforzando (sfz)" mean?', 8),
  ('What does "Fortissimo (ff)" mean?', 9),
  ('What does "Diminuendo" mean?', 10),
  ('What does "Fortepiano (fp)" mean?', 11),
  ('What does "Legato" mean?', 12),
  ('What does "Staccato" mean?', 13)
) AS q(question_text, display_order);

-- Quiz 2 Answer Options
WITH quiz2_questions AS (
  SELECT tq.id, tq.question_text 
  FROM test_questions tq
  JOIN glee_academy_tests t ON tq.test_id = t.id
  WHERE t.title = 'Glossary Quiz 2: Advanced Tempo Changes, Dynamics & Articulation'
)
INSERT INTO test_answer_options (question_id, option_text, is_correct, display_order)
SELECT q.id, a.option_text, a.is_correct, a.display_order
FROM quiz2_questions q
JOIN (VALUES
  ('What does "Andantino" mean?', 'Slightly faster than andante', true, 1),
  ('What does "Andantino" mean?', 'Very slow and broad', false, 2),
  ('What does "Andantino" mean?', 'Extremely loud', false, 3),
  ('What does "Andantino" mean?', 'Short and detached', false, 4),
  ('What does "Allegretto" mean?', 'Moderately fast, lively', true, 1),
  ('What does "Allegretto" mean?', 'Very slow and solemn', false, 2),
  ('What does "Allegretto" mean?', 'Gradually getting softer', false, 3),
  ('What does "Allegretto" mean?', 'Heavy and weighted', false, 4),
  ('What does "Vivace" mean?', 'Lively, quick', true, 1),
  ('What does "Vivace" mean?', 'Slow, at ease', false, 2),
  ('What does "Vivace" mean?', 'Very soft', false, 3),
  ('What does "Vivace" mean?', 'Calm, tranquil', false, 4),
  ('What does "Presto" mean?', 'Very fast', true, 1),
  ('What does "Presto" mean?', 'Very slow', false, 2),
  ('What does "Presto" mean?', 'Moderately loud', false, 3),
  ('What does "Presto" mean?', 'Smooth and connected', false, 4),
  ('What does "Prestissimo" mean?', 'As fast as possible', true, 1),
  ('What does "Prestissimo" mean?', 'As slow as possible', false, 2),
  ('What does "Prestissimo" mean?', 'Moderate speed', false, 3),
  ('What does "Prestissimo" mean?', 'Walking pace', false, 4),
  ('What does "Meno mosso" mean?', 'Less movement, slower', true, 1),
  ('What does "Meno mosso" mean?', 'More movement, faster', false, 2),
  ('What does "Meno mosso" mean?', 'Very loud', false, 3),
  ('What does "Meno mosso" mean?', 'With fire', false, 4),
  ('What does "Più mosso" mean?', 'More movement, faster', true, 1),
  ('What does "Più mosso" mean?', 'Less movement, slower', false, 2),
  ('What does "Più mosso" mean?', 'Very soft', false, 3),
  ('What does "Più mosso" mean?', 'Gracefully', false, 4),
  ('What does "Sforzando (sfz)" mean?', 'Sudden strong accent', true, 1),
  ('What does "Sforzando (sfz)" mean?', 'Gradually getting louder', false, 2),
  ('What does "Sforzando (sfz)" mean?', 'Very slow tempo', false, 3),
  ('What does "Sforzando (sfz)" mean?', 'Smooth and connected', false, 4),
  ('What does "Fortissimo (ff)" mean?', 'Very loud', true, 1),
  ('What does "Fortissimo (ff)" mean?', 'Very soft', false, 2),
  ('What does "Fortissimo (ff)" mean?', 'Moderate speed', false, 3),
  ('What does "Fortissimo (ff)" mean?', 'Gradually slowing', false, 4),
  ('What does "Diminuendo" mean?', 'Gradually getting softer', true, 1),
  ('What does "Diminuendo" mean?', 'Gradually getting louder', false, 2),
  ('What does "Diminuendo" mean?', 'Very fast', false, 3),
  ('What does "Diminuendo" mean?', 'Short and detached', false, 4),
  ('What does "Fortepiano (fp)" mean?', 'Loud, then immediately soft', true, 1),
  ('What does "Fortepiano (fp)" mean?', 'Soft, then immediately loud', false, 2),
  ('What does "Fortepiano (fp)" mean?', 'Gradually speeding up', false, 3),
  ('What does "Fortepiano (fp)" mean?', 'Very slow tempo', false, 4),
  ('What does "Legato" mean?', 'Smooth and connected', true, 1),
  ('What does "Legato" mean?', 'Short and detached', false, 2),
  ('What does "Legato" mean?', 'Very loud', false, 3),
  ('What does "Legato" mean?', 'Gradually slowing', false, 4),
  ('What does "Staccato" mean?', 'Short and detached', true, 1),
  ('What does "Staccato" mean?', 'Smooth and connected', false, 2),
  ('What does "Staccato" mean?', 'Very soft', false, 3),
  ('What does "Staccato" mean?', 'Walking pace', false, 4)
) AS a(question_text, option_text, is_correct, display_order) ON q.question_text = a.question_text;

-- Create Quiz 3: Expression, Character & Navigation (Week 9)
INSERT INTO glee_academy_tests (course_id, title, description, instructions, duration_minutes, total_points, passing_score, is_published, is_practice, allow_retakes, show_correct_answers, randomize_questions)
VALUES 
('2026c613-bda7-487a-a5d9-91e57c26a741', 'Glossary Quiz 3: Expression, Character & Navigation', 
 'Test your knowledge of expressive markings, character indications, and navigation terms.', 
 'Select the correct definition for each musical term. You have 15 minutes to complete this quiz.', 
 15, 26, 70, true, false, true, true, true);

-- Quiz 3 Questions
WITH quiz3 AS (
  SELECT id FROM glee_academy_tests WHERE title = 'Glossary Quiz 3: Expression, Character & Navigation' AND course_id = '2026c613-bda7-487a-a5d9-91e57c26a741'
)
INSERT INTO test_questions (test_id, question_type, question_text, points, display_order, required)
SELECT quiz3.id, 'multiple_choice', q.question_text, 2, q.display_order, true
FROM quiz3, (VALUES
  ('What does "Espressivo" mean?', 1),
  ('What does "Cantabile" mean?', 2),
  ('What does "Dolce" mean?', 3),
  ('What does "Con brio" mean?', 4),
  ('What does "Con fuoco" mean?', 5),
  ('What does "Maestoso" mean?', 6),
  ('What does "Grazioso" mean?', 7),
  ('What does "Tranquillo" mean?', 8),
  ('What does "Animato" mean?', 9),
  ('What does "Leggiero" mean?', 10),
  ('What does "Pesante" mean?', 11),
  ('What does "Da Capo (D.C.)" mean?', 12),
  ('What does "Fermata" mean?', 13)
) AS q(question_text, display_order);

-- Quiz 3 Answer Options
WITH quiz3_questions AS (
  SELECT tq.id, tq.question_text 
  FROM test_questions tq
  JOIN glee_academy_tests t ON tq.test_id = t.id
  WHERE t.title = 'Glossary Quiz 3: Expression, Character & Navigation'
)
INSERT INTO test_answer_options (question_id, option_text, is_correct, display_order)
SELECT q.id, a.option_text, a.is_correct, a.display_order
FROM quiz3_questions q
JOIN (VALUES
  ('What does "Espressivo" mean?', 'With expression', true, 1),
  ('What does "Espressivo" mean?', 'Very fast', false, 2),
  ('What does "Espressivo" mean?', 'Very soft', false, 3),
  ('What does "Espressivo" mean?', 'Short and detached', false, 4),
  ('What does "Cantabile" mean?', 'In a singing style', true, 1),
  ('What does "Cantabile" mean?', 'Very loud', false, 2),
  ('What does "Cantabile" mean?', 'Gradually slowing', false, 3),
  ('What does "Cantabile" mean?', 'Heavy and weighted', false, 4),
  ('What does "Dolce" mean?', 'Sweetly, gently', true, 1),
  ('What does "Dolce" mean?', 'With fire', false, 2),
  ('What does "Dolce" mean?', 'Very fast', false, 3),
  ('What does "Dolce" mean?', 'Majestic', false, 4),
  ('What does "Con brio" mean?', 'With vigor, spirit', true, 1),
  ('What does "Con brio" mean?', 'Calm, tranquil', false, 2),
  ('What does "Con brio" mean?', 'Very slow', false, 3),
  ('What does "Con brio" mean?', 'Soft', false, 4),
  ('What does "Con fuoco" mean?', 'With fire, passionately', true, 1),
  ('What does "Con fuoco" mean?', 'Sweetly, gently', false, 2),
  ('What does "Con fuoco" mean?', 'Very soft', false, 3),
  ('What does "Con fuoco" mean?', 'Gracefully', false, 4),
  ('What does "Maestoso" mean?', 'Majestic, stately', true, 1),
  ('What does "Maestoso" mean?', 'Lightly, delicately', false, 2),
  ('What does "Maestoso" mean?', 'Very fast', false, 3),
  ('What does "Maestoso" mean?', 'Gradually speeding up', false, 4),
  ('What does "Grazioso" mean?', 'Gracefully', true, 1),
  ('What does "Grazioso" mean?', 'Heavy, weighty', false, 2),
  ('What does "Grazioso" mean?', 'Very loud', false, 3),
  ('What does "Grazioso" mean?', 'From the beginning', false, 4),
  ('What does "Tranquillo" mean?', 'Calm, tranquil', true, 1),
  ('What does "Tranquillo" mean?', 'Animated, lively', false, 2),
  ('What does "Tranquillo" mean?', 'With fire', false, 3),
  ('What does "Tranquillo" mean?', 'Very fast', false, 4),
  ('What does "Animato" mean?', 'Animated, lively', true, 1),
  ('What does "Animato" mean?', 'Calm, tranquil', false, 2),
  ('What does "Animato" mean?', 'Very slow', false, 3),
  ('What does "Animato" mean?', 'Soft', false, 4),
  ('What does "Leggiero" mean?', 'Lightly, delicately', true, 1),
  ('What does "Leggiero" mean?', 'Heavy, weighty', false, 2),
  ('What does "Leggiero" mean?', 'Very loud', false, 3),
  ('What does "Leggiero" mean?', 'Majestic', false, 4),
  ('What does "Pesante" mean?', 'Heavy, weighty', true, 1),
  ('What does "Pesante" mean?', 'Lightly, delicately', false, 2),
  ('What does "Pesante" mean?', 'Sweetly', false, 3),
  ('What does "Pesante" mean?', 'Very fast', false, 4),
  ('What does "Da Capo (D.C.)" mean?', 'From the beginning; repeat from the start', true, 1),
  ('What does "Da Capo (D.C.)" mean?', 'Hold or pause on a note', false, 2),
  ('What does "Da Capo (D.C.)" mean?', 'End of the piece', false, 3),
  ('What does "Da Capo (D.C.)" mean?', 'Skip to the next section', false, 4),
  ('What does "Fermata" mean?', 'Hold or pause on a note', true, 1),
  ('What does "Fermata" mean?', 'From the beginning', false, 2),
  ('What does "Fermata" mean?', 'Gradually speeding up', false, 3),
  ('What does "Fermata" mean?', 'Short and detached', false, 4)
) AS a(question_text, option_text, is_correct, display_order) ON q.question_text = a.question_text;

-- Create Quiz 4: German & French Vocabulary (Week 13)
INSERT INTO glee_academy_tests (course_id, title, description, instructions, duration_minutes, total_points, passing_score, is_published, is_practice, allow_retakes, show_correct_answers, randomize_questions)
VALUES 
('2026c613-bda7-487a-a5d9-91e57c26a741', 'Glossary Quiz 4: German & French Vocabulary', 
 'Test your knowledge of German and French musical terminology commonly found in choral scores.', 
 'Select the correct definition for each musical term. You have 15 minutes to complete this quiz.', 
 15, 24, 70, true, false, true, true, true);

-- Quiz 4 Questions
WITH quiz4 AS (
  SELECT id FROM glee_academy_tests WHERE title = 'Glossary Quiz 4: German & French Vocabulary' AND course_id = '2026c613-bda7-487a-a5d9-91e57c26a741'
)
INSERT INTO test_questions (test_id, question_type, question_text, points, display_order, required)
SELECT quiz4.id, 'multiple_choice', q.question_text, 2, q.display_order, true
FROM quiz4, (VALUES
  ('What does the German term "Ruhig" mean?', 1),
  ('What does the German term "Sehr" mean?', 2),
  ('What does the German term "Mit" mean?', 3),
  ('What does the German term "Etwas" mean?', 4),
  ('What does the German term "Breit" mean?', 5),
  ('What does the German term "Zurückhaltend" mean?', 6),
  ('What does the French term "Lent" mean?', 7),
  ('What does the French term "Vite" mean?', 8),
  ('What does the French term "Modéré" mean?', 9),
  ('What does the French term "Très" mean?', 10),
  ('What does the French term "Doux" mean?', 11),
  ('What does the French term "Cédez" mean?', 12)
) AS q(question_text, display_order);

-- Quiz 4 Answer Options
WITH quiz4_questions AS (
  SELECT tq.id, tq.question_text 
  FROM test_questions tq
  JOIN glee_academy_tests t ON tq.test_id = t.id
  WHERE t.title = 'Glossary Quiz 4: German & French Vocabulary'
)
INSERT INTO test_answer_options (question_id, option_text, is_correct, display_order)
SELECT q.id, a.option_text, a.is_correct, a.display_order
FROM quiz4_questions q
JOIN (VALUES
  ('What does the German term "Ruhig" mean?', 'Calm, peaceful', true, 1),
  ('What does the German term "Ruhig" mean?', 'Fast, lively', false, 2),
  ('What does the German term "Ruhig" mean?', 'Very loud', false, 3),
  ('What does the German term "Ruhig" mean?', 'Broad, wide', false, 4),
  ('What does the German term "Sehr" mean?', 'Very', true, 1),
  ('What does the German term "Sehr" mean?', 'With', false, 2),
  ('What does the German term "Sehr" mean?', 'Somewhat', false, 3),
  ('What does the German term "Sehr" mean?', 'Slow', false, 4),
  ('What does the German term "Mit" mean?', 'With', true, 1),
  ('What does the German term "Mit" mean?', 'Very', false, 2),
  ('What does the German term "Mit" mean?', 'Fast', false, 3),
  ('What does the German term "Mit" mean?', 'Calm', false, 4),
  ('What does the German term "Etwas" mean?', 'Somewhat', true, 1),
  ('What does the German term "Etwas" mean?', 'Very', false, 2),
  ('What does the German term "Etwas" mean?', 'Holding back', false, 3),
  ('What does the German term "Etwas" mean?', 'Broad', false, 4),
  ('What does the German term "Breit" mean?', 'Broad, wide', true, 1),
  ('What does the German term "Breit" mean?', 'Calm, peaceful', false, 2),
  ('What does the German term "Breit" mean?', 'Very', false, 3),
  ('What does the German term "Breit" mean?', 'Fast', false, 4),
  ('What does the German term "Zurückhaltend" mean?', 'Holding back', true, 1),
  ('What does the German term "Zurückhaltend" mean?', 'Moving forward', false, 2),
  ('What does the German term "Zurückhaltend" mean?', 'Very loud', false, 3),
  ('What does the German term "Zurückhaltend" mean?', 'Calm', false, 4),
  ('What does the French term "Lent" mean?', 'Slow', true, 1),
  ('What does the French term "Lent" mean?', 'Fast', false, 2),
  ('What does the French term "Lent" mean?', 'Moderate', false, 3),
  ('What does the French term "Lent" mean?', 'Sweet', false, 4),
  ('What does the French term "Vite" mean?', 'Fast', true, 1),
  ('What does the French term "Vite" mean?', 'Slow', false, 2),
  ('What does the French term "Vite" mean?', 'Very', false, 3),
  ('What does the French term "Vite" mean?', 'Sweet', false, 4),
  ('What does the French term "Modéré" mean?', 'Moderate', true, 1),
  ('What does the French term "Modéré" mean?', 'Very fast', false, 2),
  ('What does the French term "Modéré" mean?', 'Very slow', false, 3),
  ('What does the French term "Modéré" mean?', 'Yield', false, 4),
  ('What does the French term "Très" mean?', 'Very', true, 1),
  ('What does the French term "Très" mean?', 'With', false, 2),
  ('What does the French term "Très" mean?', 'Slow', false, 3),
  ('What does the French term "Très" mean?', 'Sweet', false, 4),
  ('What does the French term "Doux" mean?', 'Sweet, soft', true, 1),
  ('What does the French term "Doux" mean?', 'Fast', false, 2),
  ('What does the French term "Doux" mean?', 'Very', false, 3),
  ('What does the French term "Doux" mean?', 'Yield', false, 4),
  ('What does the French term "Cédez" mean?', 'Yield, slow down', true, 1),
  ('What does the French term "Cédez" mean?', 'Speed up', false, 2),
  ('What does the French term "Cédez" mean?', 'Sweet, soft', false, 3),
  ('What does the French term "Cédez" mean?', 'Very fast', false, 4)
) AS a(question_text, option_text, is_correct, display_order) ON q.question_text = a.question_text;