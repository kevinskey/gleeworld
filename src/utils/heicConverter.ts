export interface HeicConversionResult {
  success: boolean;
  file?: File;
  originalFormat?: boolean;
  filename?: string;
  error?: string;
  isHeic?: boolean;
}

export const isHeicFile = (file: File): boolean => {
  return file.type === 'image/heic' || 
         file.type === 'image/heif' || 
         file.name.toLowerCase().endsWith('.heic') || 
         file.name.toLowerCase().endsWith('.heif');
};

export const convertHeicToJpeg = async (file: File): Promise<HeicConversionResult> => {
  try {
    console.log('Checking HEIC conversion for file:', file.name);
    
    // If not a HEIC file, return as-is
    if (!isHeicFile(file)) {
      return {
        success: true,
        file: file,
        originalFormat: true,
        filename: file.name
      };
    }

    console.log('HEIC file detected, attempting conversion...');
    
    try {
      // Dynamically import heic2any to avoid CSP issues during initial load
      const heic2any = await import('heic2any');
      
      // Convert HEIC to JPEG using heic2any
      const convertedBlob = await heic2any.default({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9
      }) as Blob;

      // Create a new File from the converted blob
      const convertedFileName = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
      const convertedFile = new File([convertedBlob], convertedFileName, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      console.log('HEIC conversion successful:', convertedFile);
      return {
        success: true,
        file: convertedFile,
        originalFormat: false,
        filename: convertedFileName
      };
    } catch (conversionError) {
      console.warn('HEIC conversion failed, CSP may be blocking web workers:', conversionError);
      
      // If conversion fails (likely due to CSP), return the original file
      // The user can still upload it, but as HEIC format
      return {
        success: false,
        file: file,
        originalFormat: true,
        filename: file.name,
        error: 'HEIC conversion not available in this environment. You can try uploading as-is or convert to JPEG manually.',
        isHeic: true
      };
    }

  } catch (error) {
    console.error('HEIC conversion setup failed:', error);
    return {
      success: false,
      error: `HEIC conversion not available: ${error instanceof Error ? error.message : 'Unknown error'}`,
      isHeic: isHeicFile(file),
      file: file,
      originalFormat: true,
      filename: file.name
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