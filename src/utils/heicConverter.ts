import { supabase } from "@/integrations/supabase/client";

export interface HeicConversionResult {
  success: boolean;
  base64?: string;
  originalFormat?: boolean;
  filename?: string;
  error?: string;
  isHeic?: boolean;
  suggestion?: string;
}

export const isHeicFile = (file: File): boolean => {
  return file.type === 'image/heic' || 
         file.type === 'image/heif' || 
         file.name.toLowerCase().endsWith('.heic') || 
         file.name.toLowerCase().endsWith('.heif');
};

export const convertHeicToJpeg = async (file: File): Promise<HeicConversionResult> => {
  try {
    console.log('Starting HEIC conversion for file:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);

    const { data, error } = await supabase.functions.invoke('convert-heic-to-jpeg', {
      body: formData,
    });

    if (error) {
      console.error('Edge function error:', error);
      return {
        success: false,
        error: 'Failed to process image',
        isHeic: isHeicFile(file)
      };
    }

    if (data.error) {
      console.warn('Conversion error:', data.error);
      return {
        success: false,
        error: data.error,
        isHeic: data.isHeic,
        suggestion: data.suggestion
      };
    }

    console.log('HEIC conversion successful');
    return {
      success: true,
      base64: data.base64,
      originalFormat: data.originalFormat,
      filename: data.filename || file.name
    };

  } catch (error) {
    console.error('HEIC conversion failed:', error);
    return {
      success: false,
      error: 'Failed to convert HEIC file',
      isHeic: isHeicFile(file)
    };
  }
};

export const createFileFromBase64 = (base64: string, filename: string): File => {
  // Extract the base64 data
  const base64Data = base64.split(',')[1];
  const mimeType = base64.split(',')[0].split(':')[1].split(';')[0];
  
  // Convert base64 to blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  // Create file from blob
  return new File([blob], filename, { type: mimeType });
};