// FFmpeg invocation for video normalization + thumbnail.
//
// Why one MP4 not adaptive HLS for v2: Supabase signed URLs are
// per-object, and HLS playlists reference each segment by relative
// path — every segment would need its own signed URL. Solvable with a
// signed-prefix proxy or a hls.js loader override, but unnecessary
// complexity for music-ed clips. v3 can add adaptive HLS once the
// catalog grows.
//
// Output: <work>/transcoded.mp4   (h.264 baseline + aac, ≤720p)
//         <work>/thumb.jpg        (10% mark, 640px wide)

import { spawn } from 'node:child_process';

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    p.stdout.on('data', (d) => { stdout += d.toString(); });
    p.stderr.on('data', (d) => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exit ${code}: ${stderr.slice(-600)}`));
    });
  });
}

export async function probe(input) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,duration:format=duration',
    '-of', 'json',
    input,
  ]);
  const json = JSON.parse(stdout);
  const stream = json.streams?.[0] ?? {};
  const duration = Number(stream.duration ?? json.format?.duration ?? 0);
  return {
    width: Number(stream.width ?? 0),
    height: Number(stream.height ?? 0),
    durationSeconds: Number.isFinite(duration) ? duration : 0,
  };
}

/** Transcode to a web-friendly MP4. Caps the height at 720p so we
 *  don't serve a 4K mobile-shot file unnecessarily. The `-movflags
 *  +faststart` puts the moov atom at the start of the file so the
 *  browser can begin playback while still downloading. */
export async function transcodeMp4(args) {
  const { input, output, sourceHeight } = args;
  const targetHeight = Math.min(sourceHeight || 720, 720);
  await run('ffmpeg', [
    '-y', '-i', input,
    '-vf', `scale=-2:${targetHeight}`,
    '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
    '-preset', 'medium', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    output,
  ]);
}

export async function thumbnailAt(args) {
  const { input, outPath, durationSeconds } = args;
  const t = Math.max(0.5, Math.min(durationSeconds * 0.1, 30));
  await run('ffmpeg', [
    '-y', '-ss', String(t), '-i', input,
    '-frames:v', '1', '-vf', 'scale=640:-2',
    '-q:v', '4', outPath,
  ]);
}
