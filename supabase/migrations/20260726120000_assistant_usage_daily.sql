-- assistant_usage_daily: per-tenant, per-tool daily counter used to cap
-- upstream-metered assistant tools (web_search → Brave).
-- Kept tiny: one row per (tenant, tool, day). Never joined; only counted.

CREATE TABLE public.assistant_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  tool_name text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, tool_name, day)
);

-- Multi-tenant guard: matches the pattern used across the schema.
CREATE OR REPLACE FUNCTION public.assistant_usage_daily_set_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assistant_usage_daily_set_tenant_trg
BEFORE INSERT ON public.assistant_usage_daily
FOR EACH ROW EXECUTE FUNCTION public.assistant_usage_daily_set_tenant();

ALTER TABLE public.assistant_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY assistant_usage_daily_tenant_isolation
ON public.assistant_usage_daily
AS RESTRICTIVE
FOR ALL
USING (tenant_id = current_tenant_id())
WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY assistant_usage_daily_service_role_rw
ON public.assistant_usage_daily
FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Increment-and-return: atomic, single round trip. Executor calls this
-- BEFORE hitting Brave and refuses the call if the returned count exceeds
-- the tool's cap. Runs under the caller's JWT so RLS applies naturally.
CREATE OR REPLACE FUNCTION public.increment_assistant_usage(p_tool_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  INSERT INTO public.assistant_usage_daily (tool_name, day, count)
  VALUES (p_tool_name, v_today, 1)
  ON CONFLICT (tenant_id, tool_name, day)
  DO UPDATE SET count = assistant_usage_daily.count + 1
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_assistant_usage(text) TO authenticated;
