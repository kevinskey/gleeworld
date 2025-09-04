-- Create tables for Theory Poll module
create table if not exists public.theory_poll_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  owner_user_id uuid,
  created_at timestamptz default now()
);

create table if not exists public.theory_poll_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.theory_poll_sessions(id) on delete cascade,
  type text not null,                  -- 'clef_note' | 'key_sig' | 'interval'
  payload jsonb not null,
  choices jsonb not null,              -- 4 labels
  answer_index int not null,           -- 0..3
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.theory_poll_responses (
  id bigserial primary key,
  question_id uuid references public.theory_poll_questions(id) on delete cascade,
  user_id uuid default auth.uid(),
  choice_index int not null,
  created_at timestamptz default now()
);

create unique index if not exists uniq_vote_per_q_by_user on public.theory_poll_responses(question_id, user_id);

-- Enable RLS
alter table public.theory_poll_sessions enable row level security;
alter table public.theory_poll_questions enable row level security;
alter table public.theory_poll_responses enable row level security;

-- Drop existing policies if they exist
drop policy if exists "sessions_select_auth" on public.theory_poll_sessions;
drop policy if exists "sessions_upsert_owner" on public.theory_poll_sessions;
drop policy if exists "questions_select_auth" on public.theory_poll_questions;
drop policy if exists "questions_insert_owner" on public.theory_poll_questions;
drop policy if exists "questions_update_owner" on public.theory_poll_questions;
drop policy if exists "responses_insert_self" on public.theory_poll_responses;
drop policy if exists "responses_select_auth" on public.theory_poll_responses;

-- Create RLS policies
create policy "sessions_select_auth" on public.theory_poll_sessions
  for select using (auth.uid() is not null);

create policy "sessions_insert_owner" on public.theory_poll_sessions
  for insert with check (owner_user_id = auth.uid());

create policy "sessions_update_owner" on public.theory_poll_sessions
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy "questions_select_auth" on public.theory_poll_questions
  for select using (auth.uid() is not null);

create policy "questions_insert_owner" on public.theory_poll_questions
  for insert with check (auth.uid() is not null and session_id in (select id from public.theory_poll_sessions where owner_user_id = auth.uid()));

create policy "questions_update_owner" on public.theory_poll_questions
  for update using (session_id in (select id from public.theory_poll_sessions where owner_user_id = auth.uid()))
  with check (session_id in (select id from public.theory_poll_sessions where owner_user_id = auth.uid()));

create policy "responses_insert_self" on public.theory_poll_responses
  for insert with check (user_id = auth.uid());

create policy "responses_select_auth" on public.theory_poll_responses
  for select using (auth.uid() is not null);