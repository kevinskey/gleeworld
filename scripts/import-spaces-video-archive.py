#!/usr/bin/env python3
"""Import a yt-dlp archive sitting in DO Spaces into the youtube_videos library.

The SCGC back-catalog was archived with yt-dlp into the private Spaces bucket
`scgc-videos` (atl1), three objects per video::

    20240412 - A_Century_Old_Tradition_… [wUDgNgFQnE4].mp4
    20240412 - A_Century_Old_Tradition_… [wUDgNgFQnE4].webp
    20240412 - A_Century_Old_Tradition_… [wUDgNgFQnE4].info.json

The .info.json carries everything the library row needs (title, description,
upload date, duration, view/like counts, tags), so this script reads those
rather than re-hitting the YouTube API — which also means it works for videos
that have since been unlisted or removed from the channel.

Rows point at YouTube for playback; the Spaces object is recorded in the
archive_* columns so `video-archive-download` can presign it for admins.

Emits SQL on stdout. Nothing is written unless you pipe it into psql, which
is the point — read the diff before it lands::

    # on the droplet (needs boto3 + the Spaces creds)
    set -a; . /opt/gleeworld-superadmin/.env; set +a
    python3 import-spaces-video-archive.py \
        --bucket scgc-videos --region atl1 \
        --tenant 364cc4db-68d6-4b7e-bed1-94166a1f2deb > /tmp/import.sql

    cd /opt/supabase && docker compose exec -T db \
        psql -U postgres -d postgres < /tmp/import.sql

Re-running is safe: youtube_videos.video_id carries a UNIQUE constraint, and
the generated statements upsert on it. Curated fields a human may have edited
in the UI (category, is_featured, display_order) are NOT overwritten on
conflict — only the archive pointer and the objective YouTube metadata are.
"""

import argparse
import json
import os
import re
import sys
import urllib.request

import boto3

# Series that the title encodes. Used to fill `category` so the library's
# category filter is useful out of the box; anything unmatched stays NULL
# rather than getting a made-up bucket.
SERIES = [
    ("Glee Culture", re.compile(r"glee[ _]culture", re.I)),
    ("Glee Life", re.compile(r"glee[ _]life", re.I)),
    ("Road to 100", re.compile(r"road[ _]to[ _]100", re.I)),
    # Performances of the piece by many different ensembles — grouped by work,
    # not by channel, since these come from all over YouTube.
    ("A Choice to Change the World",
     re.compile(r"choice[ _]to[ _]change[ _]the[ _]world", re.I)),
    ("Interview", re.compile(r"interview", re.I)),
    ("Documentary", re.compile(r"documentary", re.I)),
]

# yt-dlp writes "<date> - <title> [<id>].<ext>"; the id is the last bracketed
# group so a title containing brackets doesn't confuse the match.
KEY_RE = re.compile(r"^(?P<stem>.*)\.(?P<ext>mp4|webp|info\.json)$", re.I)


def sql_str(value):
    """Quote a Python value as a SQL literal (NULL, or single-quote escaped)."""
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def sql_text_array(items):
    if not items:
        return "NULL"
    inner = ", ".join(sql_str(i) for i in items)
    return f"ARRAY[{inner}]::text[]"


def category_for(title):
    for label, pattern in SERIES:
        if pattern.search(title):
            return label
    return None


def thumbnail_for(info, video_id):
    """Pick a thumbnail URL that will still resolve months from now.

    yt-dlp records whatever thumbnail the player handed it, and for Shorts
    that is a signed, expiring URL (`.../sd2.jpg?sqp=…&rs=…`). Only a bare,
    query-free /vi/ URL is safe to persist.

    Otherwise fall back to maxresdefault — but *check* it first: YouTube only
    generates maxres for videos uploaded above a resolution threshold, and a
    404 here would render a broken card forever. hqdefault always exists.
    """
    url = info.get("thumbnail") or ""
    if re.match(r"^https://i\.ytimg\.com/vi(_webp)?/[\w-]+/\w+\.(jpg|webp)$", url):
        return url

    maxres = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
    try:
        req = urllib.request.Request(maxres, method="HEAD")
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                return maxres
    except Exception:
        pass
    return f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"


def duration_for(info):
    """Normalize to m:ss — yt-dlp writes bare seconds for sub-minute clips
    ("56"), and the library renders this string straight into a badge."""
    raw = info.get("duration_string")
    if raw and ":" not in str(raw):
        try:
            return f"0:{int(raw):02d}"
        except (TypeError, ValueError):
            return raw
    return raw


def published_at(info):
    """upload_date is YYYYMMDD; anything else we leave to the DB as NULL."""
    raw = str(info.get("upload_date") or "")
    if len(raw) != 8 or not raw.isdigit():
        return None
    return f"{raw[0:4]}-{raw[4:6]}-{raw[6:8]}T00:00:00Z"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bucket", required=True)
    ap.add_argument("--region", required=True)
    ap.add_argument("--tenant", required=True, help="gw_tenants.id to own these rows")
    ap.add_argument("--tag", default="scgc-archive",
                    help="extra tag added to every row so the set is filterable as a group")
    ap.add_argument("--prefix", default="", help="only import keys under this prefix")
    args = ap.parse_args()

    key_id = os.environ.get("SPACES_ACCESS_KEY_ID") or os.environ.get("SPACES_KEY")
    secret = os.environ.get("SPACES_SECRET_ACCESS_KEY") or os.environ.get("SPACES_SECRET")
    if not key_id or not secret:
        sys.exit("SPACES_ACCESS_KEY_ID / SPACES_SECRET_ACCESS_KEY not in the environment")

    s3 = boto3.session.Session().client(
        "s3",
        region_name=args.region,
        endpoint_url=f"https://{args.region}.digitaloceanspaces.com",
        aws_access_key_id=key_id,
        aws_secret_access_key=secret,
    )

    # stem -> {"mp4": (key, size), "info": key}
    groups = {}
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=args.bucket, Prefix=args.prefix):
        for obj in page.get("Contents", []):
            match = KEY_RE.match(obj["Key"])
            if not match:
                continue
            stem, ext = match.group("stem"), match.group("ext").lower()
            slot = groups.setdefault(stem, {})
            if ext == "mp4":
                slot["mp4"] = (obj["Key"], obj["Size"])
            elif ext == "info.json":
                slot["info"] = obj["Key"]

    rows, skipped = [], []
    for stem in sorted(groups):
        slot = groups[stem]
        if "mp4" not in slot or "info" not in slot:
            skipped.append((stem, "missing .mp4 or .info.json"))
            continue

        info = json.loads(s3.get_object(Bucket=args.bucket, Key=slot["info"])["Body"].read())
        video_id = info.get("id")
        title = info.get("title")
        if not video_id or not title:
            skipped.append((stem, "info.json has no id/title"))
            continue

        object_key, size_bytes = slot["mp4"]
        tags = [t for t in (info.get("tags") or [])][:10]
        if args.tag and args.tag not in tags:
            tags.append(args.tag)

        rows.append({
            "video_id": video_id,
            "title": title,
            "description": info.get("description"),
            "thumbnail_url": thumbnail_for(info, video_id),
            "video_url": f"https://www.youtube.com/watch?v={video_id}",
            "duration": duration_for(info),
            "published_at": published_at(info),
            "view_count": info.get("view_count") or 0,
            "like_count": info.get("like_count") or 0,
            "category": category_for(title),
            "tags": tags,
            "archive_object_key": object_key,
            "archive_size_bytes": size_bytes,
        })

    total_bytes = sum(r["archive_size_bytes"] for r in rows)
    print(f"-- {len(rows)} videos from {args.bucket} ({args.region}), "
          f"{total_bytes / 1e9:.2f} GB of archived masters")
    for stem, why in skipped:
        print(f"-- SKIPPED {stem}: {why}")
    print("BEGIN;")

    for r in rows:
        print(f"""
INSERT INTO public.youtube_videos (
  tenant_id, video_id, title, description, thumbnail_url, video_url,
  duration, published_at, view_count, like_count, category, tags,
  archive_object_key, archive_bucket, archive_region, archive_size_bytes
) VALUES (
  {sql_str(args.tenant)}::uuid,
  {sql_str(r['video_id'])},
  {sql_str(r['title'])},
  {sql_str(r['description'])},
  {sql_str(r['thumbnail_url'])},
  {sql_str(r['video_url'])},
  {sql_str(r['duration'])},
  {sql_str(r['published_at'])}::timestamptz,
  {r['view_count']},
  {r['like_count']},
  {sql_str(r['category'])},
  {sql_text_array(r['tags'])},
  {sql_str(r['archive_object_key'])},
  {sql_str(args.bucket)},
  {sql_str(args.region)},
  {r['archive_size_bytes']}
)
ON CONFLICT (video_id) DO UPDATE SET
  title              = EXCLUDED.title,
  description        = EXCLUDED.description,
  thumbnail_url      = EXCLUDED.thumbnail_url,
  duration           = EXCLUDED.duration,
  published_at       = EXCLUDED.published_at,
  view_count         = EXCLUDED.view_count,
  like_count         = EXCLUDED.like_count,
  tags               = EXCLUDED.tags,
  archive_object_key = EXCLUDED.archive_object_key,
  archive_bucket     = EXCLUDED.archive_bucket,
  archive_region     = EXCLUDED.archive_region,
  archive_size_bytes = EXCLUDED.archive_size_bytes,
  updated_at         = now();""".rstrip())

    print("\nCOMMIT;")


if __name__ == "__main__":
    main()
