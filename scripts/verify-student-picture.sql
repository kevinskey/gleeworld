-- Re-runnable check that the student-picture layer is intact.
\echo '-- Views (expect 4 public unions + adapters):'
select table_name from information_schema.views
 where table_schema = 'student_picture' order by table_name;
\echo '-- RPCs (expect 6):'
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and proname like 'sp_%' order by proname;
\echo '-- Every adapter must emit the contract columns:'
select table_name, count(*) as cols from information_schema.columns
 where table_schema = 'student_picture' group by table_name order by table_name;
