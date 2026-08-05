-- Public (phone) view of a worship aid, reachable by QR code.
--
-- Mass plans are owner-private: liturgy_masses_insert/select are scoped to
-- owner_user_id = auth.uid(), and that must not change — a plan holds a
-- parish's working notes. But a worship aid is handed to a congregation, so
-- the printed copy carries a QR to a page anyone in the pew can open without
-- an account.
--
-- The token is the capability. It is a random uuid, it is only minted when a
-- user chooses to publish, revoking it is a single UPDATE, and it grants
-- read access to NOTHING but the fields a printed program already shows.
--
-- Access goes through a SECURITY DEFINER function rather than an RLS policy
-- on the table. A policy admitting "anon where share_token = <something>"
-- would need the token to arrive as a request header or a filter, which
-- means the whole row is exposed to anyone who can guess a filter, and it
-- would apply to every column including `notes`. A function takes the token
-- as an argument and returns a fixed, curated projection — the private
-- columns are simply never in its result.

ALTER TABLE public.gw_liturgy_masses
  ADD COLUMN IF NOT EXISTS share_token UUID;

CREATE UNIQUE INDEX IF NOT EXISTS gw_liturgy_masses_share_token_idx
  ON public.gw_liturgy_masses (share_token) WHERE share_token IS NOT NULL;

COMMENT ON COLUMN public.gw_liturgy_masses.share_token IS
  'Capability token for the public worship-aid page. NULL = not published. '
  'Set to a fresh uuid to publish, NULL again to revoke.';

CREATE OR REPLACE FUNCTION public.gw_worship_aid_by_token(p_token UUID)
RETURNS TABLE (
  mass_date DATE,
  mass_time TIME,
  observation TEXT,
  liturgical_season TEXT,
  sunday_cycle TEXT,
  setting_title TEXT,
  prelude_title TEXT,
  opening_title TEXT,
  psalm_title TEXT,
  responsorial_psalm TEXT,
  psalm_full TEXT,
  preparation_title TEXT,
  communion_1_title TEXT,
  communion_2_title TEXT,
  praise_title TEXT,
  closing_title TEXT,
  first_reading TEXT,
  second_reading TEXT,
  gospel_acclamation TEXT,
  gospel TEXT,
  worship_aid JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Note what is NOT selected: notes, owner_user_id, tenant_id, the *_pdf and
  -- *_youtube working links. A congregation gets the program, not the plan.
  SELECT
    m.mass_date, m.mass_time, m.observation,
    m.liturgical_season::text, m.sunday_cycle::text,
    m.setting_title, m.prelude_title, m.opening_title,
    m.psalm_title, m.responsorial_psalm, m.psalm_full,
    m.preparation_title, m.communion_1_title, m.communion_2_title,
    m.praise_title, m.closing_title,
    m.first_reading, m.second_reading, m.gospel_acclamation, m.gospel,
    m.worship_aid
  FROM public.gw_liturgy_masses m
  WHERE p_token IS NOT NULL
    AND m.share_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.gw_worship_aid_by_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_worship_aid_by_token(UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.gw_worship_aid_by_token(UUID) IS
  'Public read of a published worship aid by capability token. Returns a '
  'curated projection only; never exposes notes, owner, tenant or work links.';

NOTIFY pgrst, 'reload schema';
