// gleeworld-video-worker — main loop.
//
// Polls gw_studio_videos for newly-uploaded sources, claims one at a
// time with SELECT … FOR UPDATE SKIP LOCKED, transcodes to HLS in a
// temp directory, uploads the HLS folder + thumbnail back to Spaces,
// and updates the row to status='ready' with hls_path + thumb_path
// + duration_seconds. On failure, marks status='error' with the
// error message.
//
// Designed for a single worker process; multiple workers can coexist
// thanks to FOR UPDATE SKIP LOCKED.

import pg from 'pg';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadObject, uploadFile } from './storage.js';
import { probe, transcodeMp4, thumbnailAt } from './transcode.js';

const { Pool } = pg;

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
const STABLE_DELAY_SECONDS = Number(process.env.STABLE_DELAY_SECONDS || 8);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
});

// Reserved for the v3 HLS path; v2 only ever uploads MP4 + JPG.

async function claimNext() {
  // Claim a video that's been sitting in 'uploading' long enough for
  // the upload to have settled. Mark it 'processing' atomically.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(`
      SELECT id, source_path FROM gw_studio_videos
      WHERE status = 'uploading'
        AND created_at < now() - ($1 || ' seconds')::interval
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `, [STABLE_DELAY_SECONDS]);
    if (res.rowCount === 0) { await client.query('COMMIT'); return null; }
    const row = res.rows[0];
    await client.query(
      `UPDATE gw_studio_videos SET status = 'processing', updated_at = now() WHERE id = $1`,
      [row.id],
    );
    await client.query('COMMIT');
    return row;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function markReady(id, fields) {
  await pool.query(
    `UPDATE gw_studio_videos
       SET status = 'ready', hls_path = $2, thumb_path = $3, duration_seconds = $4
     WHERE id = $1`,
    [id, fields.hls_path, fields.thumb_path, fields.duration_seconds],
  );
}

async function markError(id, message) {
  await pool.query(
    `UPDATE gw_studio_videos SET status = 'error', error_message = $2 WHERE id = $1`,
    [id, message.slice(0, 800)],
  );
}

async function processOne(row) {
  console.log(`[worker] processing ${row.id} (${row.source_path})`);

  // source_path = <tenant_id>/videos/<video_id>/source.<ext>
  const prefix = row.source_path.replace(/\/source\.[^./]+$/, '');
  const transcodedKey = `${prefix}/transcoded.mp4`;
  const thumbKey = `${prefix}/thumb.jpg`;

  const work = await mkdtemp(join(tmpdir(), 'vidwk-'));
  try {
    const sourceLocal = join(work, 'source');
    const transcodedLocal = join(work, 'transcoded.mp4');
    const thumbLocal = join(work, 'thumb.jpg');

    await downloadObject(row.source_path, sourceLocal);
    const meta = await probe(sourceLocal);
    if (!meta.height) throw new Error('ffprobe found no video stream');

    await transcodeMp4({ input: sourceLocal, output: transcodedLocal, sourceHeight: meta.height });
    await thumbnailAt({ input: sourceLocal, outPath: thumbLocal, durationSeconds: meta.durationSeconds });

    await uploadFile(transcodedKey, transcodedLocal, 'video/mp4');
    await uploadFile(thumbKey, thumbLocal, 'image/jpeg');

    // hls_path is what the player loads. v2 it points to the normalized
    // MP4; v3 will swap it for an HLS master playlist without renaming
    // the column (column name stays for storage stability).
    await markReady(row.id, {
      hls_path: transcodedKey,
      thumb_path: thumbKey,
      duration_seconds: meta.durationSeconds,
    });
    console.log(`[worker] ready ${row.id} (${meta.durationSeconds.toFixed(1)}s ${meta.width}x${meta.height})`);
  } catch (e) {
    console.error(`[worker] error ${row.id}:`, e);
    await markError(row.id, e instanceof Error ? e.message : String(e));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

(async function loop() {
  console.log('[worker] gleeworld-video-worker starting');
  while (!stopping) {
    try {
      const row = await claimNext();
      if (row) await processOne(row);
      else await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    } catch (e) {
      console.error('[worker] loop error:', e);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
  await pool.end();
  console.log('[worker] stopped');
})();
