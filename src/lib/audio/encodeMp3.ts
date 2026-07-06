// Promise wrapper around the shared mp3-encoder worker (mono or stereo).
// Channels beyond the first two are ignored (MP3 is max 2ch).
export async function encodeMp3(
  channels: Float32Array[],
  sampleRate: number,
  bitrate = 320,
): Promise<Blob> {
  if (!channels.length || !channels[0].length) throw new Error('Nothing to encode');
  const worker = new Worker(
    new URL('@/lib/mp3-encoder.worker.ts', import.meta.url),
    { type: 'module' },
  );
  const mp3: Uint8Array = await new Promise((resolve, reject) => {
    worker.onmessage = (e) => { resolve(e.data.mp3); worker.terminate(); };
    worker.onerror = (e) => { worker.terminate(); reject(new Error(e.message || 'MP3 encode failed')); };
    const left = new Float32Array(channels[0]);
    const transfers: Transferable[] = [left.buffer];
    const msg: Record<string, unknown> = { samples: left, sampleRate, bitrate };
    if (channels.length > 1) {
      const right = new Float32Array(channels[1]);
      msg.right = right;
      transfers.push(right.buffer);
    }
    worker.postMessage(msg, transfers);
  });
  return new Blob([mp3], { type: 'audio/mpeg' });
}
