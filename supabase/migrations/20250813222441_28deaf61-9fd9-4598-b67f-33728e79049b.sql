-- Delete the old audition application records for Kay Day and Kevin Johnson
DELETE FROM public.audition_applications 
WHERE id IN (
  'cf5c8400-e2f4-4795-8283-c11914cf3f34',
  '15ae7e5e-b4e8-441e-9cca-a43527622fa3',
  '4c35e7be-20a6-441f-828f-b89d108c1242'
);