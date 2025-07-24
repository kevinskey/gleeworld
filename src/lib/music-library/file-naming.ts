import { supabase } from '@/integrations/supabase/client';

export interface FileNamingOptions {
  title: string;
  composer?: string;
  voicePart?: string;
  version?: number;
  year?: number;
}

/**
 * Generate standardized filename using database function
 * Format: YYYY_composer_title_voicepart_v1.pdf
 */
export const generateSheetMusicFilename = async (options: FileNamingOptions): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('generate_sheet_music_filename', {
      p_title: options.title,
      p_composer: options.composer || null,
      p_voice_part: options.voicePart || null,
      p_version: options.version || 1
    });

    if (error) throw error;
    return data || `${new Date().getFullYear()}_${cleanFilename(options.title)}_v1.pdf`;
  } catch (error) {
    console.error('Error generating filename:', error);
    // Fallback to client-side generation
    return generateClientFilename(options);
  }
};

/**
 * Client-side fallback filename generation
 */
const generateClientFilename = (options: FileNamingOptions): string => {
  const year = options.year || new Date().getFullYear();
  const cleanTitle = cleanFilename(options.title);
  const cleanComposer = options.composer ? cleanFilename(options.composer) : null;
  const cleanVoicePart = options.voicePart ? cleanFilename(options.voicePart) : null;
  const version = options.version || 1;

  let filename = `${year}`;
  
  if (cleanComposer) {
    filename += `_${cleanComposer}`;
  }
  
  filename += `_${cleanTitle}`;
  
  if (cleanVoicePart) {
    filename += `_${cleanVoicePart}`;
  }
  
  filename += `_v${version}.pdf`;
  
  return filename;
};

/**
 * Clean filename by removing special characters
 */
const cleanFilename = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
};

/**
 * Validate file type for sheet music uploads
 */
export const isValidSheetMusicFile = (filename: string): boolean => {
  const validExtensions = ['pdf', 'musicxml', 'mxl', 'mid', 'midi'];
  const extension = getFileExtension(filename);
  return validExtensions.includes(extension);
};

/**
 * Generate thumbnail filename from PDF filename
 */
export const generateThumbnailFilename = (pdfFilename: string): string => {
  const baseName = pdfFilename.replace(/\.[^/.]+$/, '');
  return `${baseName}_thumb.jpg`;
};

/**
 * Generate audio preview filename from original filename
 */
export const generateAudioFilename = (originalFilename: string): string => {
  const baseName = originalFilename.replace(/\.[^/.]+$/, '');
  return `${baseName}_preview.mp3`;
};