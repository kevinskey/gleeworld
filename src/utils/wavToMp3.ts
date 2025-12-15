import * as lamejs from 'lamejs';

export async function convertWavToMp3(
  wavUrl: string, 
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; newFileName: string }> {
  console.log('WAV to MP3: Starting conversion for', fileName);
  
  // Fetch the WAV file
  onProgress?.(5);
  const response = await fetch(wavUrl);
  const arrayBuffer = await response.arrayBuffer();
  
  onProgress?.(10);
  
  // Parse WAV header (robust RIFF chunk scanning; supports BWF with extra chunks)
  const dataView = new DataView(arrayBuffer);

  const readFourCC = (offset: number) =>
    String.fromCharCode(
      dataView.getUint8(offset),
      dataView.getUint8(offset + 1),
      dataView.getUint8(offset + 2),
      dataView.getUint8(offset + 3),
    );

  const riff = readFourCC(0);
  const wave = readFourCC(8);
  if (riff !== 'RIFF' || wave !== 'WAVE') {
    throw new Error(`Invalid WAV file (missing RIFF/WAVE). riff=${riff} wave=${wave}`);
  }

  let numChannels: number | null = null;
  let sampleRate: number | null = null;
  let bitsPerSample: number | null = null;
  let dataOffset: number | null = null;
  let dataSize: number | null = null;

  // Chunks start at byte 12
  let pos = 12;
  while (pos + 8 <= arrayBuffer.byteLength) {
    const chunkId = readFourCC(pos);
    const chunkSize = dataView.getUint32(pos + 4, true);
    const chunkDataStart = pos + 8;

    if (chunkId === 'fmt ' && chunkDataStart + 16 <= arrayBuffer.byteLength) {
      const audioFormat = dataView.getUint16(chunkDataStart + 0, true);
      numChannels = dataView.getUint16(chunkDataStart + 2, true);
      sampleRate = dataView.getUint32(chunkDataStart + 4, true);
      bitsPerSample = dataView.getUint16(chunkDataStart + 14, true);

      // PCM(1) or IEEE float(3) are common; we only encode PCM16
      if (audioFormat !== 1) {
        console.warn('WAV to MP3: Unsupported WAV audioFormat:', audioFormat, '(expected PCM=1)');
      }
    }

    if (chunkId === 'data') {
      dataOffset = chunkDataStart;
      dataSize = chunkSize;
      break; // data is what we need
    }

    // Move to next chunk; chunks are word-aligned
    pos = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  if (!numChannels || !sampleRate || !bitsPerSample || dataOffset == null || dataSize == null) {
    throw new Error('Invalid WAV header (missing fmt/data chunks)');
  }

  if (bitsPerSample !== 16) {
    throw new Error(`Unsupported WAV bit depth: ${bitsPerSample}. Only 16-bit PCM is supported.`);
  }

  console.log('WAV to MP3: channels:', numChannels, 'sampleRate:', sampleRate, 'bits:', bitsPerSample);

  // Convert to PCM16 samples
  const samples = new Int16Array(arrayBuffer, dataOffset, dataSize / 2);

  onProgress?.(15);
  
  // Initialize MP3 encoder (lamejs is known to break in some Vite builds with "MPEGMode" reference errors)
  try {
    const Mp3Encoder = (lamejs as any).Mp3Encoder;
    const mp3encoder = new Mp3Encoder(numChannels, sampleRate, 128);
    const mp3Data: Int8Array[] = [];

    const sampleBlockSize = 1152; // Must be multiple of 576

    if (numChannels === 1) {
      // Mono
      for (let i = 0; i < samples.length; i += sampleBlockSize) {
        const chunk = samples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(chunk);
        if (mp3buf.length > 0) {
          mp3Data.push(new Int8Array(mp3buf));
        }

        const progress = 15 + (i / samples.length) * 80;
        onProgress?.(Math.min(progress, 95));
      }
    } else {
      // Stereo - deinterleave
      const left = new Int16Array(Math.ceil(samples.length / 2));
      const right = new Int16Array(Math.ceil(samples.length / 2));

      for (let i = 0; i < samples.length; i += 2) {
        left[i / 2] = samples[i];
        right[i / 2] = samples[i + 1];
      }

      for (let i = 0; i < left.length; i += sampleBlockSize) {
        const leftChunk = left.subarray(i, i + sampleBlockSize);
        const rightChunk = right.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(new Int8Array(mp3buf));
        }

        const progress = 15 + (i / left.length) * 80;
        onProgress?.(Math.min(progress, 95));
      }
    }

    // Flush remaining data
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(new Int8Array(mp3buf));
    }

    onProgress?.(100);

    // Combine all chunks
    const totalLength = mp3Data.reduce((acc, chunk) => acc + chunk.length, 0);
    const mp3Array = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of mp3Data) {
      mp3Array.set(new Uint8Array(chunk.buffer), offset);
      offset += chunk.length;
    }

    const blob = new Blob([mp3Array], { type: 'audio/mpeg' });
    const newFileName = fileName.replace(/\.wav$/i, '.mp3');

    console.log(
      'WAV to MP3: Conversion complete. Original size:',
      (arrayBuffer.byteLength / 1024 / 1024).toFixed(2),
      'MB, MP3 size:',
      (blob.size / 1024 / 1024).toFixed(2),
      'MB',
    );

    return { blob, newFileName };
  } catch (err) {
    console.warn('WAV to MP3: MP3 encoder failed, uploading WAV directly:', err);
    
    // Fallback: return original WAV - AzuraCast can handle WAV files
    onProgress?.(100);
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    console.log('WAV to MP3: Fallback - returning original WAV file');
    return { blob, newFileName: fileName };
  }
}

export function isWavFile(value: string): boolean {
  const lower = value.toLowerCase();
  // handle URLs with query params
  const noQuery = lower.split('?')[0];
  return noQuery.endsWith('.wav') || noQuery.includes('.wav/');
}
