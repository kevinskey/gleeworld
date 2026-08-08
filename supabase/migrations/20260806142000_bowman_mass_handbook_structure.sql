-- Bowman Scholars (MUS-240), Fall 2026 — course structure built on
-- "Understanding the Mass: A Handbook of Catholic Liturgy and Liturgical Music
-- for Cantors, Organists, Choir Directors, and All Who Serve the Rite."
--
-- This migration seeds MODULES, ASSIGNMENTS, and DISCUSSIONS only.
-- The quiz bank (21 chapter quizzes + the final examination, ~280 questions
-- transcribed from the handbook's own Chapters 22-24) ships in a companion
-- migration so the two can be reviewed independently — structure is a design
-- judgment, the quiz bank is a transcription.
--
-- SAFE TO RE-RUN. Every insert is keyed on a stable natural key and uses
-- ON CONFLICT DO UPDATE, so applying this twice converges rather than
-- duplicating. Nothing is deleted.
--
-- SEMESTER DATES: derived from a single anchor below. Fall 2026 week 1 is
-- taken as Monday 24 August 2026. Change SEMESTER_START in the CTE and every
-- unlock date moves with it.

DO $$
DECLARE
  v_course_id   uuid;
  v_author_id   uuid;
  v_start       date := DATE '2026-08-24';  -- Monday of week 1
BEGIN
  -- ---------------------------------------------------------------------
  -- Resolve the course. Matched on course_code + semester so this cannot
  -- silently attach to a different term's section of the same course.
  -- ---------------------------------------------------------------------
  SELECT id, COALESCE(instructor_id, created_by)
    INTO v_course_id, v_author_id
  FROM public.gw_courses
  WHERE (course_code = 'MUS-240' OR code = 'MUS-240')
    AND (semester ILIKE '%Fall%2026%' OR term ILIKE '%Fall%2026%')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION
      'Bowman Scholars MUS-240 Fall 2026 not found. Check gw_courses.course_code and semester before re-running; this migration deliberately refuses to guess which course to seed.';
  END IF;

  -- gw_course_discussions.author_id is NOT NULL. If the course carries no
  -- instructor, fall back to a platform super-admin rather than failing the
  -- whole migration on the discussion inserts.
  IF v_author_id IS NULL THEN
    SELECT user_id INTO v_author_id
    FROM public.gw_profiles
    WHERE is_super_admin = true
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'No instructor on the course and no super-admin found; cannot author discussions.';
  END IF;

  -- ---------------------------------------------------------------------
  -- MODULES — 14 content weeks grouped under the handbook's four parts,
  -- plus an assessment week. Chapter groupings follow the book's own
  -- structure; weeks 4 and 11 carry three short chapters each because those
  -- chapters (Concluding Rites; the three minister chapters) are brief and
  -- read as a unit.
  -- ---------------------------------------------------------------------
  INSERT INTO public.gw_course_modules
    (course_id, module_id, title, description, week_number, display_order, semester,
     learning_objectives, unlock_date, is_active)
  VALUES
    (v_course_id, 'mass-w01', 'Part One · What the Liturgy Is',
     'Chapter 1. The liturgy as the action of Christ, not primarily of the Church. The Paschal Mystery, the sacramental principle, and the most misunderstood word in modern liturgy: participation.',
     1, 10, 'Fall 2026',
     '["Explain the five modes of Christ''s presence in the liturgy (SC 7)","Define anamnesis and the sacramental principle","Distinguish internal from external participation and defend why listening is participation (MS 15, STL 12)","State why a musician''s decisions are liturgical decisions, not merely aesthetic ones"]'::jsonb,
     (v_start + 0)::timestamptz, true),

    (v_course_id, 'mass-w02', 'Part One · How the Mass Got Its Shape / The Books and the Vocabulary',
     'Chapters 2-3. From synagogue and table blessing to the Roman Rite; Guido, Trent, Pius X, and Vatican II. Then the working vocabulary: the liturgical books, Proper versus Ordinary, the four options for the processional chants, progressive solemnity, and the liturgical year.',
     2, 20, 'Fall 2026',
     '["Trace the Mass''s structure to its two Jewish sources","Identify the major turning points from the 4th century through Sacrosanctum Concilium","Hold the Proper/Ordinary distinction correctly and apply it to a real Sunday","Apply progressive solemnity to decide what gets sung and when"]'::jsonb,
     (v_start + 7)::timestamptz, true),

    (v_course_id, 'mass-w03', 'Part Two · The Introductory Rites and the Liturgy of the Word',
     'Chapters 4-5. Entrance through Collect; then First Reading through the Universal Prayer — with the Responsorial Psalm and Gospel Acclamation treated as the musician''s core responsibilities.',
     3, 30, 'Fall 2026',
     '["Name the ritual purpose of each element from Entrance to Collect","Explain why the Responsorial Psalm is scripture and not a song slot","State the norms governing the Gospel Acclamation, including when it is omitted","Identify what the Sequence is and the four days it may or must be sung"]'::jsonb,
     (v_start + 14)::timestamptz, true),

    (v_course_id, 'mass-w04', 'Part Two · Eucharist, Communion, and Concluding Rites',
     'Chapters 6-8. Preparation of the Gifts through the Dismissal, including the Eucharistic Prayer''s acclamations and the character proper to the Communion chant.',
     4, 40, 'Fall 2026',
     '["Describe the structure of the Eucharistic Prayer and the assembly''s three acclamations","Explain the Fraction and why the Agnus Dei may be extended","Choose Communion music whose character fits the rite rather than the calendar alone","Explain the function of silence after Communion"]'::jsonb,
     (v_start + 21)::timestamptz, true),

    (v_course_id, 'mass-w05', 'Part Two · The Ordinary of the Mass',
     'Chapter 9. The five texts a musician sets and re-sets for a lifetime — Kyrie, Gloria, Credo, Sanctus, Agnus Dei — each in text, origin, function, norms, and character.',
     5, 50, 'Fall 2026',
     '["Give the origin and ritual function of each of the five Ordinary texts","State the norms governing when the Gloria and Credo are sung","Explain why the Sanctus belongs to the assembly and not to the choir alone","Evaluate a Mass setting against the character proper to each text"]'::jsonb,
     (v_start + 28)::timestamptz, true),

    (v_course_id, 'mass-w06', 'Part Two · Types and Forms of Mass',
     'Chapter 10. Degrees of solemnity; the ritual Masses a musician will actually be asked to serve — nuptial, funeral, and the rest; the Paschal Triduum; and where devotions properly stand (SC 13).',
     6, 60, 'Fall 2026',
     '["Distinguish the degrees of solemnity and their musical consequences","Plan music for a nuptial and a funeral Mass within the norms of the ritual books","Outline the distinct musical demands of each day of the Triduum","Situate devotions correctly relative to the liturgy"]'::jsonb,
     (v_start + 35)::timestamptz, true),

    (v_course_id, 'mass-w07', 'Part Three · A History of Music in Catholic Worship',
     'Chapter 11. Psalmody before the Church, the patristic ambivalence, the chant repertories, polyphony, Trent, the Cecilians and Solesmes, Vatican II and the vernacular, the world Church, gospel and jazz, and the contemporary question of rap and hip-hop.',
     7, 70, 'Fall 2026',
     '["Trace the repertories from synagogue psalmody to the vernacular era","Explain what Tra le Sollecitudini reformed and why","Describe what the documents actually say about musical idiom, as distinct from what is often claimed","Situate gospel and jazz within the Church''s musical tradition"]'::jsonb,
     (v_start + 42)::timestamptz, true),

    (v_course_id, 'mass-w08', 'Part Three · The Ministers of Music',
     'Chapter 12. Assembly, choir, psalmist, cantor, organist and instrumentalists, director of music ministries, priest and deacon — who does what, and why the assembly is named first.',
     8, 80, 'Fall 2026',
     '["State the proper role of each musical minister","Explain why the assembly is the primary musical minister","Describe the choir''s dual role — leading the assembly and singing what belongs to it alone","Define the director of music ministries'' responsibilities toward clergy and ensemble"]'::jsonb,
     (v_start + 49)::timestamptz, true),

    (v_course_id, 'mass-w09', 'Part Three · Judging and Choosing Music',
     'Chapter 13. The three judgments of Sing to the Lord — liturgical (127-129), pastoral (130-133), and musical (134-136) — plus a working checklist, repertoire building, and copyright.',
     9, 90, 'Fall 2026',
     '["Apply all three judgments to a specific piece and reach a defensible decision","Explain why the three judgments are one judgment in three aspects, not a ranked sequence","Build a parish repertoire that is singable, seasonal, and broad","State a musician''s copyright obligations"]'::jsonb,
     (v_start + 56)::timestamptz, true),

    (v_course_id, 'mass-w10', 'Part Three · Part-by-Part Musical Direction',
     'Chapter 14. Prelude to Concluding Rites: tempo, character, texture, and expression for every sung element, with the handbook''s quick-reference table. Craft counsel, not law.',
     10, 100, 'Fall 2026',
     '["Name the character proper to each sung element of the Mass","Choose tempi appropriate to room, assembly, idiom, and rank of day","Distinguish craft counsel from liturgical law and say why the distinction matters","Direct the Preface dialogue, Memorial Acclamation, and Great Amen as a single arc"]'::jsonb,
     (v_start + 63)::timestamptz, true),

    (v_course_id, 'mass-w11', 'Part Three · Organist, Cantor, and Choir Director',
     'Chapters 15-17. Registration, hymn playing, accompanying chant and other idioms, improvisation, and silence; the cantor''s technique, gesture, and interior disposition; the choir director''s threefold job, planning, rehearsal, and succession.',
     11, 110, 'Fall 2026',
     '["Build a registration plan for a hymn that serves the text and the assembly","Accompany chant and non-Western idioms appropriately","Demonstrate cantor gesture that invites rather than performs","Plan a rehearsal that forms the choir liturgically and spiritually, not only musically"]'::jsonb,
     (v_start + 70)::timestamptz, true),

    (v_course_id, 'mass-w12', 'Part Four · African American Catholic Liturgy: History and Evolution',
     'Chapter 18. African foundations, the Church and enslaved people in North America, the spirituals, institution-building 1829-1925, the turning of 1963-1970, and the four documents — What We Have Seen and Heard, In Spirit and Truth, Lead Me Guide Me, and Plenty Good Room.',
     12, 120, 'Fall 2026',
     '["Explain why this material is not an appendix to Catholic liturgy but part of it","Trace the tradition from African foundations through the post-conciliar turning","Identify each of the four foundational documents and what it contributes","State the universal law that grounds inculturation (SC 37-40, VL)"]'::jsonb,
     (v_start + 77)::timestamptz, true),

    (v_course_id, 'mass-w13', 'Part Four · The Style and the Figures Who Built It',
     'Chapters 19-20. Thea Bowman''s five marks; the musical and ritual characteristics of the tradition; what Plenty Good Room adds; the two failure modes. Then the people: Rivers, Bowman, Roberts, Brown, Harbor, Louis, Duncan, Holland, Gabriel-Burrow, Parker, Murray, Lyke, Moore.',
     13, 130, 'Fall 2026',
     '["State Thea Bowman''s five marks and recognize them in a live celebration","Describe the musical and ritual characteristics of the tradition concretely","Name the two failure modes and how each is avoided","Identify the major figures and their specific contributions to the repertory"]'::jsonb,
     (v_start + 84)::timestamptz, true),

    (v_course_id, 'mass-w14', 'Part Four · Practice: Directing in the African American Catholic Tradition',
     'Chapter 21. The double competence MS 61 requires; part-by-part application; the ensemble; the choir; repertoire. Both halves, not one.',
     14, 140, 'Fall 2026',
     '["Demonstrate the double competence — schooled musicianship and rooted idiom","Apply the tradition part-by-part across the Order of Mass","Build a repertoire that is both authentically rooted and liturgically sound","Articulate and defend the closing principle of the chapter"]'::jsonb,
     (v_start + 91)::timestamptz, true),

    (v_course_id, 'mass-w15', 'Assessment · Comprehensive Final Examination',
     'Chapter 23. Multiple choice, true/false, and short answer taken under exam conditions, plus four essays submitted as written work. 200 points total.',
     15, 150, 'Fall 2026',
     '["Demonstrate command of the Order of Mass, the Ordinary, and the norms governing music","Apply the three judgments to unseen repertoire","Argue in writing from the documents rather than from preference"]'::jsonb,
     (v_start + 98)::timestamptz, true)
  ON CONFLICT (course_id, module_id) DO UPDATE SET
    title               = EXCLUDED.title,
    description         = EXCLUDED.description,
    week_number         = EXCLUDED.week_number,
    display_order       = EXCLUDED.display_order,
    semester            = EXCLUDED.semester,
    learning_objectives = EXCLUDED.learning_objectives,
    unlock_date         = EXCLUDED.unlock_date,
    updated_at          = now();

  -- ---------------------------------------------------------------------
  -- ASSIGNMENTS — the handbook supplies its own quizzes, so these are
  -- deliberately NOT recall work. Each one asks the student to do the thing
  -- the chapter describes and defend the choice from the documents.
  --
  -- gw_course_assignments has no natural unique key, so each insert is
  -- guarded on (course_id, title) to keep this migration re-runnable.
  -- ---------------------------------------------------------------------
  INSERT INTO public.gw_course_assignments
    (course_id, title, description, instructions, assignment_type, points,
     due_date, available_from, allow_late_submissions, late_penalty_percent,
     is_published, display_order)
  SELECT * FROM (VALUES
    (v_course_id,
     'Proper and Ordinary: Anatomy of One Sunday',
     'Take a single Sunday from the current liturgical year and account for every sung and spoken element.',
     E'Choose one Sunday of Ordinary Time from the current year.\n\n1. List every element of the Mass in order, from Entrance to Dismissal.\n2. Label each as PROPER or ORDINARY, and cite where its text comes from (Missal, Lectionary, Graduale, hymnal).\n3. For each of the four processional chant options (§3.3), state which you would use for the Entrance and why.\n4. Apply progressive solemnity (§3.4): if this parish can sing only five things well, which five, and in what order of priority?\n\nOne to two pages. Cite the handbook by section number. You are being graded on whether the Proper/Ordinary distinction is held correctly throughout — §3.2 calls it "the distinction every musician must hold."',
     'standard', 50,
     (v_start + 27)::timestamptz, (v_start + 21)::timestamptz, true, 10, true, 10),

    (v_course_id,
     'Plan the Music for a Ritual Mass',
     'Prepare a complete music plan for either a nuptial Mass or a funeral Mass.',
     E'Choose ONE: a nuptial Mass (Order of Celebrating Matrimony) or a funeral Mass (Order of Christian Funerals).\n\nSubmit a complete plan naming every sung element, the specific setting or hymn, and the minister responsible. Then, in prose:\n\n1. Justify each choice against the ritual book''s own norms — not against what the family asked for.\n2. Identify one request you would expect to receive and decline, and write the two or three sentences you would actually say to the family. §10.2 is the relevant section; be pastoral and be clear.\n3. State the degree of solemnity you are working at and why.\n\nTwo to three pages plus the plan itself. The pastoral paragraph is worth as much as the plan — a musician who is right and unkind has failed the assignment.',
     'standard', 100,
     (v_start + 41)::timestamptz, (v_start + 35)::timestamptz, true, 10, true, 20),

    (v_course_id,
     'The Three Judgments Applied',
     'Evaluate one real piece of music against all three judgments of Sing to the Lord.',
     E'Select a piece currently in use in a parish you know — one you have actual reservations about, not an easy target.\n\nEvaluate it under each judgment separately, citing the paragraphs:\n• Liturgical judgment (STL 127-129)\n• Pastoral judgment (STL 130-133)\n• Musical judgment (STL 134-136)\n\nThen reach a decision: keep it, keep it with conditions, or retire it. Defend the decision.\n\nThe substance of this assignment is §13.1''s hardest point: the three judgments are three aspects of one judgment, not a ranked checklist. A paper that passes two and fails one, and concludes "two out of three," has misread the chapter. Show what you do when they genuinely pull against each other.\n\nTwo to three pages.',
     'standard', 100,
     (v_start + 62)::timestamptz, (v_start + 56)::timestamptz, true, 10, true, 30),

    (v_course_id,
     'Practicum: Cantor the Responsorial Psalm',
     'Prepare and record the Responsorial Psalm for an assigned Sunday.',
     E'You will be assigned a Sunday and its psalm.\n\nRecord yourself singing the psalm as you would at Mass: announce or intone the response, sing the verses, and cue the assembly. Audio or video; a phone is fine. Sung from the Lectionary or an approved setting.\n\nSubmit with a one-page written note covering:\n1. Your gesture — what you are doing with your hands and why (§16.3). If video, we will see it; if audio, describe it.\n2. Two decisions you made about pacing or word stress in the verses, and what drove them (§16.4).\n3. The interior disposition §16.6 asks for, in your own words. This is not a devotional exercise for its own sake; the chapter argues it is audible.\n\nGraded on the psalmody itself, not on vocal beauty. A modest voice that serves the text well scores higher than a fine voice that performs.',
     'practicum', 100,
     (v_start + 76)::timestamptz, (v_start + 70)::timestamptz, true, 10, true, 40),

    (v_course_id,
     'Registration Plan for a Hymn',
     'Build a stop-by-stop registration plan for a four-stanza hymn.',
     E'Choose a four- or five-stanza hymn in common use.\n\nSubmit a registration plan giving, stanza by stanza: the stops drawn, the manual, and the pedal. Then in prose:\n\n1. Explain what in the TEXT of each stanza drove the change. Registration that varies for variety''s sake is not what §15.4 describes.\n2. Identify where you would break, breathe, or rest the assembly.\n3. Note one place you would improvise or fill (§15.8), and one place you would leave silent (§15.9).\n\nIf you do not play organ, do this for piano or your primary instrument and adapt the vocabulary — the reasoning transfers, and §15.3 anticipates you.\n\nOne to two pages.',
     'standard', 75,
     (v_start + 76)::timestamptz, (v_start + 70)::timestamptz, true, 10, true, 50),

    (v_course_id,
     'Five Marks Repertoire Project',
     'Build and defend a season''s repertoire for an African American Catholic parish.',
     E'The capstone. Build a repertoire for one liturgical season (Advent, Lent, or Easter) for a parish in the African American Catholic tradition.\n\nSubmit:\n1. The full repertoire — Ordinary setting, psalms, processional and Communion music, service music — with sources.\n2. An analysis showing where Thea Bowman''s five marks (§19.1) are present, mark by mark. Where a mark is thin, say so.\n3. A section on the double competence (§21.1): what does this repertoire demand of the director, in both halves?\n4. A direct response to the two failure modes of §19.5. Name how your plan avoids each. This is the part most likely to be answered vaguely; be concrete.\n\nFour to six pages plus the repertoire list. This project is worth more than any other assignment because it is the one that asks for both halves at once — which §21.6 argues is the whole point.',
     'project', 150,
     (v_start + 97)::timestamptz, (v_start + 77)::timestamptz, true, 5, true, 60),

    (v_course_id,
     'Final Examination — Section IV: Essays',
     'The four essay questions of the comprehensive final, submitted as written work.',
     E'Sections I-III of the final are taken under exam conditions in the Quizzes area. Section IV is submitted here.\n\nAnswer all four essay questions. 15 points each, 60 points total.\n\nEach essay should argue from the documents — cite them — rather than from preference. §Preface, "A note on authority," draws the three levels: liturgical law, magisterial teaching, and craft counsel. An essay that presents craft counsel as though the Church had legislated it will lose points, and the handbook names that as "the most common failure in parish liturgical arguments."\n\nRoughly one page per essay.',
     'exam', 60,
     (v_start + 104)::timestamptz, (v_start + 98)::timestamptz, false, 0, true, 70)
  ) AS a(course_id, title, description, instructions, assignment_type, points,
         due_date, available_from, allow_late_submissions, late_penalty_percent,
         is_published, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.gw_course_assignments existing
    WHERE existing.course_id = a.course_id AND existing.title = a.title
  );

  -- ---------------------------------------------------------------------
  -- DISCUSSIONS — seeded as the opening post of each thread. Chosen for the
  -- places the handbook is genuinely arguable rather than merely factual;
  -- a discussion prompt with one right answer is a quiz in disguise.
  -- ---------------------------------------------------------------------
  INSERT INTO public.gw_course_discussions
    (course_id, title, content, author_id, is_pinned)
  SELECT * FROM (VALUES
    (v_course_id,
     'What brought you to this work?',
     E'The Preface says this handbook exists because two groups usually learn the Mass in two different rooms — those who study the liturgy, and those who make the musical decisions — and neither room has a window into the other.\n\nWhich room did you come from?\n\nTell us what you do musically or liturgically now, and name one thing about the Mass you have always done a particular way without ever being told why. We will come back to these in December.',
     v_author_id, true),

    (v_course_id,
     'Rap, hip-hop, and the limits: what do the documents actually say?',
     E'§11.12 takes up the contemporary question directly, and separates what the documents say from what is commonly asserted about them.\n\nRead it before posting, then take a position:\n\nIs there a principled line between idioms that can carry the Roman Rite and idioms that cannot — and if so, where does it fall and what draws it? If your answer is that the line is about musical style, say what document grounds that. If your answer is that the line is about something else, say what.\n\nOne rule for this thread: distinguish the three levels of authority from the Preface. "The Church forbids this" and "I find this unworthy" are different claims. Make the one you actually mean.',
     v_author_id, false),

    (v_course_id,
     'When the three judgments conflict, which one yields?',
     E'§13.1 presents the liturgical, pastoral, and musical judgments as three aspects of a single judgment. In practice they pull against each other constantly.\n\nBring a real case. A piece your assembly loves that is liturgically wrong for its slot. A setting that is musically excellent and pastorally unreachable. A text that is doctrinally fine and musically inert.\n\nDescribe the case, then say what you did or would do — and be honest about what you gave up. Respond to at least one classmate whose resolution differs from yours.',
     v_author_id, false),

    (v_course_id,
     'The two failure modes',
     E'§19.5 names two ways of getting the African American Catholic tradition wrong.\n\nName them in your own words first. Then: which of the two is more common in the parishes you have actually seen, and why do you think that is?\n\nBe careful here. It is easy to critique the failure mode you have never been tempted by. The more useful post is the one about the failure mode you are personally closer to.',
     v_author_id, false)
  ) AS d(course_id, title, content, author_id, is_pinned)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.gw_course_discussions existing
    WHERE existing.course_id = d.course_id
      AND existing.title = d.title
      AND existing.parent_id IS NULL
  );

  -- ---------------------------------------------------------------------
  -- TENANT BACKFILL. Most tables in this database carry tenant_id with a
  -- DEFAULT of current_tenant_id(). That function resolves from the request's
  -- x-tenant-slug header or the caller's JWT — neither of which exists when a
  -- migration is applied as supabase_admin, so the default silently yields
  -- NULL and the rows become invisible under the RESTRICTIVE tenant policies.
  --
  -- The generated types file claims these four tables have no tenant_id, but
  -- it is known to be stale, so this checks the live catalog instead of
  -- trusting it. Where the column exists and a row landed NULL, it inherits
  -- the course's tenant. Where it does not exist, this is a no-op.
  -- ---------------------------------------------------------------------
  DECLARE
    v_tenant_id uuid;
    t           text;
  BEGIN
    EXECUTE 'SELECT tenant_id FROM public.gw_courses WHERE id = $1'
      INTO v_tenant_id USING v_course_id;

    IF v_tenant_id IS NOT NULL THEN
      FOREACH t IN ARRAY ARRAY[
        'gw_course_modules', 'gw_course_assignments', 'gw_course_discussions'
      ] LOOP
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
        ) THEN
          EXECUTE format(
            'UPDATE public.%I SET tenant_id = $1 WHERE course_id = $2 AND tenant_id IS NULL', t
          ) USING v_tenant_id, v_course_id;
          RAISE NOTICE 'tenant backfill applied to %', t;
        END IF;
      END LOOP;
    END IF;
  EXCEPTION
    -- gw_courses itself may have no tenant_id column; that is not an error.
    WHEN undefined_column THEN
      RAISE NOTICE 'gw_courses has no tenant_id column; skipping tenant backfill.';
  END;

  RAISE NOTICE 'Bowman Scholars MUS-240 Fall 2026 seeded: course_id=%, author_id=%', v_course_id, v_author_id;
END $$;
