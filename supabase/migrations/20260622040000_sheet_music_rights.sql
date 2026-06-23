-- Wire the Copyright & Content Policy's rights model into the schema.
--
-- The policy classifies every uploaded work into one of three categories:
--   public_domain        — distribute freely, no seat limit
--   licensed             — distribute within the license's seat count
--   all_rights_reserved  — private use only, do not share
-- Plus an "unknown" fallback for legacy rows that haven't been
-- classified yet.
--
-- We also capture the license modality (print / digital / either),
-- the seat count covered by the license, an optional license-expiry
-- date, and the copyright holder name (distinct from publisher — the
-- holder is the actual rights owner, the publisher is who printed the
-- physical edition; they're often but not always the same).

-- 1) Enum types ---------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gw_rights_status') THEN
    CREATE TYPE gw_rights_status AS ENUM (
      'public_domain',
      'licensed',
      'all_rights_reserved',
      'unknown'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gw_license_mode') THEN
    CREATE TYPE gw_license_mode AS ENUM (
      'print',
      'digital',
      'either'
    );
  END IF;
END $$;

-- 2) Add rights columns to gw_sheet_music -------------------------------

ALTER TABLE gw_sheet_music
  ADD COLUMN IF NOT EXISTS rights_status      gw_rights_status NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS license_mode       gw_license_mode,
  ADD COLUMN IF NOT EXISTS license_seat_count integer,
  ADD COLUMN IF NOT EXISTS license_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS copyright_holder   text,
  ADD COLUMN IF NOT EXISTS rights_notes       text;

-- 3) CHECK constraints --------------------------------------------------
-- Licensed works MUST carry a seat count so the per-seat copy principle
-- in the policy is enforceable. Public-domain and all-rights-reserved
-- works must not carry seat-related fields (they're either unlimited or
-- not distributed at all).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gw_sheet_music_rights_seat_check'
  ) THEN
    ALTER TABLE gw_sheet_music
      ADD CONSTRAINT gw_sheet_music_rights_seat_check
      CHECK (
        (rights_status = 'licensed' AND license_seat_count IS NOT NULL AND license_seat_count > 0)
        OR (rights_status <> 'licensed' AND license_seat_count IS NULL)
        OR rights_status = 'unknown'  -- legacy backfill rows
      );
  END IF;
END $$;

-- 4) Index for the "needs rights tagging" backlog query -----------------

CREATE INDEX IF NOT EXISTS gw_sheet_music_rights_unknown_idx
  ON gw_sheet_music (tenant_id, created_at DESC)
  WHERE rights_status = 'unknown';

-- 5) Mirror onto audio tracks too — same legal posture applies ----------
-- Recordings of copyrighted works (e.g. publisher accompaniment tracks)
-- carry the same per-seat license obligations as the score itself.

ALTER TABLE gw_sheet_music_audio_tracks
  ADD COLUMN IF NOT EXISTS rights_status      gw_rights_status NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS license_mode       gw_license_mode,
  ADD COLUMN IF NOT EXISTS license_seat_count integer,
  ADD COLUMN IF NOT EXISTS license_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS copyright_holder   text,
  ADD COLUMN IF NOT EXISTS rights_notes       text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gw_sheet_music_audio_rights_seat_check'
  ) THEN
    ALTER TABLE gw_sheet_music_audio_tracks
      ADD CONSTRAINT gw_sheet_music_audio_rights_seat_check
      CHECK (
        (rights_status = 'licensed' AND license_seat_count IS NOT NULL AND license_seat_count > 0)
        OR (rights_status <> 'licensed' AND license_seat_count IS NULL)
        OR rights_status = 'unknown'
      );
  END IF;
END $$;

-- 6) Live seat-usage rollup view ----------------------------------------
-- Helps tenants see at-a-glance whether they're within license for each
-- licensed score. "Active seats" = current active member count in the
-- tenant. Compare against license_seat_count per work.

CREATE OR REPLACE VIEW gw_sheet_music_rights_status_v AS
SELECT
  s.id,
  s.tenant_id,
  s.title,
  s.composer,
  s.rights_status,
  s.license_mode,
  s.license_seat_count,
  s.license_expires_at,
  s.copyright_holder,
  -- Active-member proxy: count members in the same tenant whose
  -- role isn't archived. Schools / ensembles may want to refine this
  -- against course rosters per work — that's a later iteration.
  (
    SELECT COUNT(*)
    FROM gw_profiles p
    WHERE p.tenant_id = s.tenant_id
      AND COALESCE(p.role, '') <> 'archived'
  ) AS active_member_count,
  CASE
    WHEN s.rights_status = 'licensed' AND s.license_seat_count IS NOT NULL THEN
      CASE
        WHEN (
          SELECT COUNT(*) FROM gw_profiles p
          WHERE p.tenant_id = s.tenant_id AND COALESCE(p.role, '') <> 'archived'
        ) > s.license_seat_count THEN 'over_seat_limit'
        ELSE 'within_license'
      END
    WHEN s.rights_status = 'licensed' AND s.license_expires_at IS NOT NULL AND s.license_expires_at < now() THEN 'expired'
    ELSE NULL
  END AS license_warning
FROM gw_sheet_music s;
