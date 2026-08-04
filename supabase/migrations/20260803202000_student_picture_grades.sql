create or replace view student_picture.grd_gw_grades
  (user_id, tenant_id, source, source_id, title, course_id, course_name,
   points_earned, points_possible, percent, letter, graded_at, category, is_final)
with (security_invoker = on) as
select g.student_id, g.tenant_id, 'grade'::text, g.id,
       coalesce(a.title,'Assignment')::text, a.course_id, c.title,
       g.total_score, g.max_points, g.percentage, g.letter_grade,
       g.graded_at, a.category, false
from public.gw_grades g
left join public.gw_assignments a on a.id = g.assignment_id
left join public.gw_courses c on c.id = a.course_id
where g.student_id is not null;

create or replace view student_picture.grd_final
  (user_id, tenant_id, source, source_id, title, course_id, course_name,
   points_earned, points_possible, percent, letter, graded_at, category, is_final)
with (security_invoker = on) as
select f.student_id, f.tenant_id, 'final_grade'::text, f.id,
       coalesce(a.title,'Final')::text, f.course_id, c.title,
       f.total_score, f.max_score, f.percentage, f.letter_grade,
       f.graded_at, 'final'::text, true
from public.gw_final_grades f
left join public.gw_assignments a on a.id = f.assignment_id
left join public.gw_courses c on c.id = f.course_id
where f.student_id is not null and f.is_published is not false;

create or replace view student_picture.grd_semester
  (user_id, tenant_id, source, source_id, title, course_id, course_name,
   points_earned, points_possible, percent, letter, graded_at, category, is_final)
with (security_invoker = on) as
select s.user_id, s.tenant_id, 'semester'::text, s.id,
       coalesce(s.semester_name,'Semester')::text, null::uuid, null::text,
       s.total_points_earned, s.total_points_possible, s.current_grade,
       s.letter_grade, s.updated_at, 'semester'::text, true
from public.gw_semester_grades s where s.user_id is not null;

create or replace view student_picture.grd_discussion
  (user_id, tenant_id, source, source_id, title, course_id, course_name,
   points_earned, points_possible, percent, letter, graded_at, category, is_final)
with (security_invoker = on) as
select d.student_id, d.tenant_id, 'discussion'::text, d.id,
       coalesce(cd.title,'Discussion')::text, cd.course_id, c.title,
       d.total_score, null::numeric, null::numeric, null::text,
       d.graded_at, 'discussion'::text, false
from public.discussion_grades d
left join public.gw_course_discussions cd on cd.id = d.discussion_id
left join public.gw_courses c on c.id = cd.course_id
where d.student_id is not null;

-- external_grades keys on EMAIL. Unmatched emails are dropped, not nulled.
create or replace view student_picture.grd_external
  (user_id, tenant_id, source, source_id, title, course_id, course_name,
   points_earned, points_possible, percent, letter, graded_at, category, is_final)
with (security_invoker = on) as
select p.user_id, x.tenant_id, 'external'::text, x.id,
       coalesce(x.exercise_title,'External exercise')::text, null::uuid, null::text,
       ((coalesce(x.pitch_score,0) + coalesce(x.rhythm_score,0)) / 2)::numeric,
       100::numeric,
       ((coalesce(x.pitch_score,0) + coalesce(x.rhythm_score,0)) / 2)::numeric,
       null::text, x.completed_at, x.source, false
from public.external_grades x
join public.gw_profiles p
     on lower(p.email) = lower(x.student_email) and p.tenant_id = x.tenant_id
where p.user_id is not null;

create or replace view student_picture.grd_test_submissions
  (user_id, tenant_id, source, source_id, title, course_id, course_name,
   points_earned, points_possible, percent, letter, graded_at, category, is_final)
with (security_invoker = on) as
select t.student_id, t.tenant_id, 'test'::text, t.id,
       coalesce(gt.title,'Test')::text, null::uuid, null::text,
       t.total_score, null::numeric, t.percentage, null::text,
       t.submitted_at, 'test'::text, false
from public.test_submissions t
left join public.glee_academy_tests gt on gt.id = t.test_id
where t.student_id is not null and t.status = 'graded';

-- gw_course_test_attempts is UNIQUE(test_id, user_id, attempt_number): a
-- student can have MANY graded rows for one test. Emitting all of them made
-- attempts scoring 50/75/100 average to 75% while the gradebook showed 100,
-- and let sp_roster_flags('failing') flag a student whose real grade is an A.
-- Collapse to the HIGHEST-scoring attempt, latest attempt_number breaking ties.
create or replace view student_picture.grd_test_attempts
  (user_id, tenant_id, source, source_id, title, course_id, course_name,
   points_earned, points_possible, percent, letter, graded_at, category, is_final)
with (security_invoker = on) as
select a.user_id, a.tenant_id, 'course_test'::text, a.id,
       coalesce(t.title,'Test')::text, t.course_id, c.title,
       a.score::numeric, a.max_score::numeric,
       case when a.max_score > 0 then round(a.score::numeric * 100 / a.max_score, 1) end,
       null::text, a.submitted_at, 'test'::text, false
from (
  -- is_graded is repeated inside the subquery so an ungraded attempt cannot
  -- win the distinct-on and then be filtered away, dropping the test entirely.
  select distinct on (a.test_id, a.user_id) a.*
    from public.gw_course_test_attempts a
   where a.is_graded
   order by a.test_id, a.user_id, a.score desc nulls last, a.attempt_number desc
) a
left join public.gw_course_tests t on t.id = a.test_id
left join public.gw_courses c on c.id = t.course_id
where a.user_id is not null and a.is_graded;

create or replace view student_picture.grd_course_submissions
  (user_id, tenant_id, source, source_id, title, course_id, course_name,
   points_earned, points_possible, percent, letter, graded_at, category, is_final)
with (security_invoker = on) as
select s.student_id, s.tenant_id, 'course_submission'::text, s.id,
       coalesce(a.title,'Assignment')::text, a.course_id, c.title,
       coalesce(s.points_earned, s.grade), a.points::numeric,
       case when a.points > 0 then round(coalesce(s.points_earned,s.grade) * 100 / a.points, 1) end,
       null::text, s.graded_at, a.assignment_type::text, false
from public.gw_course_submissions s
left join public.gw_course_assignments a on a.id = s.assignment_id
left join public.gw_courses c on c.id = a.course_id
where s.student_id is not null and s.graded_at is not null;

create or replace view student_picture.grd_assignment_submissions
  (user_id, tenant_id, source, source_id, title, course_id, course_name,
   points_earned, points_possible, percent, letter, graded_at, category, is_final)
with (security_invoker = on) as
select s.user_id, s.tenant_id, 'sight_reading'::text, s.id,
       coalesce(a.title,'Sight reading')::text, a.course_id, c.title,
       s.score_value, a.points_possible::numeric,
       case when a.points_possible > 0
            then round(s.score_value * 100 / a.points_possible, 1) end,
       null::text, s.graded_at, 'sight_reading'::text, false
from public.gw_assignment_submissions s
left join public.gw_sight_reading_assignments a on a.id = s.assignment_id
left join public.gw_courses c on c.id = a.course_id
where s.user_id is not null and s.graded_at is not null;

create or replace view student_picture.grd_music_fundamentals
  (user_id, tenant_id, source, source_id, title, course_id, course_name,
   points_earned, points_possible, percent, letter, graded_at, category, is_final)
with (security_invoker = on) as
select s.student_id, s.tenant_id, 'music_fundamentals'::text, s.id,
       coalesce(a.title,'Exercise')::text, null::uuid, null::text,
       s.score::numeric, a.max_score::numeric,
       case when a.max_score > 0 then round(s.score::numeric * 100 / a.max_score, 1) end,
       null::text, s.graded_at, 'music_fundamentals'::text, false
from public.music_fundamentals_submissions s
left join public.music_fundamentals_assignments a on a.id = s.assignment_id
where s.student_id is not null and s.graded_at is not null;

create or replace view student_picture.v_student_grades
  (user_id, tenant_id, source, source_id, title, course_id, course_name,
   points_earned, points_possible, percent, letter, graded_at, category, is_final)
with (security_invoker = on) as
  select * from student_picture.grd_gw_grades
  union all select * from student_picture.grd_final
  union all select * from student_picture.grd_semester
  union all select * from student_picture.grd_discussion
  union all select * from student_picture.grd_external
  union all select * from student_picture.grd_test_submissions
  union all select * from student_picture.grd_test_attempts
  union all select * from student_picture.grd_course_submissions
  union all select * from student_picture.grd_assignment_submissions
  union all select * from student_picture.grd_music_fundamentals;

grant select on all tables in schema student_picture to authenticated;
