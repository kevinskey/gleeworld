-- Attach an archived source file (DO Spaces object) to a library video.
--
-- Context: the SCGC YouTube back-catalog was archived to the private Spaces
-- bucket `scgc-videos` (atl1) with yt-dlp — one .mp4 + .webp thumb +
-- .info.json per video. The library row still points at YouTube for
-- playback (free embed, real thumbnails); these columns only record WHERE
-- the downloadable master lives so `video-archive-download` can mint a
-- short-TTL presigned URL for it.
--
-- Bucket/region are stored per-row rather than read from a single env var
-- because archives are spread across buckets (scgc-videos/atl1 here, the
-- commerce bucket in sfo3 elsewhere) and a row should be self-describing.
--
-- All columns are nullable: a row without archive_object_key is a normal
-- link-only library entry and renders no download affordance.

ALTER TABLE public.youtube_videos
  ADD COLUMN IF NOT EXISTS archive_object_key text,
  ADD COLUMN IF NOT EXISTS archive_bucket     text,
  ADD COLUMN IF NOT EXISTS archive_region     text,
  ADD COLUMN IF NOT EXISTS archive_size_bytes bigint;

COMMENT ON COLUMN public.youtube_videos.archive_object_key IS
  'Object key of the downloadable master in DO Spaces. NULL = no archive.';
COMMENT ON COLUMN public.youtube_videos.archive_bucket IS
  'DO Spaces bucket holding archive_object_key (e.g. scgc-videos).';
COMMENT ON COLUMN public.youtube_videos.archive_region IS
  'DO Spaces region for archive_bucket (e.g. atl1).';
COMMENT ON COLUMN public.youtube_videos.archive_size_bytes IS
  'Size of the archived object in bytes, for showing "1.9 GB" before download.';

-- Partial index: the only query that touches these columns filters to rows
-- that HAVE an archive, so indexing the NULLs would be dead weight.
CREATE INDEX IF NOT EXISTS youtube_videos_archived_idx
  ON public.youtube_videos (tenant_id)
  WHERE archive_object_key IS NOT NULL;
