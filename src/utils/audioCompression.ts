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
 * Compress audio by downsampling and converting to mono
 * This is fast (offline processing) and significantly reduces file size
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
  
  try {
    const audioContext = new AudioContext();
    const arrayBuffer = await originalBlob.arrayBuffer();
    
    onProgress?.(20);
    
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    await audioContext.close();
    
    onProgress?.(30);
    
    const originalSampleRate = audioBuffer.sampleRate;
    const originalChannels = audioBuffer.numberOfChannels;
    const duration = audioBuffer.duration;
    
    console.log('Audio Compression: Original - channels:', originalChannels, 
      'sampleRate:', originalSampleRate, 'duration:', duration.toFixed(2), 's');
    
    // Target: 22050Hz mono for significant compression
    // This gives about 4x reduction from 48kHz stereo
    const targetSampleRate = 22050;
    const targetChannels = 1; // Mono
    
    // Calculate new length
    const newLength = Math.ceil(duration * targetSampleRate);
    
    // Use OfflineAudioContext to resample
    const offlineContext = new OfflineAudioContext(
      targetChannels,
      newLength,
      targetSampleRate
    );
    
    onProgress?.(40);
    
    // Create source and connect
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    // Render (this is fast - offline processing)
    const renderedBuffer = await offlineContext.startRendering();
    
    onProgress?.(70);
    
    console.log('Audio Compression: Resampled - channels:', renderedBuffer.numberOfChannels,
      'sampleRate:', renderedBuffer.sampleRate, 'length:', renderedBuffer.length);
    
    // Convert to WAV blob
    const wavBlob = audioBufferToWav(renderedBuffer);
    const compressedSize = wavBlob.size;
    
    onProgress?.(90);
    
    const newFileName = fileName.replace(/\.(wav|WAV)$/, '-compressed.wav');
    
    const reductionPercent = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log('Audio Compression: Compressed size:', (compressedSize / 1024 / 1024).toFixed(2), 'MB',
      '(', reductionPercent, '% reduction)');
    
    onProgress?.(100);
    
    // Check if still too large
    if (compressedSize > MAX_SIZE_FOR_UPLOAD) {
      console.log('Audio Compression: Still too large after compression:', 
        (compressedSize / 1024 / 1024).toFixed(2), 'MB');
      throw new Error(`File still too large after compression (${(compressedSize / 1024 / 1024).toFixed(1)}MB). Please compress externally to under 45MB.`);
    }
    
    return {
      blob: wavBlob,
      originalSize,
      compressedSize,
      wasCompressed: true,
      newFileName,
    };
    
  } catch (error) {
    console.error('Audio Compression: Failed:', error);
    throw error;
  }
}

/**
 * Convert AudioBuffer to WAV Blob (16-bit PCM)
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write audio data
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
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
      contentType: 'audio/wav',
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
