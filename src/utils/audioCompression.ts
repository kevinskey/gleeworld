import lamejs from 'lamejs';

const MAX_SIZE_FOR_UPLOAD = 45 * 1024 * 1024; // 45MB (leave buffer for 50MB limit)

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
  newFileName: string;
}

/**
 * Check if a file needs compression based on size
 */
export function needsCompression(fileSize: number): boolean {
  return fileSize > MAX_SIZE_FOR_UPLOAD;
}

/**
 * Compress a WAV audio file to MP3 format
 */
export async function compressAudioToMp3(
  audioUrl: string,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<CompressionResult> {
  console.log('Audio Compression: Starting compression for', fileName);
  
  // Fetch the original file
  const response = await fetch(audioUrl);
  const originalBlob = await response.blob();
  const originalSize = originalBlob.size;
  
  console.log('Audio Compression: Original size:', (originalSize / 1024 / 1024).toFixed(2), 'MB');
  
  // If file is small enough, return as-is
  if (!needsCompression(originalSize)) {
    console.log('Audio Compression: File is small enough, no compression needed');
    return {
      blob: originalBlob,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      newFileName: fileName,
    };
  }
  
  onProgress?.(10);
  
  // Decode the audio
  const audioContext = new AudioContext();
  const arrayBuffer = await originalBlob.arrayBuffer();
  
  onProgress?.(20);
  
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error('Audio Compression: Failed to decode audio, returning original');
    return {
      blob: originalBlob,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      newFileName: fileName,
    };
  }
  
  onProgress?.(30);
  
  console.log('Audio Compression: Audio decoded - channels:', audioBuffer.numberOfChannels, 
    'sampleRate:', audioBuffer.sampleRate, 'duration:', audioBuffer.duration.toFixed(2), 's');
  
  // Get audio data
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.length;
  
  // Convert to mono if stereo (reduces size)
  let leftChannel: Float32Array;
  let rightChannel: Float32Array | null = null;
  
  if (channels === 1) {
    leftChannel = audioBuffer.getChannelData(0);
  } else {
    leftChannel = audioBuffer.getChannelData(0);
    rightChannel = audioBuffer.getChannelData(1);
  }
  
  onProgress?.(40);
  
  // Create MP3 encoder
  // Use 128kbps for good quality/size balance
  const mp3encoder = new lamejs.Mp3Encoder(channels === 1 ? 1 : 2, sampleRate, 128);
  
  const mp3Data: Int8Array[] = [];
  const blockSize = 1152; // Samples per frame for MP3
  
  // Convert float samples to 16-bit integers
  const leftInt16 = floatTo16BitPCM(leftChannel);
  const rightInt16 = rightChannel ? floatTo16BitPCM(rightChannel) : null;
  
  onProgress?.(50);
  
  // Encode in chunks
  const totalBlocks = Math.ceil(samples / blockSize);
  for (let i = 0; i < samples; i += blockSize) {
    const leftChunk = leftInt16.subarray(i, i + blockSize);
    
    let mp3buf: Int8Array;
    if (channels === 1) {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    } else {
      const rightChunk = rightInt16!.subarray(i, i + blockSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    }
    
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    
    // Update progress (50-90%)
    const blockIndex = Math.floor(i / blockSize);
    const progressPercent = 50 + Math.floor((blockIndex / totalBlocks) * 40);
    if (blockIndex % 100 === 0) {
      onProgress?.(progressPercent);
    }
  }
  
  // Flush remaining data
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }
  
  onProgress?.(95);
  
  // Combine all MP3 chunks
  const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0);
  const mp3Array = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of mp3Data) {
    mp3Array.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.length), offset);
    offset += buf.length;
  }
  
  const compressedBlob = new Blob([mp3Array], { type: 'audio/mp3' });
  const compressedSize = compressedBlob.size;
  
  // Update filename to .mp3
  const newFileName = fileName.replace(/\.(wav|WAV)$/, '.mp3');
  
  console.log('Audio Compression: Compressed size:', (compressedSize / 1024 / 1024).toFixed(2), 'MB',
    '(', ((1 - compressedSize / originalSize) * 100).toFixed(1), '% reduction)');
  
  onProgress?.(100);
  
  // Close audio context
  audioContext.close();
  
  return {
    blob: compressedBlob,
    originalSize,
    compressedSize,
    wasCompressed: true,
    newFileName,
  };
}

/**
 * Convert Float32Array to Int16Array for MP3 encoding
 */
function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

/**
 * Upload compressed audio to Supabase storage and return the new URL
 */
export async function uploadCompressedAudio(
  blob: Blob,
  fileName: string,
  supabase: any
): Promise<string> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const storagePath = `audio-tracks/compressed-${timestamp}-${randomSuffix}-${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('user-files')
    .upload(storagePath, blob, {
      contentType: 'audio/mp3',
      cacheControl: '3600',
    });
  
  if (error) {
    throw new Error(`Failed to upload compressed audio: ${error.message}`);
  }
  
  const { data: urlData } = supabase.storage
    .from('user-files')
    .getPublicUrl(storagePath);
  
  return urlData.publicUrl;
}
