// Storage I/O for the video transcoder.
//
// Uses @supabase/supabase-js with the service-role key. That way every
// uploaded HLS segment / transcoded MP4 / thumbnail gets a matching
// storage.objects row, and the frontend's existing signed-URL flow
// works without any changes. RLS is bypassed by the service key.

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
// supabase-js's RealtimeClient needs a WebSocket implementation on
// Node < 22. We don't actually use Realtime in the worker — set a
// shim transport so the client constructor doesn't throw.
globalThis.WebSocket = globalThis.WebSocket ?? ws;
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { readFile } from 'node:fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error('SUPABASE_URL not set');
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');

const BUCKET = 'studio-video';

export const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function downloadObject(remoteKey, localPath) {
  const { data, error } = await sb.storage.from(BUCKET).download(remoteKey);
  if (error) throw new Error(`download ${remoteKey}: ${error.message}`);
  // Blob.stream() returns a WHATWG ReadableStream; convert to a Node
  // stream before piping into the filesystem write stream.
  await pipeline(Readable.fromWeb(data.stream()), createWriteStream(localPath));
}

export async function uploadFile(remoteKey, localPath, contentType) {
  const body = await readFile(localPath);
  const { error } = await sb.storage.from(BUCKET).upload(remoteKey, body, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`upload ${remoteKey}: ${error.message}`);
}
