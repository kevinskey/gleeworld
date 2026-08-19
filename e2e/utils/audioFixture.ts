// Generates a tiny valid WAV in memory. Used to feed the Studio
// accompaniment upload path without shipping a real audio file in the
// repo. Duration: ~250ms of silence at 44.1 kHz mono, 16-bit PCM.

export function makeSilentWav(durationSec = 0.25, sampleRate = 44100): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.round(durationSec * sampleRate);
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk header — samples themselves are already zero-filled
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}
