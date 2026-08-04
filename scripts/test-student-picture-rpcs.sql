\set ON_ERROR_STOP on
do $$ declare j jsonb; begin
  j := public.sp_assignments(null, 'week', null);
  if not (j ? 'has_data' and j ? 'scope' and j ? 'rows') then
    raise exception 'contract missing keys: %', j; end if;
  if j->>'scope' <> 'self' then
    raise exception 'null p_user_id must be scope=self, got %', j->>'scope'; end if;
  j := public.sp_assignments('99999999-9999-9999-9999-999999999999','week',null);
  if j->>'scope' <> 'other' then
    raise exception 'explicit other user must be scope=other, got %', j->>'scope'; end if;
end $$;
