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
  
  // Parse WAV header (use lamejs built-in parser for correctness)
  const wavHeader = (lamejs as any).WavHeader?.readHeader?.(new DataView(arrayBuffer));
  if (!wavHeader) {
    throw new Error('Invalid WAV header');
  }

  const numChannels = wavHeader.channels;
  const sampleRate = wavHeader.sampleRate;
  const bitsPerSample = 16; // lamejs outputs PCM16
  const dataOffset = wavHeader.dataOffset;
  const dataSize = wavHeader.dataLen;

  console.log('WAV to MP3: channels:', numChannels, 'sampleRate:', sampleRate, 'bits:', bitsPerSample);

  // Convert to PCM16 samples
  const samples = new Int16Array(arrayBuffer, dataOffset, dataSize / 2);
  
  onProgress?.(15);
  
  // Initialize MP3 encoder
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
  
  const blob = new Blob([mp3Array], { type: 'audio/mp3' });
  const newFileName = fileName.replace(/\.wav$/i, '.mp3');
  
  console.log('WAV to MP3: Conversion complete. Original size:', (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB, MP3 size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
  
  return { blob, newFileName };
}

export function isWavFile(value: string): boolean {
  const lower = value.toLowerCase();
  // handle URLs with query params
  const noQuery = lower.split('?')[0];
  return noQuery.endsWith('.wav') || noQuery.includes('.wav/');
}
