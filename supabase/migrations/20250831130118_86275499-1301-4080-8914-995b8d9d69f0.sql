-- Insert rubric criteria for each assignment type

-- Get assignment type IDs first
DO $$
DECLARE
    listening_id uuid;
    reflection_id uuid;
    research_id uuid;
    midterm_id uuid;
    final_id uuid;
    participation_id uuid;
BEGIN
    SELECT id INTO listening_id FROM mus240_assignment_types WHERE name = 'Listening Journals';
    SELECT id INTO reflection_id FROM mus240_assignment_types WHERE name = 'Reflection Papers';
    SELECT id INTO research_id FROM mus240_assignment_types WHERE name = 'Research Project';
    SELECT id INTO midterm_id FROM mus240_assignment_types WHERE name = 'Midterm Exam';
    SELECT id INTO final_id FROM mus240_assignment_types WHERE name = 'Final Reflection Essay';
    SELECT id INTO participation_id FROM mus240_assignment_types WHERE name = 'Participation & Discussion';

    -- Listening Journals Criteria (20 pts each x 10 = 200 total)
    INSERT INTO mus240_rubric_criteria (assignment_type_id, criterion_name, description, weight_percentage, max_points, display_order) VALUES
    (listening_id, 'Musical Analysis & Terminology', 'Accurate identification of genre, style traits, musical elements using correct terminology', 30.0, 6, 1),
    (listening_id, 'Cultural Context & Significance', 'Understanding and explanation of historical and cultural context', 25.0, 5, 2),
    (listening_id, 'Depth of Analysis', 'Quality of observations, insights, and connections made', 25.0, 5, 3),
    (listening_id, 'Writing Quality & Format', 'Organization, clarity, grammar, adherence to format requirements', 20.0, 4, 4);

    -- Reflection Papers Criteria (50 pts each x 3 = 150 total)
    INSERT INTO mus240_rubric_criteria (assignment_type_id, criterion_name, description, weight_percentage, max_points, display_order) VALUES
    (reflection_id, 'Thesis & Argument', 'Clear thesis statement and well-developed argument throughout', 25.0, 12, 1),
    (reflection_id, 'Historical/Cultural Connection', 'Effective integration of historical and cultural contexts', 25.0, 12, 2),
    (reflection_id, 'Evidence & Analysis', 'Use of evidence from readings/listening with thoughtful analysis', 25.0, 13, 3),
    (reflection_id, 'Organization & Mechanics', 'Clear structure, proper citations, grammar, and writing quality', 25.0, 13, 4);

    -- Research Project Criteria (150 pts total: Proposal 20 + Bibliography 30 + Presentation 100)
    INSERT INTO mus240_rubric_criteria (assignment_type_id, criterion_name, description, weight_percentage, max_points, display_order) VALUES
    (research_id, 'Topic Proposal Quality', 'Clear, focused topic with cultural significance and feasibility', 13.3, 20, 1),
    (research_id, 'Research Quality & Sources', 'Credible sources with thorough, insightful annotations', 20.0, 30, 2),
    (research_id, 'Content Accuracy & Depth', 'Factual accuracy, comprehensive coverage, scholarly insight', 25.0, 37, 3),
    (research_id, 'Cultural Integration', 'Effective connection of music to historical and cultural contexts', 20.0, 30, 4),
    (research_id, 'Creativity & Presentation', 'Innovation in format, clear organization, engaging delivery', 15.0, 23, 5),
    (research_id, 'Technical Quality', 'Professional execution of digital format and presentation skills', 6.7, 10, 6);

    -- Midterm Exam Criteria (100 pts total)
    INSERT INTO mus240_rubric_criteria (assignment_type_id, criterion_name, description, weight_percentage, max_points, display_order) VALUES
    (midterm_id, 'Listening Identification', 'Accurate identification of genres, styles, and musical characteristics', 40.0, 40, 1),
    (midterm_id, 'Historical Knowledge', 'Understanding of historical development and chronology', 25.0, 25, 2),
    (midterm_id, 'Cultural Context', 'Knowledge of social, cultural, and political influences on music', 25.0, 25, 3),
    (midterm_id, 'Musical Terminology', 'Correct use of musical vocabulary and concepts', 10.0, 10, 4);

    -- Final Reflection Essay Criteria (50 pts total)
    INSERT INTO mus240_rubric_criteria (assignment_type_id, criterion_name, description, weight_percentage, max_points, display_order) VALUES
    (final_id, 'Integration of Course Themes', 'Synthesis of major themes and concepts from throughout the semester', 30.0, 15, 1),
    (final_id, 'Personal Insight & Reflection', 'Depth of personal connection and thoughtful reflection', 25.0, 12, 2),
    (final_id, 'Use of Examples', 'Effective integration of examples from at least three musical styles', 25.0, 13, 3),
    (final_id, 'Writing Quality', 'Clear expression, organization, and adherence to academic standards', 20.0, 10, 4);

    -- Participation & Discussion Criteria (75 pts total)
    INSERT INTO mus240_rubric_criteria (assignment_type_id, criterion_name, description, weight_percentage, max_points, display_order) VALUES
    (participation_id, 'Class Preparation', 'Evidence of completing readings and listening assignments', 30.0, 23, 1),
    (participation_id, 'Contribution Quality', 'Meaningful, informed contributions to class discussions', 35.0, 26, 2),
    (participation_id, 'Engagement & Respect', 'Active participation and respectful interaction with peers', 25.0, 19, 3),
    (participation_id, 'Attendance & Punctuality', 'Regular attendance and timely arrival to class', 10.0, 7, 4);

END $$;