-- First, delete the existing glossary quizzes
DELETE FROM gw_assignments 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' 
AND assignment_type = 'quiz';

-- Insert the 4 correctly specified glossary quizzes
INSERT INTO gw_assignments (course_id, title, description, assignment_type, category, points, is_active) VALUES
-- Quiz 1 – Week 3: Fundamental Tempo & Dynamics
('2026c613-bda7-487a-a5d9-91e57c26a741', 
 'Glossary Quiz 1: Fundamental Tempo & Dynamics', 
 'Terms covered: Largo, Grave, Lento, Adagio, Andante, Moderato, Allegro, Accelerando, Ritardando, Pianissimo (pp), Piano (p), Mezzo forte (mf).', 
 'quiz', 'Week 3', 25, true),

-- Quiz 2 – Week 6: Advanced Tempo Changes, Dynamics & Articulation
('2026c613-bda7-487a-a5d9-91e57c26a741', 
 'Glossary Quiz 2: Advanced Tempo Changes, Dynamics & Articulation', 
 'Terms covered: Andantino, Allegretto, Vivace, Presto, Prestissimo, Meno mosso, Più mosso, Sforzando (sfz), Fortissimo (ff), Diminuendo, Fortepiano (fp), Legato, Staccato.', 
 'quiz', 'Week 6', 25, true),

-- Quiz 3 – Week 9: Expression, Character & Navigation
('2026c613-bda7-487a-a5d9-91e57c26a741', 
 'Glossary Quiz 3: Expression, Character & Navigation', 
 'Terms covered: Espressivo, Cantabile, Dolce, Con brio, Con fuoco, Maestoso, Grazioso, Tranquillo, Animato, Leggiero, Pesante, Da Capo (D.C.), Fermata.', 
 'quiz', 'Week 9', 25, true),

-- Quiz 4 – Week 13: German & French Vocabulary
('2026c613-bda7-487a-a5d9-91e57c26a741', 
 'Glossary Quiz 4: German & French Vocabulary', 
 'German terms: Ruhig, Sehr, Mit, Etwas, Breit, Zurückhaltend. French terms: Lent, Vite, Modéré, Très, Doux, Cédez.', 
 'quiz', 'Week 13', 25, true);