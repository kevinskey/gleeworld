-- Create a secure function to expose audition stats (total, soprano/alto ratio, top cities)
-- Uses gw_profiles.home_address to infer city for each applicant
-- SECURITY DEFINER so it can aggregate across rows while preserving privacy (returns only counts)

create or replace function public.get_audition_stats()
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  result jsonb;
begin
  -- Aggregate audition applications joined with profiles for addresses
  with apps as (
    select user_id, coalesce(lower(voice_part_preference), '') as voice_part_preference
    from public.audition_applications
  ),
  prof as (
    select user_id, home_address
    from public.gw_profiles
  ),
  joined as (
    select a.user_id, a.voice_part_preference, p.home_address
    from apps a
    left join prof p on p.user_id = a.user_id
  ),
  with_city as (
    select
      user_id,
      voice_part_preference,
      case 
        when home_address is null or trim(home_address) = '' then null
        when home_address like '%,%'
          then trim(
            split_part(
              home_address,
              ',',
              greatest(1, array_length(string_to_array(home_address, ','), 1) - 1)
            )
          )
        else null
      end as city
    from joined
  ),
  totals as (
    select 
      count(*)::int as total,
      sum(case when voice_part_preference like '%soprano%' then 1 else 0 end)::int as soprano,
      sum(case when voice_part_preference like '%alto%' then 1 else 0 end)::int as alto
    from with_city
  ),
  city_counts as (
    select city, count(*)::int as count
    from with_city
    where city is not null and city <> ''
    group by city
    order by count desc
    limit 5
  )
  select jsonb_build_object(
    'total', (select total from totals),
    'soprano', (select soprano from totals),
    'alto', (select alto from totals),
    'top_cities', coalesce((select jsonb_agg(jsonb_build_object('city', city, 'count', count)) from city_counts), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- Allow anon and authenticated users to execute this read-only aggregate safely
revoke all on function public.get_audition_stats() from public;
grant execute on function public.get_audition_stats() to anon, authenticated;