-- Bowman Scholars (MUS-240), Fall 2026 — quiz bank.
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


  -- ---------------------------------------------------------------
  -- Quiz 1 — What the Liturgy Is
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 1 — What the Liturgy Is';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 1 — What the Liturgy Is', 'Chapter 1 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 1 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'short_answer', 'According to Sacrosanctum Concilium 7, in how many modes is Christ present in the liturgy? Name at least four.', NULL, NULL, 'Five modes: in the person of the minister; under the Eucharistic species; in the sacraments; in his word; when the Church prays and sings.', 1, v_tenant_id),
    (v_test_id, 1, 'multiple_choice', 'Sacrosanctum Concilium 10 calls the liturgy:', '[{"id": "a", "text": "the highest form of private devotion"}, {"id": "b", "text": "the summit toward which the Church’s activity is directed and the fount from which her power flows"}, {"id": "c", "text": "one of several equally valid forms of Christian prayer"}, {"id": "d", "text": "primarily an act of catechesis"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 2, 'true_false', 'The Mass repeats the sacrifice of Calvary.', NULL, 'false'::jsonb, 'The Mass does not repeat Calvary; it makes the one sacrifice sacramentally present (CCC 1366).', 1, v_tenant_id),
    (v_test_id, 3, 'short_answer', 'Define anamnesis as the liturgical tradition uses the term.', NULL, NULL, 'A remembering that makes present — the sacramental re-presentation of a past saving act so that the present assembly may enter it.', 1, v_tenant_id),
    (v_test_id, 4, 'multiple_choice', 'According to Musicam Sacram 15, participation in the liturgy must be:', '[{"id": "a", "text": "external only"}, {"id": "b", "text": "internal only"}, {"id": "c", "text": "above all internal, and also external"}, {"id": "d", "text": "neither, since participation is a modern innovation"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 5, 'short_answer', 'Sacrosanctum Concilium 28 states that each minister should carry out “________ and ________ those parts which pertain to his office.”', NULL, NULL, '“all” and “only”', 1, v_tenant_id),
    (v_test_id, 6, 'true_false', 'A congregation listening attentively to a motet sung by the choir is not participating in the liturgy.', NULL, 'false'::jsonb, 'Listening is genuine active participation (MS 15; STL 12).', 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'Which document first used the phrase participatio actuosa, and in what year?', NULL, NULL, 'Tra le Sollecitudini, Pius X, 1903.', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'According to Sing to the Lord 21, what should the priest do while the assembly is singing?', NULL, NULL, 'Step back from the microphone (or turn off a wireless one); his voice should not be heard above the congregation, and he does not sing the congregational response of the dialogues.', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'According to Sing to the Lord 9, what are the “normal consequences of liturgical celebration”?', NULL, NULL, 'Charity, justice, and evangelization.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 2 — How the Mass Got Its Shape
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 2 — How the Mass Got Its Shape';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 2 — How the Mass Got Its Shape', 'Chapter 2 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 2 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'multiple_choice', 'The two Jewish sources of the Mass’s structure are:', '[{"id": "a", "text": "the Temple and the household"}, {"id": "b", "text": "the synagogue service and the Passover/table blessings"}, {"id": "c", "text": "the Sanhedrin and the synagogue"}, {"id": "d", "text": "the Psalter and the Torah"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 1, 'short_answer', 'Approximately when did St. Justin Martyr describe Sunday worship in Rome, and what three elements did he report?', NULL, NULL, 'c. AD 155. Readings from the apostles and prophets; a discourse by the presider; prayers and the offering of bread and wine with the people’s Amen — followed by a collection for the poor.', 1, v_tenant_id),
    (v_test_id, 2, 'true_false', 'Gregorian chant was composed by Pope Gregory the Great.', NULL, 'false'::jsonb, 'Gregorian chant is the Franco-Roman synthesis of the 8th–9th centuries; the attribution to Gregory is legend.', 1, v_tenant_id),
    (v_test_id, 3, 'multiple_choice', 'The Credo entered the Roman Mass in:', '[{"id": "a", "text": "the 4th century"}, {"id": "b", "text": "the 7th century"}, {"id": "c", "text": "1014"}, {"id": "d", "text": "1570"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'Who introduced the Agnus Dei into the Roman Mass, and approximately when?', NULL, NULL, 'Pope Sergius I, c. 687–701.', 1, v_tenant_id),
    (v_test_id, 5, 'short_answer', 'Name the two innovations of Guido of Arezzo that made written transmission of melody possible.', NULL, NULL, 'The staff with lines of fixed pitch; solmization syllables (ut, re, mi, fa, sol, la).', 1, v_tenant_id),
    (v_test_id, 6, 'multiple_choice', 'The first complete polyphonic setting of the Mass Ordinary by a single identified composer was written by:', '[{"id": "a", "text": "Josquin des Prez"}, {"id": "b", "text": "Guillaume Dufay"}, {"id": "c", "text": "Guillaume de Machaut"}, {"id": "d", "text": "Giovanni Pierluigi da Palestrina"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 7, 'true_false', 'The Council of Trent reduced the number of sequences in the Roman Rite from thousands to four.', NULL, 'true'::jsonb, '(four; Stabat Mater restored 1727).', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'What two reform movements of the nineteenth century responded to the excesses of the concert Mass?', NULL, NULL, 'The Cecilian Movement (Germany, from 1868) and the Solesmes chant restoration (France).', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'In one sentence, what does Desiderio Desideravi (2022) identify as the root liturgical problem of our time?', NULL, NULL, 'That the deficit is formational rather than merely rubrical — a lost capacity to understand symbols, requiring formation of the whole person.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 3 — The Books, the Vocabulary, and the Structures
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 3 — The Books, the Vocabulary, and the Structures';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 3 — The Books, the Vocabulary, and the Structures', 'Chapter 3 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 3 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'short_answer', 'List the five texts of the Ordinary of the Mass.', NULL, NULL, 'Kyrie, Gloria, Credo, Sanctus, Agnus Dei.', 1, v_tenant_id),
    (v_test_id, 1, 'short_answer', 'List the six chants of the Proper.', NULL, NULL, 'Introit, Gradual (Responsorial Psalm), Alleluia/Tract, Sequence, Offertory, Communion.', 1, v_tenant_id),
    (v_test_id, 2, 'multiple_choice', 'Which of the following is NOT part of the Ordinary?', '[{"id": "a", "text": "Sanctus"}, {"id": "b", "text": "Agnus Dei"}, {"id": "c", "text": "Introit"}, {"id": "d", "text": "Kyrie"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 3, 'true_false', 'In the United States, a suitable liturgical song is the first option given for the Entrance chant.', NULL, 'false'::jsonb, 'It is the fourth option.', 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'According to Sing to the Lord 159, “Songs or hymns that do not at least ________ a psalm may never be used in place of the Responsorial Psalm.”', NULL, NULL, 'paraphrase', 1, v_tenant_id),
    (v_test_id, 5, 'short_answer', 'What are the three degrees of Musicam Sacram, and what rule governs their relationship?', NULL, NULL, 'First: priest–people dialogues, the Collect, Gospel acclamations, Prayer over the Offerings, Preface and Sanctus, doxology, Lord’s Prayer, Pax Domini, Prayer after Communion, dismissal. Second: Kyrie, Gloria, Agnus Dei, Creed, Prayer of the Faithful. Third: Entrance and Communion songs, songs after the readings, Alleluia, Offertory song, sung readings. Rule: the first may be used alone; the second and third never without the first (MS 28).', 1, v_tenant_id),
    (v_test_id, 6, 'multiple_choice', 'According to Musicam Sacram 29, which of these belongs to the first degree?', '[{"id": "a", "text": "the Gloria"}, {"id": "b", "text": "the Entrance chant"}, {"id": "c", "text": "the Preface with its dialogue and the Sanctus"}, {"id": "d", "text": "the Alleluia"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 7, 'true_false', 'The Graduale Simplex was produced in response to a request in Sacrosanctum Concilium.', NULL, 'true'::jsonb, '(SC 117).', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'Name three restrictions that apply to music during Lent.', NULL, NULL, 'Any three: no Alleluia; no Gloria on Sundays; instruments only to support singing (no solo playing), with exceptions for Laetare Sunday, solemnities, and feasts; silence as a preferred recessional option.', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'According to Sing to the Lord 116, what is the order of musical priorities at daily Mass?', NULL, NULL, 'Dialogues and acclamations; then litanies (Kyrie, Agnus Dei); then the Responsorial Psalm in a simple setting; then a hymn or two on more important days.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 4 — The Introductory Rites
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 4 — The Introductory Rites';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 4 — The Introductory Rites', 'Chapter 4 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 4 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'short_answer', 'State the four purposes of the Entrance chant given in GIRM 47.', NULL, NULL, 'To open the celebration; foster the unity of those gathered; introduce their thoughts to the mystery of the season or festivity; accompany the procession.', 1, v_tenant_id),
    (v_test_id, 1, 'multiple_choice', 'The response “And with your spirit” refers to:', '[{"id": "a", "text": "the assembly’s collective spirit"}, {"id": "b", "text": "the spirit the ordained minister received at ordination"}, {"id": "c", "text": "the Holy Spirit generally"}, {"id": "d", "text": "a poetic synonym for “you”"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 2, 'true_false', 'In Penitential Act Form C, the Kyrie is a separate element sung after the act is completed.', NULL, 'false'::jsonb, 'In Form C the Kyrie is integral to the act.', 1, v_tenant_id),
    (v_test_id, 3, 'short_answer', 'What is wrong with the invocation: “For the times we have failed to welcome the stranger, Lord have mercy”?', NULL, NULL, 'It addresses the assembly’s failures rather than acclaiming Christ. The invocations are Christological — they name what Christ has done (“You were sent to heal the contrite of heart”), not what we have failed to do.', 1, v_tenant_id),
    (v_test_id, 4, 'multiple_choice', 'The Gloria is sung:', '[{"id": "a", "text": "at every Mass"}, {"id": "b", "text": "on Sundays outside Advent and Lent, on solemnities and feasts, and at more solemn celebrations"}, {"id": "c", "text": "only on solemnities"}, {"id": "d", "text": "at the discretion of the music director"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 5, 'true_false', 'The text of the Gloria may be replaced by an approved paraphrase.', NULL, 'false'::jsonb, 'GIRM 53: the text may not be replaced by any other text.', 1, v_tenant_id),
    (v_test_id, 6, 'short_answer', 'What must happen immediately after the priest says “Let us pray,” before the Collect?', NULL, NULL, 'A period of silence in which all pray together with the priest (GIRM 54).', 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'Name the five parts of a classical Collect.', NULL, NULL, 'Address; amplification (relative clause recalling God’s action); petition; purpose clause; conclusion through Christ with Trinitarian doxology.', 1, v_tenant_id),
    (v_test_id, 8, 'true_false', 'The Gloria may be used in place of the Entrance chant.', NULL, 'false'::jsonb, '(STL 150).', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'What may replace the Penitential Act on Sundays, especially in Easter, and what should the accompanying song’s character be?', NULL, NULL, 'The Blessing and Sprinkling of Water; the song should have an explicitly baptismal character (STL 147).', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 5 — The Liturgy of the Word
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 5 — The Liturgy of the Word';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 5 — The Liturgy of the Word', 'Chapter 5 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 5 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'true_false', 'The Responsorial Psalm is best understood as a musical response to the first reading.', NULL, 'false'::jsonb, 'It is itself a reading from Scripture (STL 155).', 1, v_tenant_id),
    (v_test_id, 1, 'multiple_choice', 'The psalmist sings from:', '[{"id": "a", "text": "the cantor’s stand"}, {"id": "b", "text": "the choir loft"}, {"id": "c", "text": "the ambo or another suitable place"}, {"id": "d", "text": "wherever the sound system is best"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'What are the three options, in order of preference, when the Responsorial Psalm cannot be sung responsorially?', NULL, NULL, '(i) Sung responsorially, psalmist and assembly; (ii) sung straight through (in directum) without response; (iii) the response alone sung while the lector reads the verses.', 1, v_tenant_id),
    (v_test_id, 3, 'true_false', 'The Sunday second reading is chosen to match the Gospel thematically.', NULL, 'false'::jsonb, 'It is semi-continuous and deliberately not coordinated with the Gospel.', 1, v_tenant_id),
    (v_test_id, 4, 'multiple_choice', 'If the Gospel Acclamation is not sung, it should be:', '[{"id": "a", "text": "recited by the assembly"}, {"id": "b", "text": "recited by the cantor"}, {"id": "c", "text": "omitted"}, {"id": "d", "text": "replaced by a hymn"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 5, 'short_answer', 'Name the four days on which a Sequence is used, and specify which two are required.', NULL, NULL, 'Easter (Victimae paschali laudes) — required; Pentecost (Veni Sancte Spiritus) — required; Corpus Christi (Lauda Sion) — optional; Our Lady of Sorrows (Stabat Mater) — optional.', 1, v_tenant_id),
    (v_test_id, 6, 'short_answer', 'During Lent, the ________ is not used, and alternate acclamations from the Lectionary are substituted.', NULL, NULL, 'Alleluia', 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'State the four categories of intention prescribed for the Universal Prayer, in order.', NULL, NULL, 'The Church; public authorities and the salvation of the whole world; those burdened by difficulty; the local community.', 1, v_tenant_id),
    (v_test_id, 8, 'true_false', 'A lay person may preach the homily at Mass in place of the priest or deacon.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'Why is the Alleluia considered inappropriate for a slow, contempla114 tive performance?', NULL, NULL, 'Alleluia means “Praise Yah!” — it is a shout of acclamation welcoming Christ who is about to speak, not a contemplative text.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 6 — The Liturgy of the Eucharist
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 6 — The Liturgy of the Eucharist';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 6 — The Liturgy of the Eucharist', 'Chapter 6 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 6 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'multiple_choice', 'The proper name for the second part of the Liturgy of the Eucharist’s first section is:', '[{"id": "a", "text": "the Offertory"}, {"id": "b", "text": "the Preparation of the Gifts"}, {"id": "c", "text": "the Oblation"}, {"id": "d", "text": "the Presentation"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 1, 'true_false', 'Something must always be sung during the Preparation of the Gifts.', NULL, 'false'::jsonb, '(STL 174; instrumental music or silence are appropriate).', 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'List the nine parts of the Eucharistic Prayer as enumerated in Sing to the Lord 177.', NULL, NULL, 'Introductory dialogue; Preface; Sanctus; epiclesis; institution narrative; Memorial Acclamation; anamnesis; intercessions; doxology with Amen.', 1, v_tenant_id),
    (v_test_id, 3, 'multiple_choice', 'During the Eucharistic Prayer, apart from the people’s acclamations:', '[{"id": "a", "text": "soft instrumental underscoring is encouraged"}, {"id": "b", "text": "the organ may play quietly under the institution narrative"}, {"id": "c", "text": "there should be no other prayers or singing, and instruments should be silent"}, {"id": "d", "text": "the choir may hum"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'What does epiclesis mean, and where does it occur?', NULL, NULL, 'The calling down of the Holy Spirit upon the gifts; it occurs after the Sanctus, before the institution narrative.', 1, v_tenant_id),
    (v_test_id, 5, 'true_false', 'It is permitted to recite the Eucharistic Prayer inaudibly while the Sanctus is sung.', NULL, 'false'::jsonb, '(STL 181).', 1, v_tenant_id),
    (v_test_id, 6, 'short_answer', 'According to Sing to the Lord 178, what should the relationship be between the pitch of the chanted Preface and the Sanctus?', NULL, NULL, 'The Preface should be chanted at a pitch that best relates to the key and modality of the other sung elements — i.e., leading into the Sanctus’s key.', 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'Name the four principal Eucharistic Prayers and one distinguishing feature of each.', NULL, NULL, 'I — the Roman Canon, ancient, with lists of saints. II — brief, based on the Anaphora of Hippolytus. III — modern, festive, widely used on Sundays. IV — has its own fixed Preface and narrates salvation history.', 1, v_tenant_id),
    (v_test_id, 8, 'true_false', 'The priest joins the assembly in singing the Memorial Acclamation.', NULL, 'false'::jsonb, '(STL 21).', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'Why is stylistic unity among the Sanctus, Memorial Acclamation, and Great Amen recommended?', NULL, NULL, 'Because the Eucharistic Prayer is a single liturgical act; stylistic unity among its acclamations makes that unity audible rather than presenting three unrelated pieces.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 7 — The Communion Rite
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 7 — The Communion Rite';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 7 — The Communion Rite', 'Chapter 7 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 7 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'true_false', 'The doxology “For the kingdom, the power and the glory are yours” belongs to the priest.', NULL, 'false'::jsonb, 'It belongs to the people.', 1, v_tenant_id),
    (v_test_id, 1, 'multiple_choice', 'Regarding the Sign of Peace, Sing to the Lord 187 states that the exchange:', '[{"id": "a", "text": "should be accompanied by a song of peace"}, {"id": "b", "text": "must not be protracted by the singing of a song"}, {"id": "c", "text": "may be extended at the priest’s discretion"}, {"id": "d", "text": "should be omitted at Sunday Mass"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'What ritual action does the Agnus Dei accompany?', NULL, NULL, 'The fraction (the breaking of the bread), with the commingling.', 1, v_tenant_id),
    (v_test_id, 3, 'true_false', 'The Agnus Dei must always be sung exactly three times.', NULL, 'false'::jsonb, 'It may be repeated as often as necessary (GIRM 83).', 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'Under what condition may additional Christological invocations be used within the Agnus Dei, and what must the first and last invocations always be?', NULL, NULL, 'When it is sung repeatedly as a litany; the first and final invocations must always be Agnus Dei (Lamb of God) (STL 188).', 1, v_tenant_id),
    (v_test_id, 5, 'multiple_choice', 'The Communion chant begins:', '[{"id": "a", "text": "after the priest has received Communion and the ministers are in place"}, {"id": "b", "text": "while the priest is receiving the Sacrament"}, {"id": "c", "text": "when the first communicant reaches the minister"}, {"id": "d", "text": "after the Sign of Peace"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 6, 'short_answer', 'Why does Sing to the Lord 192 recommend responsorial psalms and songs with easily memorized refrains at Communion?', NULL, NULL, 'Because communicants in procession cannot hold books; memorized refrains allow them to sing while walking.', 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'Name the three psalms Sing to the Lord 194 identifies as long associated with the Eucharistic banquet.', NULL, NULL, 'Psalms 23, 34, and 147.', 1, v_tenant_id),
    (v_test_id, 8, 'true_false', 'According to GIRM 88, a hymn after Communion is required.', NULL, 'false'::jsonb, 'It is optional (“if desired”).', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'According to GIRM 88, what comes first after Communion — silence or song?', NULL, NULL, 'Silence — private prayer comes first; a song may follow if desired.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 8 — The Concluding Rites
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 8 — The Concluding Rites';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 8 — The Concluding Rites', 'Chapter 8 of Understanding the Mass. 8 questions, 8 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 8, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 8 of Understanding the Mass. 8 questions, 8 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 8, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'true_false', 'The Roman Missal prescribes a recessional hymn.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 1, 'short_answer', 'Name the four forms of the dismissal in the current Missal.', NULL, NULL, '“Go forth, the Mass is ended”; “Go and announce the Gospel of the Lord”; “Go in peace, glorifying the Lord by your life”; “Go in peace.”', 1, v_tenant_id),
    (v_test_id, 2, 'multiple_choice', 'The word “Mass” derives from:', '[{"id": "a", "text": "missio, meaning mission"}, {"id": "b", "text": "Ite, missa est, the dismissal formula"}, {"id": "c", "text": "messis, meaning harvest"}, {"id": "d", "text": "mensa, meaning table"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 3, 'short_answer', 'According to Sing to the Lord 199, what three alternatives to a congregational recessional song are named?', NULL, NULL, 'A choral piece; an instrumental piece; silence (particularly during Lent).', 1, v_tenant_id),
    (v_test_id, 4, 'true_false', 'During Lent, silence is named as an appropriate option for the conclusion of Mass.', NULL, 'true'::jsonb, '(STL 199).', 1, v_tenant_id),
    (v_test_id, 5, 'short_answer', 'What should govern the length of the closing song, per STL 199?', NULL, NULL, 'The procession of ministers should finish during the final stanza.', 1, v_tenant_id),
    (v_test_id, 6, 'true_false', 'The solemn blessing may be sung with the assembly responding Amen to each invocation.', NULL, 'true'::jsonb, '(STL 198).', 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'Why is it theologically significant that the entire rite takes its name from its dismissal?', NULL, NULL, 'Because it identifies the rite by its sending: the liturgy exists to send the assembly out, and charity, justice, and evangelization are its normal consequences (STL 9).', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 9 — The Ordinary of the Mass
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 9 — The Ordinary of the Mass';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 9 — The Ordinary of the Mass', 'Chapter 9 of Understanding the Mass. 11 questions, 11 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 11, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 9 of Understanding the Mass. 11 questions, 11 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 11, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'multiple_choice', 'The Kyrie is retained in Greek because:', '[{"id": "a", "text": "Greek is more beautiful than Latin"}, {"id": "b", "text": "it is a fossil from the era before Latin displaced Greek in the Roman liturgy"}, {"id": "c", "text": "the Council of Trent required it"}, {"id": "d", "text": "it was a Byzantine import of the twelfth century"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 1, 'true_false', 'The three parts of the Kyrie address the three Persons of the Trinity.', NULL, 'false'::jsonb, 'All three are Christological.', 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'What was the original liturgical context of the Kyrie eleison?', NULL, NULL, 'It was the people’s response to a litany of intercessions (the Deprecatio Gelasii); the petitions were later dropped and the response remained.', 1, v_tenant_id),
    (v_test_id, 3, 'multiple_choice', 'The Gloria is described as a psalmus idioticus, which means:', '[{"id": "a", "text": "a psalm for the uneducated"}, {"id": "b", "text": "a hymn composed by the Church rather than taken from Scripture"}, {"id": "c", "text": "a psalm sung by an individual"}, {"id": "d", "text": "an idiomatic paraphrase of a psalm"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'With what Scripture verse does the Gloria open?', NULL, NULL, 'Luke 2:14.', 1, v_tenant_id),
    (v_test_id, 5, 'short_answer', 'Identify the four structural sections of the Gloria and state which one turns inward with petitions for mercy.', NULL, NULL, '(i) Angelic acclamation; (ii) praise of the Father; (iii) praise of the Son — this section turns inward with petitions for mercy; (iv) the final acclamation and Trinitarian doxology.', 1, v_tenant_id),
    (v_test_id, 6, 'multiple_choice', 'The word “consubstantial” in the Creed translates:', '[{"id": "a", "text": "unius substantiae"}, {"id": "b", "text": "homoousios / consubstantialem"}, {"id": "c", "text": "communio"}, {"id": "d", "text": "hypostasis"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 7, 'true_false', 'The Creed is a prayer addressed to God the Father.', NULL, 'false'::jsonb, 'It is not a prayer and is addressed to no one; it is a corporate profession/declaration.', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'Identify the two Scripture sources combined in the Sanctus, and state which is heavenly and which is earthly.', NULL, NULL, 'Isaiah 6:3 (heavenly — the seraphim) and Psalm 118:26 / Matthew 21:9 (earthly — the Palm Sunday crowd).', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'Who introduced the Agnus Dei, when, and for what functional purpose?', NULL, NULL, 'Pope Sergius I, c. 687–701, to accompany the fraction of the bread.', 1, v_tenant_id),
    (v_test_id, 10, 'short_answer', 'What does Hosanna originally mean, and how had its usage changed by the first century?', NULL, NULL, 'Hebrew hoshi’a-na, “save, please” — a petition that had become a shout of acclamation by the first century.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 10 — Types and Forms of Mass
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 10 — Types and Forms of Mass';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 10 — Types and Forms of Mass', 'Chapter 10 of Understanding the Mass. 11 questions, 11 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 11, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 10 of Understanding the Mass. 11 questions, 11 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 11, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'true_false', 'The distinction between Missa solemnis, Missa cantata, and Missa lecta remains in force in the current Missal.', NULL, 'false'::jsonb, 'The formal distinction was rendered obsolete by the 1970 Missal; progressive solemnity replaced it.', 1, v_tenant_id),
    (v_test_id, 1, 'multiple_choice', 'Regarding wedding music, Sing to the Lord 220 states:', '[{"id": "a", "text": "any music meaningful to the couple is appropriate"}, {"id": "b", "text": "secular music, even emphasizing spousal love, is not appropriate for the Sacred Liturgy"}, {"id": "c", "text": "secular music is permitted before the entrance procession only"}, {"id": "d", "text": "the couple has final authority over musical selections"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'What does Sing to the Lord 219 recommend as the practical solution to wedding music conflicts?', NULL, NULL, 'A definite but flexible written policy communicated to couples early in their preparation.', 1, v_tenant_id),
    (v_test_id, 3, 'short_answer', 'Name the three “stations” of the Order of Christian Funerals.', NULL, NULL, 'The Vigil; the Funeral Liturgy (usually the Funeral Mass); the Rite of Committal.', 1, v_tenant_id),
    (v_test_id, 4, 'true_false', 'The Alleluia is omitted at funerals.', NULL, 'false'::jsonb, 'It is sung outside Lent; the paschal claim is the point.', 1, v_tenant_id),
    (v_test_id, 5, 'short_answer', 'What is the Song of Farewell, and where does it occur?', NULL, NULL, 'The song accompanying the Final Commendation and Farewell, after the Prayer after Communion, during the incensation of the body (e.g., In paradisum).', 1, v_tenant_id),
    (v_test_id, 6, 'multiple_choice', 'On the Sundays of the Scrutinies, the readings are taken from:', '[{"id": "a", "text": "the current liturgical year"}, {"id": "b", "text": "Year A, always"}, {"id": "c", "text": "the Common of Saints"}, {"id": "d", "text": "the Ritual Masses section"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'Name the four parts of the Easter Vigil in order.', NULL, NULL, 'Lucernarium (fire, candle, Exsultet); Liturgy of the Word; Baptismal Liturgy; Liturgy of the Eucharist.', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'What silence begins at the Gloria of Holy Thursday, and when does it end?', NULL, NULL, 'Organ and bells fall silent after the Gloria of Holy Thursday and return at the Gloria of the Easter Vigil.', 1, v_tenant_id),
    (v_test_id, 9, 'true_false', 'A Sunday Celebration in the Absence of a Priest is a form of Mass.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 10, 'short_answer', 'What special vocal skill does Sing to the Lord 207 identify as necessary for cantors at the Baptism of children, and why?', NULL, NULL, 'The skill of leading unaccompanied singing, because much of the rite takes place at the door or the font, away from the instruments.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 11 — A History of Music in Catholic Worship
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 11 — A History of Music in Catholic Worship';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 11 — A History of Music in Catholic Worship', 'Chapter 11 of Understanding the Mass. 11 questions, 11 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 11, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 11 of Understanding the Mass. 11 questions, 11 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 11, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'short_answer', 'Name the three performance practices inherited from synagogue psalmody.', NULL, NULL, 'Responsorial; antiphonal; in directum.', 1, v_tenant_id),
    (v_test_id, 1, 'multiple_choice', 'Instruments were largely excluded from early Christian worship because:', '[{"id": "a", "text": "they were technically primitive"}, {"id": "b", "text": "of their association with pagan cult and the theatre"}, {"id": "c", "text": "Scripture forbids them"}, {"id": "d", "text": "they were prohibitively expensive"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'Who introduced congregational hymnody at Milan, and partly for what reason?', NULL, NULL, 'St. Ambrose of Milan, partly to counter Arian teaching being spread through song.', 1, v_tenant_id),
    (v_test_id, 3, 'true_false', 'Gregorian chant is identical to the chant sung in Rome in Gregory the Great’s time.', NULL, 'false'::jsonb, 'Old Roman chant is a distinct dialect; Gregorian is the Franco-Roman synthesis.', 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'Match the chant style to its definition: syllabic / neumatic / melismatic.', NULL, NULL, 'Syllabic — one note per syllable. Neumatic — two to four notes per syllable. Melismatic — many notes per syllable.', 1, v_tenant_id),
    (v_test_id, 5, 'multiple_choice', 'Tra le Sollecitudini (1903) names three required qualities of sacred music. They are:', '[{"id": "a", "text": "beauty, antiquity, and simplicity"}, {"id": "b", "text": "holiness, goodness of form, and universality"}, {"id": "c", "text": "reverence, clarity, and dignity"}, {"id": "d", "text": "tradition, participation, and artistry"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 6, 'true_false', 'Musicam Sacram 9 prohibits certain genres of music from the liturgy by name.', NULL, 'false'::jsonb, 'It states the opposite: no kind of sacred music is prohibited if it meets the stated conditions.', 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'What did Sacrosanctum Concilium 119 direct concerning peoples with their own musical traditions?', NULL, NULL, 'That their music be held in proper esteem and given a suitable place, not only in forming religious attitudes but in adapting worship to their native genius.', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'Name two mid-twentieth-century inculturated Mass settings and their countries of origin.', NULL, NULL, 'Missa Luba (Congo, 1958); Misa Criolla (Argentina, 1964).', 1, v_tenant_id),
    (v_test_id, 9, 'multiple_choice', 'Sing to the Lord 136 states that sufficiency of artistic expression is:', '[{"id": "a", "text": "the same as musical style"}, {"id": "b", "text": "not the same as musical style"}, {"id": "c", "text": "determined by the diocesan bishop"}, {"id": "d", "text": "a matter of personal taste"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 10, 'short_answer', 'State the single question Sing to the Lord 126 says all three judgments together must answer.', NULL, NULL, '“Is this particular piece of music appropriate for this use in the particular Liturgy?”', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 12 — The Ministers of Music
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 12 — The Ministers of Music';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 12 — The Ministers of Music', 'Chapter 12 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 12 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'multiple_choice', 'According to Sing to the Lord 102, acoustics are fundamentally deficient when:', '[{"id": "a", "text": "the reverberation exceeds four seconds"}, {"id": "b", "text": "each person hears primarily only his or her own voice"}, {"id": "c", "text": "the organ cannot be heard at the back"}, {"id": "d", "text": "the choir requires amplification"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 1, 'short_answer', 'Name four building materials Sing to the Lord 103 identifies as sound-absorbing.', NULL, NULL, 'Any four: carpet; porous ceiling tiles; soft wood; untreated soft stone; cast concrete or cinder block; padded seating.', 1, v_tenant_id),
    (v_test_id, 2, 'true_false', 'When not exercising its particular role, the choir’s job is to lead congregational singing.', NULL, 'false'::jsonb, 'Its role in that case is to sing with the congregation, not to lead it (STL 31).', 1, v_tenant_id),
    (v_test_id, 3, 'multiple_choice', 'Cassock and surplice as choir vesture are:', '[{"id": "a", "text": "required"}, {"id": "b", "text": "recommended"}, {"id": "c", "text": "not recommended, being clerical attire"}, {"id": "d", "text": "forbidden by canon law"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'State the three norms governing the cantor’s audibility, gesture, and visibility.', NULL, NULL, '(i) The cantor’s voice should not be heard above the congregation and should recede as confidence grows; (ii) gestures sparingly and only when genuinely needed; (iii) when the assembly sings familiar music without cantor verses, the cantor need not be visible.', 1, v_tenant_id),
    (v_test_id, 5, 'true_false', 'The cantor may sing the Responsorial Psalm from the cantor’s stand.', NULL, 'false'::jsonb, 'The psalm is sung from the ambo (STL 36); the cantor’s stand is not the ambo (STL 40).', 1, v_tenant_id),
    (v_test_id, 6, 'short_answer', 'What does Sing to the Lord 43 say about improvisation, and what standard does it set?', NULL, NULL, 'It encourages improvisation, particularly when music ends before a ritual action is complete; the standard is that “more than mere background sound is called for,” and where worthy improvisation is not possible, quality published literature should be played.', 1, v_tenant_id),
    (v_test_id, 7, 'true_false', 'Sing to the Lord addresses the just compensation of music ministers.', NULL, 'true'::jsonb, '(STL 52).', 1, v_tenant_id),
    (v_test_id, 8, 'multiple_choice', 'Sing to the Lord 49 states that liturgical musicians are:', '[{"id": "a", "text": "employees of the parish"}, {"id": "b", "text": "first of all disciples, and only then ministers"}, {"id": "c", "text": "primarily performers"}, {"id": "d", "text": "volunteers whose formation is optional"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'Which liturgical parts should a deacon be trained to sing?', NULL, NULL, 'The Gospel dialogues; the dismissal; various invitations; the Exsultet; the third form of the Penitential Act; the Prayer of the Faithful; and, if capable, chanting the Gospel.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 13 — Judging and Choosing Music
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 13 — Judging and Choosing Music';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 13 — Judging and Choosing Music', 'Chapter 13 of Understanding the Mass. 9 questions, 9 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 9, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 13 of Understanding the Mass. 9 questions, 9 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 9, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'short_answer', 'Name the three judgments.', NULL, NULL, 'The liturgical judgment; the pastoral judgment; the musical judgment.', 1, v_tenant_id),
    (v_test_id, 1, 'true_false', 'The three judgments may be applied independently of one another.', NULL, 'false'::jsonb, 'They are aspects of one evaluation (STL 126).', 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'State the question each judgment asks.', NULL, NULL, 'Liturgical: Is this composition capable of meeting the structural and textual requirements set forth by the liturgical books for this particular rite? Pastoral: Will this composition draw this particular people closer to the mystery of Christ? Musical: Is this composition technically, aesthetically, and expressively worthy?', 1, v_tenant_id),
    (v_test_id, 3, 'multiple_choice', 'The pastoral judgment’s final form is:', '[{"id": "a", "text": "“Will the congregation enjoy this?”"}, {"id": "b", "text": "“Will this composition draw this particular people closer to the mystery of Christ?”"}, {"id": "c", "text": "“Is this piece familiar?”"}, {"id": "d", "text": "“Does the pastor approve?”"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'Sing to the Lord 135: “To admit to the Liturgy the ________, the ________, or the musical ________ often found in secular popular songs is to cheapen the Liturgy.”', NULL, NULL, 'cheap, trite, cliché', 1, v_tenant_id),
    (v_test_id, 5, 'true_false', 'Sing to the Lord prescribes a particular musical style as proper to the Catholic liturgy.', NULL, 'false'::jsonb, '(STL 136, citing SC 123).', 1, v_tenant_id),
    (v_test_id, 6, 'short_answer', 'Which three Latin chant settings does Sing to the Lord 75 identify as the minimum every U.S. worshiping community should learn?', NULL, NULL, 'Kyrie XVI, Sanctus XVIII, Agnus Dei XVIII.', 1, v_tenant_id),
    (v_test_id, 7, 'true_false', 'A parish may reprint hymn texts for congregational use without permission as long as no money is charged.', NULL, 'false'::jsonb, 'Permission and payment are required even when copies are only for the congregation (STL 105).', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'Give three items from the working checklist in §13.2.', NULL, NULL, 'Any three from §13.2 — e.g., name the ritual moment precisely; ask what the rite asks of that moment; check whether the text is permitted there; identify who sings; check the assembly’s capability; assess craftsmanship; check fit with the day’s rank; check fit with the length of the action; ask what it displaces.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 14 — Part-by-Part Musical Direction
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 14 — Part-by-Part Musical Direction';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 14 — Part-by-Part Musical Direction', 'Chapter 14 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 14 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'true_false', 'The tempo markings in Chapter 14 are prescribed by Church documents.', NULL, 'false'::jsonb, 'They are craft counsel, not law.', 1, v_tenant_id),
    (v_test_id, 1, 'short_answer', 'What is the correct character of the Kyrie, and what common error does the handbook warn against?', NULL, NULL, 'Earnest, corporate, appealing upward, with forward motion. The common error is treating it as funereal or as the emotional low point of the Mass; it is an acclamation of the Kyrios.', 1, v_tenant_id),
    (v_test_id, 2, 'multiple_choice', 'The dynamic shape of the Gloria should:', '[{"id": "a", "text": "remain uniformly loud"}, {"id": "b", "text": "build steadily from beginning to end"}, {"id": "c", "text": "be bright, then cascade, then soften at “Lord Jesus Christ,” then build to the close"}, {"id": "d", "text": "begin softly and end softly"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 3, 'short_answer', 'In the Sanctus, which text is from Isaiah and which from the Palm Sunday crowd, and how should their characters differ?', NULL, NULL, '“Holy, Holy, Holy Lord God of hosts / Heaven and earth are full of your glory” is Isaiah 6:3 — awe, weighty, ascending. “Hosanna… Blessed is he who comes” is Psalm 118 / Matthew 21 — acclamation and welcome, brighter, with Benedictus warmer and more intimate.', 1, v_tenant_id),
    (v_test_id, 4, 'true_false', 'The Gospel Acclamation should be sung slowly and reverently.', NULL, 'false'::jsonb, 'It is a shout of acclamation.', 1, v_tenant_id),
    (v_test_id, 5, 'short_answer', 'What is the single most common timing error with the Agnus Dei?', NULL, NULL, 'Beginning it after the fraction is already complete, so that it no longer covers the action.', 1, v_tenant_id),
    (v_test_id, 6, 'multiple_choice', 'The best musical form for a Communion procession is generally:', '[{"id": "a", "text": "a through-composed anthem"}, {"id": "b", "text": "a hymn requiring a hymnal"}, {"id": "c", "text": "responsorial psalmody or a song with an easily memorized refrain"}, {"id": "d", "text": "a vocal solo"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'What practical step does the handbook identify as the single most valuable in §14.10?', NULL, NULL, 'Setting the priest’s chanting pitch so the Preface leads directly into the key of the Sanctus.', 1, v_tenant_id),
    (v_test_id, 8, 'true_false', 'The priest sings the Great Amen with the assembly.', NULL, 'false'::jsonb, '(STL 21).', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'Why should music at the Preparation of the Gifts not build to a climax?', NULL, NULL, 'Because the climax of the liturgy is the Eucharistic Prayer that follows; the Preparation is a transitional moment the books treat lightly.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 15 — The Organist and Other Instrumentalists
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 15 — The Organist and Other Instrumentalists';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 15 — The Organist and Other Instrumentalists', 'Chapter 15 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 15 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'short_answer', 'State the primary role of the organist per Sing to the Lord 41.', NULL, NULL, 'To lead and sustain the singing of the assembly, choir, cantor, and psalmist, without dominating or overpowering them.', 1, v_tenant_id),
    (v_test_id, 1, 'multiple_choice', 'Sing to the Lord 86 describes musical instruments in the liturgy as:', '[{"id": "a", "text": "equal partners with the voice"}, {"id": "b", "text": "an extension of and support to the human voice"}, {"id": "c", "text": "optional decoration"}, {"id": "d", "text": "the primary liturgical instrument"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'Name two reasons Sing to the Lord 87–88 gives for the organ’s pride of place.', NULL, NULL, 'Its capacity to sustain the singing of a large assembly (size and resonance); its ability to give voice to the full range of human sentiment; and its evocation of the immensity and magnificence of God.', 1, v_tenant_id),
    (v_test_id, 3, 'true_false', 'Solo organ playing is permitted during Lent.', NULL, 'false'::jsonb, 'Instruments are permitted only to support singing, except Laetare Sunday, solemnities, and feasts.', 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'What registration principle governs the accompaniment of congregational hymn singing, and why do flutes alone fail?', NULL, NULL, 'Build from 8’ foundations upward through the principal chorus; flutes lack the harmonic development to carry a congregation in a room.', 1, v_tenant_id),
    (v_test_id, 5, 'short_answer', 'Name three acceptable forms of hymn introduction.', NULL, NULL, 'The final phrase; the first phrase plus the last; the complete tune; a free introduction based on the tune.', 1, v_tenant_id),
    (v_test_id, 6, 'true_false', 'Reharmonizing the final stanza of every hymn is recommended practice.', NULL, 'false'::jsonb, 'Reserve it for stanzas where the text justifies it; never reharmonize under an uncertain assembly.', 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'What does the handbook identify as the most common cause of dragging congregational singing?', NULL, NULL, 'An organist slowing to accommodate a slow assembly, which teaches the assembly to be slower still.', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'Name three moments in the Mass at which the liturgical books call for silence.', NULL, NULL, 'Any three: after “Let us pray” before the Collect; after the readings; after the homily; after Communion; before Mass begins.', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'In accompanying chant, why should a metrical pulse not be imposed?', NULL, NULL, 'Because chant’s rhythm arises from the Latin text, not from a metrical pulse; imposing a beat distorts the line.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 16 — The Cantor and the Psalmist
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 16 — The Cantor and the Psalmist';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 16 — The Cantor and the Psalmist', 'Chapter 16 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 16 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'true_false', 'A cantor who sings beautifully to a silent congregation has done the job well.', NULL, 'false'::jsonb, 'The cantor’s excellence exists to produce singing in others.', 1, v_tenant_id),
    (v_test_id, 1, 'multiple_choice', 'As the congregation gains confidence in singing, the cantor’s voice should:', '[{"id": "a", "text": "increase in volume to maintain leadership"}, {"id": "b", "text": "correspondingly recede"}, {"id": "c", "text": "remain constant"}, {"id": "d", "text": "drop out entirely"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'When may a cantor legitimately not be visible to the assembly?', NULL, NULL, 'When the congregation is singing very familiar responses, acclamations, or songs that include no cantor verses (STL 39).', 1, v_tenant_id),
    (v_test_id, 3, 'short_answer', 'In what order should a cantor prepare a responsorial psalm, and why?', NULL, NULL, 'Read the psalm aloud; read the first reading and Gospel; mark the text; then learn the notes. Learning notes first produces a singer of notes; learning text first produces a proclaimer of the psalm.', 1, v_tenant_id),
    (v_test_id, 4, 'true_false', 'Heavy operatic vibrato assists an assembly in matching pitch.', NULL, 'false'::jsonb, 'Heavy vibrato obscures pitch and makes it harder for the assembly to match.', 1, v_tenant_id),
    (v_test_id, 5, 'multiple_choice', 'Congregational melodies should generally sit within approximately:', '[{"id": "a", "text": "A3 to A5"}, {"id": "b", "text": "B-flat 3 to D5"}, {"id": "c", "text": "C4 to G5"}, {"id": "d", "text": "F3 to F5"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 6, 'short_answer', 'What is “pointing,” and give one rule of thumb for doing it correctly.', NULL, NULL, 'Pointing is fitting the words of a psalm to a formula tone so that natural stresses fall correctly. Rule of thumb (any one): accented syllables land on accented notes; unstressed syllables are sung quickly on the reciting note; the cadence should not force an accent onto a weak syllable.', 1, v_tenant_id),
    (v_test_id, 7, 'true_false', 'The cantor should conduct the assembly throughout each hymn.', NULL, 'false'::jsonb, 'Gestures sparingly and only when genuinely needed.', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'Give three practical consequences of Sing to the Lord 49 for a cantor’s conduct during Mass.', NULL, NULL, 'Any three: participate in the whole Mass; sing congregational parts with the assembly rather than over them; sit when not needed; dress modestly and unobtrusively; do not take bows or acknowledge applause.', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'Why should a cantor read the first reading and the Gospel before preparing the psalm?', NULL, NULL, 'Because the psalm is placed where it is to answer the first reading and anticipate the Gospel; knowing the pairing shapes the interpretation.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 17 — The Choir Director
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 17 — The Choir Director';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 17 — The Choir Director', 'Chapter 17 of Understanding the Mass. 9 questions, 9 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 9, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 17 of Understanding the Mass. 9 questions, 9 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 9, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'short_answer', 'Name the three simultaneous jobs of a parish choir director.', NULL, NULL, 'Musician; liturgist; pastor.', 1, v_tenant_id),
    (v_test_id, 1, 'multiple_choice', 'Ultimate responsibility for the selection of music at Mass rests with:', '[{"id": "a", "text": "the music director"}, {"id": "b", "text": "the liturgy committee"}, {"id": "c", "text": "the pastor and the celebrating priest"}, {"id": "d", "text": "the diocesan office of worship"}]'::jsonb, '"c"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'What counterbalancing principle does GIRM 352 attach to that responsibility?', NULL, NULL, 'That in planning the celebration the priest “should have in mind the common spiritual good of the people of God, rather than his own inclinations” (GIRM 352).', 1, v_tenant_id),
    (v_test_id, 3, 'true_false', 'The hardest new music should be rehearsed at the end of a rehearsal.', NULL, 'false'::jsonb, 'Hardest material first, while attention is highest.', 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'List the musical priorities for amateur choirs in order.', NULL, NULL, 'Rhythm, then vowels, then pitch, then dynamics, then everything else.', 1, v_tenant_id),
    (v_test_id, 5, 'true_false', 'Musicam Sacram requires only musical formation for choir members.', NULL, 'false'::jsonb, 'MS 24 requires liturgical and spiritual formation as well.', 1, v_tenant_id),
    (v_test_id, 6, 'short_answer', 'Name three practical means of providing liturgical and spiritual formation to a choir.', NULL, NULL, 'Any three: brief study of the coming Sunday’s readings at rehearsal; an annual retreat or day of recollection; rehearsing in the church; praying the text before singing it.', 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'Give three pieces of counsel for working with clergy from §17.6.', NULL, NULL, 'Any three from §17.6: establish the decision-making process before it is needed; bring the text rather than the opinion; concede small things quickly and reserve capital for what matters; put policies in writing, especially for weddings and funerals; assume good faith.', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'What does the handbook name as the ultimate measure of a director?', NULL, NULL, 'Whether the ministry survives them.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 18 — African American Catholic Liturgy: History and Evolution
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 18 — African American Catholic Liturgy: History and Evolution';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 18 — African American Catholic Liturgy: History and Evolution', 'Chapter 18 of Understanding the Mass. 12 questions, 12 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 12, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 18 of Understanding the Mass. 12 questions, 12 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 12, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'multiple_choice', 'The first Roman Catholic religious congregation of women of African descent in the world was founded in:', '[{"id": "a", "text": "New Orleans, 1842"}, {"id": "b", "text": "Baltimore, 1829"}, {"id": "c", "text": "Washington, D.C., 1858"}, {"id": "d", "text": "Bay St. Louis, 1920"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 1, 'short_answer', 'Name its founder.', NULL, NULL, 'Mother Mary Elizabeth Lange.', 1, v_tenant_id),
    (v_test_id, 2, 'true_false', 'Catholicism was entirely unknown to Africans before their arrival in the Americas.', NULL, 'false'::jsonb, 'The Kingdom of Kongo adopted Catholicism in 1491; many Africans brought to the Americas, especially to Louisiana and the Caribbean, arrived already Catholic.', 1, v_tenant_id),
    (v_test_id, 3, 'short_answer', 'Who was Fr. Augustus Tolton, and why did he study in Rome?', NULL, NULL, 'Born enslaved in Missouri; the first publicly acknowledged Black priest serving in the United States. He studied in Rome because every American seminary refused him.', 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'Who convened the Colored Catholic Congresses, and in what years did they meet?', NULL, NULL, 'Daniel Rudd, publisher of the American Catholic Tribune; 1889–1894.', 1, v_tenant_id),
    (v_test_id, 5, 'multiple_choice', 'An American Mass Program was published in:', '[{"id": "a", "text": "1945"}, {"id": "b", "text": "1963"}, {"id": "c", "text": "1970"}, {"id": "d", "text": "1987"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 6, 'short_answer', 'Name the four foundational documents of African American Catholic worship, with dates.', NULL, NULL, 'What We Have Seen and Heard (1984); In Spirit and Truth (1988); Lead Me, Guide Me (1987); Plenty Good Room (1990).', 1, v_tenant_id),
    (v_test_id, 7, 'true_false', 'In Spirit and Truth requested exemptions from the Order of Mass for Black Catholic communities.', NULL, 'false'::jsonb, 'It demonstrated that the existing options within the Order of Mass already permitted celebration in an African American idiom.', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'Who was the principal writer of Plenty Good Room?', NULL, NULL, 'Fr. J-Glenn Murray, SJ.', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'Who coordinated the Lead Me, Guide Me hymnal project, and what see did he later lead?', NULL, NULL, 'Bishop James P. Lyke, OFM; he later became Archbishop of Atlanta.', 1, v_tenant_id),
    (v_test_id, 10, 'short_answer', 'Why does the USCCB describe Plenty Good Room as applicable beyond the African American community?', NULL, NULL, 'Because its chapters on symbol, the Christ event, and liturgy and culture apply to any culturally distinct community, and can serve as a model for discerning the heritage of a particular group.', 1, v_tenant_id),
    (v_test_id, 11, 'short_answer', 'Name the six African American Catholics with open causes for canonization.', NULL, NULL, 'Pierre Toussaint; Henriette Delille; Mary Elizabeth Lange; Augustus Tolton; Julia Greeley; Thea Bowman.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 19 — The Style: Musical and Ritual Characteristics
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 19 — The Style: Musical and Ritual Characteristics';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 19 — The Style: Musical and Ritual Characteristics', 'Chapter 19 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 19 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'short_answer', 'Name Sister Thea Bowman’s five characteristics of Black sacred song.', NULL, NULL, 'Holistic; participatory; real; spirit-filled; life-giving.', 1, v_tenant_id),
    (v_test_id, 1, 'multiple_choice', 'In Bowman’s framework, “Real” means the song:', '[{"id": "a", "text": "uses authentic instruments"}, {"id": "b", "text": "celebrates the immediate concrete reality of the worshiping community"}, {"id": "c", "text": "avoids metaphor"}, {"id": "d", "text": "is historically accurate"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'Explain why call and response maps naturally onto the Roman Rite. Give three specific liturgical elements.', NULL, NULL, 'Because both traditions are structured on leader-and-community exchange. Examples (any three): the Kyrie as litany; the Agnus Dei as litany; the Responsorial Psalm; the Prayer of the Faithful; the priest–people dialogues.', 1, v_tenant_id),
    (v_test_id, 3, 'true_false', 'In this tradition, printed notation is best understood as a precise transcription of how a piece is performed.', NULL, 'false'::jsonb, 'The notation is a script for performance, not a transcript; the second edition of Lead Me, Guide Me specifically notated to reflect actual performance practice.', 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'Define heterophony and explain why it is not an error.', NULL, NULL, 'Multiple simultaneous variants of a single melody. It is not an error but a texture — the tradition’s way of singing one melody many ways at once.', 1, v_tenant_id),
    (v_test_id, 5, 'short_answer', 'What is a vamp, and what liturgical problem does it solve?', NULL, NULL, 'An extended repetition of a short harmonic/melodic cell, often rising in intensity. It solves the processional problem at Communion (memorable refrains repeated often, per STL 192) and the problem of covering an action of unpredictable length.', 1, v_tenant_id),
    (v_test_id, 6, 'multiple_choice', 'The permission in GIRM 83 to repeat the Agnus Dei as needed:', '[{"id": "a", "text": "applies only to concelebrations"}, {"id": "b", "text": "makes the Agnus Dei especially idiomatic in this tradition"}, {"id": "c", "text": "was revoked in 2011"}, {"id": "d", "text": "applies only in Latin"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'Name the two failure modes described in §19.5 and give one example of each.', NULL, NULL, '(i) Liturgical dissolution — e.g., paraphrasing the Gloria text, replacing the psalm with a song, instrumental underscoring of the Eucharistic Prayer. (ii) Token inculturation — e.g., one spiritual at Communion during Black History Month in an otherwise unchanged liturgy.', 1, v_tenant_id),
    (v_test_id, 8, 'true_false', 'Sing to the Lord warns against tokenism in the use of music from other cultures.', NULL, 'true'::jsonb, '(STL 60).', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'State Plenty Good Room’s core theological argument for cultural adaptation.', NULL, NULL, 'Liturgy works through symbol; symbols are culturally embedded; therefore engaging a people’s symbols engages that people, and cultural adaptation is a requirement of sacramental effectiveness rather than a concession to preference.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 20 — Prominent Figures
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 20 — Prominent Figures';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 20 — Prominent Figures', 'Chapter 20 of Understanding the Mass. 10 questions, 10 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 10, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 20 of Understanding the Mass. 10 questions, 10 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 10, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'multiple_choice', 'Match the figure to the contribution: Figure Contribution', '[{"id": "a", "text": "Clarence Rivers"}, {"id": "b", "text": "Thea Bowman"}, {"id": "c", "text": "Leon C. Roberts"}, {"id": "d", "text": "J-Glenn Murray e) Grayson Warren Brown i) Mass of St. Augustine ii) An American Mass Program; “God Is Love” iii) “The Gift of African American Sacred Song” iv) Hymns of a Soulfull People v) Principal writer of Plenty Good Room"}]'::jsonb, '"a"'::jsonb, '–ii; b–iii; c–i; d–v; e–iv.', 1, v_tenant_id),
    (v_test_id, 1, 'short_answer', 'In what year and at what event did Clarence Rivers’s “God Is Love” receive a reported ten-minute ovation?', NULL, NULL, '1964, at the National Liturgical Conference in St. Louis, at the first official Englishlanguage high Mass in the United States.', 1, v_tenant_id),
    (v_test_id, 2, 'true_false', 'Rivers was the first African American priest ordained for the Archdiocese of Cincinnati.', NULL, 'true'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 3, 'short_answer', 'What journal did Rivers edit, and for what organization?', NULL, NULL, 'Freeing the Spirit, for the National Office for Black Catholics (Department of Culture and Worship).', 1, v_tenant_id),
    (v_test_id, 4, 'short_answer', 'On what date did Sister Thea Bowman address the U.S. bishops, and with what song did she begin?', NULL, NULL, '17 June 1989; she began by singing “Sometimes I Feel Like a Motherless Child.”', 1, v_tenant_id),
    (v_test_id, 5, 'multiple_choice', 'M. Roger Holland II is the editor of:', '[{"id": "a", "text": "Lead Me, Guide Me, 2nd edition"}, {"id": "b", "text": "the In Spirit and Truth series published by GIA"}, {"id": "c", "text": "Freeing the Spirit"}, {"id": "d", "text": "Plenty Good Room"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 6, 'short_answer', 'Where did Leon C. Roberts serve as choir director?', NULL, NULL, 'The Church of Sts. Paul and Augustine, Washington, D.C.', 1, v_tenant_id),
    (v_test_id, 7, 'true_false', 'James E. Moore, Jr.’s “Taste and See” is sung almost exclusively in Black Catholic parishes.', NULL, 'false'::jsonb, 'It is among the most widely sung pieces of Catholic liturgical music worldwide.', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'For whom is the Lyke House Catholic Center named, and what was his role in Black Catholic liturgical music?', NULL, NULL, 'Archbishop James P. Lyke, OFM, Archbishop of Atlanta; he coordinated the Lead Me, Guide Me hymnal project.', 1, v_tenant_id),
    (v_test_id, 9, 'short_answer', 'What distinguishes Kevin Phillip Johnson’s liturgical catalog, and what argument does the handbook say it makes?', NULL, NULL, 'Seven Mass settings and more than 300 psalm settings. The handbook argues the psalm catalog is a sustained argument that the Responsorial Psalm — the element most often treated as filler — deserves the full attention of a serious composer, and can be set in an African American idiom without ceasing to be what the Lectionary says it is.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Quiz 21 — Practice in the African American Catholic Tradition
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Quiz 21 — Practice in the African American Catholic Tradition';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Quiz 21 — Practice in the African American Catholic Tradition', 'Chapter 21 of Understanding the Mass. 9 questions, 9 points.', 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
            'quiz', 9, 20,
            true,
            2,
            true, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Chapter 21 of Understanding the Mass. 9 questions, 9 points.', instructions = 'Multiple choice and true/false grade automatically. Short answers are read by the instructor — answer in a sentence or two; the model answer is released with your grade.',
           total_points = 9, duration_minutes = 20, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'short_answer', 'What “double competence” does Musicam Sacram 61 require?', NULL, NULL, 'Knowledge of both the liturgy and musical tradition of the Church, and of the language, songs, and characteristic expressions of the people served.', 1, v_tenant_id),
    (v_test_id, 1, 'true_false', 'In gospel-idiom liturgy, the Gloria text may be freely paraphrased to fit the music.', NULL, 'false'::jsonb, 'GIRM 53: the text may not be replaced by any other text.', 1, v_tenant_id),
    (v_test_id, 2, 'short_answer', 'Which element of the Ordinary does the handbook identify as the single most idiomatic in this tradition, and why?', NULL, NULL, 'The Agnus Dei — because its litany form, its permission to be repeated as often as necessary, and the permission for additional Christological invocations (GIRM 83; STL 188) correspond exactly to the vamped, extended litany native to the idiom.', 1, v_tenant_id),
    (v_test_id, 3, 'short_answer', 'Explain the distinct roles of piano and organ in gospel ensemble practice.', NULL, NULL, 'The piano typically carries rhythm and harmonic drive; the organ sustains, fills, colors, and responds — answering singers, swelling under builds, and carrying the vamp.', 1, v_tenant_id),
    (v_test_id, 4, 'multiple_choice', 'The main pastoral issue with a drum kit in a live worship space is:', '[{"id": "a", "text": "cost"}, {"id": "b", "text": "volume discipline, since it can prevent the singing it is meant to support"}, {"id": "c", "text": "rubrical prohibition"}, {"id": "d", "text": "tuning"}]'::jsonb, '"b"'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 5, 'true_false', 'A gospel-idiom setting of the Responsorial Psalm is inherently improper.', NULL, 'false'::jsonb, 'Call and response is responsorial psalmody; such a setting is a proper realization provided the text is a psalm or paraphrase, it is sung from the ambo, and it does not become a solo showcase.', 1, v_tenant_id),
    (v_test_id, 6, 'short_answer', 'Name three elements of a well-rehearsed vamp.', NULL, NULL, 'Any three: how it builds; who cues; where it lands; how it ends; how long it may need to run.', 1, v_tenant_id),
    (v_test_id, 7, 'short_answer', 'Name three foundational published resources for repertoire in this tradition.', NULL, NULL, 'Any three: Lead Me, Guide Me, 2nd ed. (GIA, 2012); the In Spirit and Truth series (GIA); Roberts’s Mass of St. Augustine; Rivers’s An American Mass Program; the spirituals in congregational and choral arrangements.', 1, v_tenant_id),
    (v_test_id, 8, 'short_answer', 'Quote or paraphrase Fr. J-Glenn Murray’s summary principle, and explain why both halves matter.', NULL, NULL, '“It respected the form of the liturgy and also allowed us to bring who we were.” Both halves matter because dropping the first produces liturgical dissolution and dropping the second produces tokenism — the two failure modes of §19.5.', 1, v_tenant_id);

  -- ---------------------------------------------------------------
  -- Final Examination — Sections I–III
  -- ---------------------------------------------------------------
  SELECT id INTO v_test_id FROM public.gw_course_tests
   WHERE course_id = v_course_id AND title = 'Final Examination — Sections I–III';

  IF v_test_id IS NULL THEN
    INSERT INTO public.gw_course_tests
      (course_id, title, description, instructions, test_type, total_points,
       duration_minutes, allow_retakes, max_attempts, show_results_immediately,
       is_published)
    VALUES (v_course_id, 'Final Examination — Sections I–III', 'Comprehensive final covering the whole handbook. 140 points here; Section IV (four essays, 60 points) is submitted as an assignment. 200 total.', 'Time: 3 hours for the complete examination including the essays. Passing is 150 of 200 (75%). Multiple choice and true/false grade automatically; short answers are read by the instructor.',
            'exam', 140, 180,
            false,
            1,
            false, true)
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.gw_course_tests
       SET description = 'Comprehensive final covering the whole handbook. 140 points here; Section IV (four essays, 60 points) is submitted as an assignment. 200 total.', instructions = 'Time: 3 hours for the complete examination including the essays. Passing is 150 of 200 (75%). Multiple choice and true/false grade automatically; short answers are read by the instructor.',
           total_points = 140, duration_minutes = 180, updated_at = now()
     WHERE id = v_test_id;
    DELETE FROM public.gw_course_test_questions WHERE test_id = v_test_id;
  END IF;

  INSERT INTO public.gw_course_test_questions
    (test_id, position, question_type, prompt, options, correct_answer, explanation, points, tenant_id)
  VALUES
    (v_test_id, 0, 'multiple_choice', 'Sacrosanctum Concilium calls the liturgy the “summit toward which the activity of the Church is directed” in article:', '[{"id": "a", "text": "7"}, {"id": "b", "text": "10"}, {"id": "c", "text": "14"}, {"id": "d", "text": "112"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 1, 'multiple_choice', 'The phrase participatio actuosa first appears in:', '[{"id": "a", "text": "Sacrosanctum Concilium (1963)"}, {"id": "b", "text": "Musicam Sacram (1967)"}, {"id": "c", "text": "Tra le Sollecitudini (1903)"}, {"id": "d", "text": "Mediator Dei (1947)"}]'::jsonb, '"c"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 2, 'multiple_choice', 'Which of the following is a text of the Proper?', '[{"id": "a", "text": "Credo"}, {"id": "b", "text": "Agnus Dei"}, {"id": "c", "text": "Communion antiphon"}, {"id": "d", "text": "Sanctus"}]'::jsonb, '"c"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 3, 'multiple_choice', 'The Credo entered the Roman Mass in:', '[{"id": "a", "text": "604"}, {"id": "b", "text": "1014"}, {"id": "c", "text": "1570"}, {"id": "d", "text": "1903"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 4, 'multiple_choice', 'According to Musicam Sacram 29–31, which belongs to the third degree?', '[{"id": "a", "text": "the Preface dialogue"}, {"id": "b", "text": "the Lord’s Prayer"}, {"id": "c", "text": "the Alleluia before the Gospel"}, {"id": "d", "text": "the Sanctus"}]'::jsonb, '"c"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 5, 'multiple_choice', 'The rule governing the three degrees is that:', '[{"id": "a", "text": "all three must always be used together"}, {"id": "b", "text": "the first may be used alone, but the second and third never without the first"}, {"id": "c", "text": "the third is most important"}, {"id": "d", "text": "parishes may choose any order"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 6, 'multiple_choice', 'In the dioceses of the United States, “a suitable liturgical song” at the Entrance is:', '[{"id": "a", "text": "the first option"}, {"id": "b", "text": "the second option"}, {"id": "c", "text": "the third option"}, {"id": "d", "text": "the fourth option"}]'::jsonb, '"d"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 7, 'multiple_choice', 'A hymn may replace the Responsorial Psalm:', '[{"id": "a", "text": "never"}, {"id": "b", "text": "only if it at least paraphrases a psalm"}, {"id": "c", "text": "at the discretion of the music director"}, {"id": "d", "text": "on solemnities only"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 8, 'multiple_choice', 'The Gloria text:', '[{"id": "a", "text": "may be paraphrased for musical reasons"}, {"id": "b", "text": "may not be replaced by any other text"}, {"id": "c", "text": "may be shortened on weekdays"}, {"id": "d", "text": "may be moved to the Preparation of the Gifts"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 9, 'multiple_choice', 'If the Gospel Acclamation is not sung, it is:', '[{"id": "a", "text": "recited by all"}, {"id": "b", "text": "recited by the cantor"}, {"id": "c", "text": "omitted"}, {"id": "d", "text": "replaced by silence"}]'::jsonb, '"c"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 10, 'multiple_choice', 'Sequences are required on:', '[{"id": "a", "text": "Easter and Pentecost"}, {"id": "b", "text": "Christmas and Easter"}, {"id": "c", "text": "Corpus Christi and Our Lady of Sorrows"}, {"id": "d", "text": "all solemnities"}]'::jsonb, '"a"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 11, 'multiple_choice', 'During the Eucharistic Prayer, apart from the people’s acclamations:', '[{"id": "a", "text": "soft instrumental music is encouraged"}, {"id": "b", "text": "the organ should be silent"}, {"id": "c", "text": "the choir may vocalize"}, {"id": "d", "text": "the cantor may sing quietly"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 12, 'multiple_choice', 'Sing to the Lord 178 recommends stylistic unity among:', '[{"id": "a", "text": "the Entrance, Offertory, and Communion"}, {"id": "b", "text": "the Kyrie, Gloria, and Credo"}, {"id": "c", "text": "the Sanctus, Memorial Acclamation, and Great Amen"}, {"id": "d", "text": "all music at a given Mass"}]'::jsonb, '"c"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 13, 'multiple_choice', 'The Agnus Dei accompanies:', '[{"id": "a", "text": "the Sign of Peace"}, {"id": "b", "text": "the fraction"}, {"id": "c", "text": "the Communion procession"}, {"id": "d", "text": "the Lord’s Prayer"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 14, 'multiple_choice', 'Sing to the Lord 187 states that the Sign of Peace:', '[{"id": "a", "text": "should be accompanied by a peace song"}, {"id": "b", "text": "must not be protracted by the singing of a song"}, {"id": "c", "text": "may be extended for pastoral reasons"}, {"id": "d", "text": "requires instrumental music"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 15, 'multiple_choice', 'A recessional hymn is:', '[{"id": "a", "text": "required by the GIRM"}, {"id": "b", "text": "required on Sundays only"}, {"id": "c", "text": "not prescribed by the Missal, but permitted as a custom"}, {"id": "d", "text": "forbidden in Lent"}]'::jsonb, '"c"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 16, 'multiple_choice', 'The Agnus Dei was introduced by:', '[{"id": "a", "text": "Gregory the Great"}, {"id": "b", "text": "Sergius I"}, {"id": "c", "text": "Pius V"}, {"id": "d", "text": "Gelasius"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 17, 'multiple_choice', 'The Sanctus combines texts from:', '[{"id": "a", "text": "Isaiah 6 and Psalm 118 / Matthew 21"}, {"id": "b", "text": "Revelation 4 and John 1"}, {"id": "c", "text": "Exodus 15 and Luke 2"}, {"id": "d", "text": "Daniel 3 and Psalm 150"}]'::jsonb, '"a"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 18, 'multiple_choice', 'Tra le Sollecitudini names as required qualities of sacred music:', '[{"id": "a", "text": "beauty, clarity, dignity"}, {"id": "b", "text": "holiness, goodness of form, universality"}, {"id": "c", "text": "tradition, simplicity, participation"}, {"id": "d", "text": "chant, polyphony, organ"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 19, 'multiple_choice', 'Musicam Sacram 9 states that:', '[{"id": "a", "text": "only chant and polyphony are admitted"}, {"id": "b", "text": "no kind of sacred music is prohibited if it corresponds to the spirit of the celebration and does not hinder participation"}, {"id": "c", "text": "popular music is excluded"}, {"id": "d", "text": "the bishop must approve each composition"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 20, 'multiple_choice', 'Sacrosanctum Concilium 119 concerns:', '[{"id": "a", "text": "the pipe organ"}, {"id": "b", "text": "the musical traditions of peoples, especially in mission lands"}, {"id": "c", "text": "the training of choirs"}, {"id": "d", "text": "the treasury of sacred music"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 21, 'multiple_choice', 'Sing to the Lord 136 states that sufficiency of artistic expression:', '[{"id": "a", "text": "is the same as musical style"}, {"id": "b", "text": "is not the same as musical style"}, {"id": "c", "text": "requires Gregorian chant"}, {"id": "d", "text": "is determined by the assembly"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 22, 'multiple_choice', 'The minimum Latin chants every U.S. community should learn are:', '[{"id": "a", "text": "Gloria VIII, Credo III, Pater Noster"}, {"id": "b", "text": "Kyrie XVI, Sanctus XVIII, Agnus Dei XVIII"}, {"id": "c", "text": "Missa de Angelis entire"}, {"id": "d", "text": "the Requiem Mass"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 23, 'multiple_choice', 'The primary role of the organist is to:', '[{"id": "a", "text": "provide artistic performance"}, {"id": "b", "text": "lead and sustain the singing without dominating"}, {"id": "c", "text": "fill silences"}, {"id": "d", "text": "accompany the choir only"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 24, 'multiple_choice', 'According to Sing to the Lord 39, the cantor need not be visible when:', '[{"id": "a", "text": "the choir is singing"}, {"id": "b", "text": "the congregation is singing very familiar music without cantor verses"}, {"id": "c", "text": "the priest is at the altar"}, {"id": "d", "text": "never — the cantor must always be visible"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 25, 'multiple_choice', 'The psalmist sings from:', '[{"id": "a", "text": "the cantor’s stand"}, {"id": "b", "text": "the ambo"}, {"id": "c", "text": "the choir loft"}, {"id": "d", "text": "the sanctuary steps"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 26, 'multiple_choice', 'The first Roman Catholic religious congregation of women of African descent was founded in:', '[{"id": "a", "text": "1789"}, {"id": "b", "text": "1829"}, {"id": "c", "text": "1842"}, {"id": "d", "text": "1893"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 27, 'multiple_choice', 'An American Mass Program was composed by:', '[{"id": "a", "text": "Leon C. Roberts"}, {"id": "b", "text": "Clarence Rivers"}, {"id": "c", "text": "Grayson Warren Brown"}, {"id": "d", "text": "Thea Bowman"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 28, 'multiple_choice', 'Thea Bowman’s five characteristics of Black sacred song are: holistic, participatory, real, spirit-filled, and:', '[{"id": "a", "text": "joyful"}, {"id": "b", "text": "communal"}, {"id": "c", "text": "life-giving"}, {"id": "d", "text": "prophetic"}]'::jsonb, '"c"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 29, 'multiple_choice', 'The principal writer of Plenty Good Room was:', '[{"id": "a", "text": "Bishop James P. Lyke"}, {"id": "b", "text": "Fr. J-Glenn Murray, SJ"}, {"id": "c", "text": "Fr. Clarence Rivers"}, {"id": "d", "text": "Sister Thea Bowman"}]'::jsonb, '"b"'::jsonb, NULL, 2, v_tenant_id),
    (v_test_id, 30, 'true_false', 'Christ is present in the liturgy only under the Eucharistic species.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 31, 'true_false', 'Listening attentively to the choir is a genuine form of active participation.', NULL, 'true'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 32, 'true_false', 'Gregorian chant was personally composed by Pope Gregory the Great.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 33, 'true_false', 'The Ordinary consists of texts that change with the liturgical day.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 34, 'true_false', 'The dialogues between priest and people belong to the first degree of Musicam Sacram.', NULL, 'true'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 35, 'true_false', 'A parish may sing the Gloria on the Sundays of Advent.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 36, 'true_false', 'The Responsorial Psalm is a reading from Scripture.', NULL, 'true'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 37, 'true_false', 'If the Responsorial Psalm cannot be sung fully, the response alone may be sung while the lector reads the verses.', NULL, 'true'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 38, 'true_false', 'The second reading on Sundays is chosen to match the Gospel.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 39, 'true_false', 'The Alleluia is sung during Lent.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 40, 'true_false', 'Nothing is required to be sung at the Preparation of the Gifts.', NULL, 'true'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 41, 'true_false', 'The priest sings the Memorial Acclamation with the assembly.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 42, 'true_false', 'The Agnus Dei may be repeated as often as necessary.', NULL, 'true'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 43, 'true_false', 'The doxology of the Lord’s Prayer belongs to the priest.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 44, 'true_false', 'Silence is an appropriate option at the conclusion of Mass during Lent.', NULL, 'true'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 45, 'true_false', 'Cassock and surplice are recommended as choir vesture.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 46, 'true_false', 'Sing to the Lord addresses the just compensation of music ministers.', NULL, 'true'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 47, 'true_false', 'The three judgments may be applied independently of each other.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 48, 'true_false', 'In Spirit and Truth worked within the existing options of the Order of Mass.', NULL, 'true'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 49, 'true_false', 'Solo organ playing is permitted throughout Lent.', NULL, 'false'::jsonb, NULL, 1, v_tenant_id),
    (v_test_id, 50, 'short_answer', 'Name the four (or five) modes of Christ’s presence in the liturgy per SC 7.', NULL, NULL, 'In the person of the minister; under the Eucharistic species; in the sacraments; in his word; when the Church prays and sings.', 4, v_tenant_id),
    (v_test_id, 51, 'short_answer', 'Define anamnesis.', NULL, NULL, 'A remembering that makes present — the sacramental re-presentation of Christ’s one saving act so the present assembly enters it.', 4, v_tenant_id),
    (v_test_id, 52, 'short_answer', 'State the “all and only” principle and name one failure in each direction.', NULL, NULL, 'SC 28: each minister carries out “all and only” those parts belonging to his office. Doing less — e.g., a priest who will not sing the dialogues. Doing more — e.g., a cantor who sings the assembly’s parts, or a priest whose voice dominates the responses.', 4, v_tenant_id),
    (v_test_id, 53, 'short_answer', 'List the three degrees of Musicam Sacram with two elements from each.', NULL, NULL, 'First: e.g., the priest–people greeting and reply; the Preface with its dialogue and the Sanctus. Second: e.g., the Kyrie and Gloria; the Creed. Third: e.g., the Entrance and Communion songs; the Alleluia.', 4, v_tenant_id),
    (v_test_id, 54, 'short_answer', 'State the four purposes of the Entrance chant per GIRM 47.', NULL, NULL, 'Open the celebration; foster unity; introduce thoughts to the mystery of the season or festivity; accompany the procession.', 4, v_tenant_id),
    (v_test_id, 55, 'short_answer', 'Name the three forms of the Penitential Act and explain how Form C differs structurally.', NULL, NULL, 'Form A — the Confiteor; Form B — the versicle-and-response dialogue; Form C — the tropes. In Forms A and B the Kyrie follows as a distinct element; in Form C the Kyrie is integral to the Penitential Act itself.', 4, v_tenant_id),
    (v_test_id, 56, 'short_answer', 'Identify the four structural sections of the Gloria and describe the dynamic shape appropriate to each.', NULL, NULL, '(i) Angelic acclamation — bright, forte, outward. (ii) Cascading praise of the Father — sustained, building. (iii) Praise of the Son with petitions — soften, warmer, more intimate. (iv) Final acclamation and doxology — build to full, strong Amen.', 4, v_tenant_id),
    (v_test_id, 57, 'short_answer', 'Explain why the Sanctus requires two different expressive characters.', NULL, NULL, 'Because it combines two Scripture sources: Isaiah 6:3, the seraphim’s heavenly acclamation before the throne (awe, spacious, ascending), and Psalm 118:26 / Matthew 21:9, the Palm Sunday crowd’s earthly shout and welcome (acclamation, brighter, with Benedictus more intimate because the One acclaimed is coming now).', 4, v_tenant_id),
    (v_test_id, 58, 'short_answer', 'Explain the original function of the Agnus Dei and one practical consequence for performance.', NULL, NULL, 'It was introduced by Sergius I to accompany the fraction of the bread, which took time with large loaves and large congregations. Practical consequence (any one): it must begin with the fraction rather than after it; it may be repeated as needed; additional Christological invocations may be used with Agnus Dei first and last.', 4, v_tenant_id),
    (v_test_id, 59, 'short_answer', 'State the four options for the Entrance and Communion chants in U.S. dioceses.', NULL, NULL, '(1) The antiphon from the Missal or the psalm from the Graduale Romanum; (2) the seasonal antiphon and psalm of the Graduale Simplex; (3) a song from another approved collection of psalms and antiphons, including responsorial or metrical arrangements; (4) a suitable liturgical song similarly approved.', 4, v_tenant_id),
    (v_test_id, 60, 'short_answer', 'Name the three judgments, and state the single question they together answer.', NULL, NULL, 'Liturgical, pastoral, musical. Together: “Is this particular piece of music appropriate for this use in the particular Liturgy?”', 4, v_tenant_id),
    (v_test_id, 61, 'short_answer', 'Give four practical steps for effective hymn introductions and congregational leadership at the organ.', NULL, NULL, 'Any four: play enough introduction to establish key, tempo, meter, and character (final phrase, or first plus last, or whole tune); set and keep the tempo; allow a lift at phrase ends for breathing; keep a consistent, predictable break between stanzas; use detached articulation for rhythmic clarity; reserve reharmonization and descants for stanzas the text justifies; play the melody clearly if the assembly is uncertain.', 4, v_tenant_id),
    (v_test_id, 62, 'short_answer', 'Describe the correct order of preparation for a cantor learning a responsorial psalm, and explain why the order matters.', NULL, NULL, 'Read the psalm aloud without music; read the first reading and Gospel; mark stresses, phrase ends, and the key word of each verse; then learn the notes. The order matters because learning notes first produces a singer of notes, while learning the text first produces a proclaimer of Scripture — and because the psalm’s placement between the first reading and the Gospel governs its interpretation.', 4, v_tenant_id),
    (v_test_id, 63, 'short_answer', 'Name the four foundational documents of African American Catholic worship with their dates and one sentence on each.', NULL, NULL, 'What We Have Seen and Heard (1984) — pastoral letter of the ten Black Catholic bishops on evangelization, claiming Black Catholics as agents with a gift for the whole Church. In Spirit and Truth (1988) — Black Liturgy Subcommittee statement identifying the options already within the Order of Mass. Lead Me, Guide Me (1987) — the first hymnal by and for Black Catholics, coordinated by Bishop Lyke, with Bowman’s essay. Plenty Good Room (1990) — the NCCB’s theological foundation for cultural adaptation, principal writer Fr. J-Glenn Murray, SJ.', 4, v_tenant_id),
    (v_test_id, 64, 'short_answer', 'Name Bowman’s five characteristics of Black sacred song, with a phrase of explanation for each.', NULL, NULL, 'Holistic — engages mind, imagination, memory, feeling, voice, and body. Participatory — invites the community into contemplation, celebration, and prayer. Real — celebrates the community’s concrete reality, including grief and struggle. Spiritfilled — energized and passionate. Life-giving — refreshes, encourages, strengthens.', 4, v_tenant_id);

  RAISE NOTICE 'Quiz bank seeded for course %', v_course_id;
END $$;
