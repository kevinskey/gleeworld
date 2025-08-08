/**
 * Utility functions for generating file thumbnails
 */

// Generate thumbnail for image files
export const generateImageThumbnail = (file: File, maxSize: number = 150): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      const { width, height } = calculateThumbnailDimensions(img.width, img.height, maxSize);
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress image
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        },
        'image/jpeg',
        0.8
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Generate thumbnail for video files
export const generateVideoThumbnail = (file: File, maxSize: number = 150): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% of duration, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.1);
    };
    
    video.onseeked = () => {
      const { width, height } = calculateThumbnailDimensions(video.videoWidth, video.videoHeight, maxSize);
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(video, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to create video thumbnail'));
          }
        },
        'image/jpeg',
        0.8
      );
    };
    
    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(file);
    video.load();
  });
};

// Generate thumbnail for PDF files using PDF.js
export const generatePDFThumbnail = async (file: File, maxSize: number = 150): Promise<string> => {
  try {
    // Dynamically import PDF.js
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const scale = maxSize / Math.max(page.getViewport({ scale: 1 }).width, page.getViewport({ scale: 1 }).height);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
      canvasContext: ctx!,
      viewport
    }).promise;
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to create PDF thumbnail'));
          }
        },
        'image/jpeg',
        0.8
      );
    });
  } catch (error) {
    throw new Error('Failed to generate PDF thumbnail: ' + (error as Error).message);
  }
};

// Generate thumbnail based on file type
export const generateThumbnail = async (file: File, maxSize: number = 150): Promise<string | null> => {
  try {
    if (file.type.startsWith('image/')) {
      return await generateImageThumbnail(file, maxSize);
    } else if (file.type.startsWith('video/')) {
      return await generateVideoThumbnail(file, maxSize);
    } else if (file.type === 'application/pdf') {
      return await generatePDFThumbnail(file, maxSize);
    }
    return null;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null;
  }
};

// Calculate thumbnail dimensions maintaining aspect ratio
const calculateThumbnailDimensions = (originalWidth: number, originalHeight: number, maxSize: number) => {
  const aspectRatio = originalWidth / originalHeight;
  
  let width, height;
  
  if (originalWidth > originalHeight) {
    width = Math.min(maxSize, originalWidth);
    height = width / aspectRatio;
  } else {
    height = Math.min(maxSize, originalHeight);
    width = height * aspectRatio;
  }
  
  return { width: Math.round(width), height: Math.round(height) };
};

// Clean up thumbnail URLs to prevent memory leaks
export const cleanupThumbnail = (thumbnailUrl: string) => {
  if (thumbnailUrl.startsWith('blob:')) {
    URL.revokeObjectURL(thumbnailUrl);
  }
};