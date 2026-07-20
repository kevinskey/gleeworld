-- Refresh gw_billing_plans.features so tier bullets on the workspace
-- surface match the new "add-ons included with plan" model per Kevin.
--
-- Personal:    Studio, Studio Hours, Concert Planner, Finances
-- Director:    Personal's + Tour Manager, PR Hub
-- Director+:   Director's + Box Office, Liturgy Planner
-- Institution: all add-ons included

UPDATE public.gw_billing_plans
SET features = '["Up to 15 students","1 Academy course","Your own score library","Personal calendar + Tonight mode","Custom domain ($25 setup + $15/yr)","25 GB","Add-ons included: Studio, Studio Hours, Concert Planner, Finances"]'::jsonb
WHERE id = 'personal';

UPDATE public.gw_billing_plans
SET features = '["Up to 60 students","Up to 10 Academy courses","Roster, attendance, scheduling","Scores + part tracks","Tonight mode + stage viewer","Branded login (your logo & colors)","Custom domain ($25 setup + $15/yr)","50 GB","Everything in Personal + Tour Manager, PR Hub"]'::jsonb
WHERE id = 'director_60';

UPDATE public.gw_billing_plans
SET features = '["Up to 150 students","Up to 50 Academy courses","Custom domain ($25 setup + $15/yr)","150 GB","Everything in Director + Box Office, Liturgy Planner"]'::jsonb
WHERE id = 'director_150';

UPDATE public.gw_billing_plans
SET features = '["Unlimited students","Unlimited Academy courses","Multi-ensemble + SSO + Canvas","Broadcast texts included","Custom app icon","Custom domain ($25 setup + $15/yr)","Dedicated app (talk to us)","1 TB pooled","All add-ons included"]'::jsonb
WHERE id = 'institution';
