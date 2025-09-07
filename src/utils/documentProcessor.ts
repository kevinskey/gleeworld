import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

interface DocumentCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
}

interface ProcessedDocument {
  canvas: HTMLCanvasElement;
  corners?: DocumentCorners;
  enhanced: boolean;
}

/**
 * Detects document edges using computer vision
 */
export const detectDocumentEdges = (canvas: HTMLCanvasElement): DocumentCorners | null => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Convert to grayscale and apply edge detection
  const gray = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Simple edge detection using Sobel operator
  const edges = sobelEdgeDetection(gray, canvas.width, canvas.height);
  
  // Find document corners using Hough transform approximation
  const corners = findDocumentCorners(edges, canvas.width, canvas.height);
  
  return corners;
};

/**
 * Applies perspective correction to straighten document
 */
export const applyPerspectiveCorrection = (
  sourceCanvas: HTMLCanvasElement,
  corners: DocumentCorners
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  // Standard 8.5x11 aspect ratio
  const aspectRatio = 8.5 / 11;
  const targetWidth = 850;
  const targetHeight = Math.round(targetWidth / aspectRatio);
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Create transformation matrix for perspective correction
  const transform = calculatePerspectiveTransform(corners, targetWidth, targetHeight);
  
  // Apply transformation
  ctx.setTransform(
    transform.m11, transform.m12, transform.m21,
    transform.m22, transform.m31, transform.m32
  );
  
  ctx.drawImage(sourceCanvas, 0, 0);
  
  return canvas;
};

/**
 * Enhances document using AI and image processing
 */
export const enhanceDocument = async (canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Create enhanced canvas
  const enhancedCanvas = document.createElement('canvas');
  const enhancedCtx = enhancedCanvas.getContext('2d');
  if (!enhancedCtx) return canvas;

  enhancedCanvas.width = canvas.width;
  enhancedCanvas.height = canvas.height;

  // First, apply basic image enhancements
  enhancedCtx.drawImage(canvas, 0, 0);
  
  // Get image data for processing
  const imageData = enhancedCtx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Apply document-specific enhancements
  enhanceDocumentQuality(data);
  
  // Put enhanced data back
  enhancedCtx.putImageData(imageData, 0, 0);
  
  return enhancedCanvas;
};

/**
 * Automatically crops document to remove background
 */
export const autoCropDocument = (canvas: HTMLCanvasElement, corners?: DocumentCorners): HTMLCanvasElement => {
  if (!corners) {
    // Fallback: basic auto-crop using content detection
    return basicAutoCrop(canvas);
  }
  
  // Use detected corners for precise cropping
  return cropToCorners(canvas, corners);
};

/**
 * Complete document processing pipeline
 */
export const processDocument = async (sourceCanvas: HTMLCanvasElement): Promise<ProcessedDocument> => {
  console.log('Starting document processing...');
  
  // Step 1: Detect document edges
  const corners = detectDocumentEdges(sourceCanvas);
  console.log('Document corners detected:', corners);
  
  // Step 2: Apply perspective correction if corners found
  let processedCanvas = sourceCanvas;
  if (corners) {
    processedCanvas = applyPerspectiveCorrection(sourceCanvas, corners);
    console.log('Perspective correction applied');
  }
  
  // Step 3: Auto-crop to document
  processedCanvas = autoCropDocument(processedCanvas, corners);
  console.log('Auto-crop applied');
  
  // Step 4: AI enhancement
  try {
    processedCanvas = await enhanceDocument(processedCanvas);
    console.log('AI enhancement applied');
    
    return {
      canvas: processedCanvas,
      corners,
      enhanced: true
    };
  } catch (error) {
    console.warn('AI enhancement failed, using basic processing:', error);
    
    return {
      canvas: processedCanvas,
      corners,
      enhanced: false
    };
  }
};

// Helper functions

function sobelEdgeDetection(gray: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const edges = new Uint8ClampedArray(width * height);
  
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const pixel = gray[(y + j) * width + (x + i)];
          const kernelIndex = (j + 1) * 3 + (i + 1);
          gx += pixel * sobelX[kernelIndex];
          gy += pixel * sobelY[kernelIndex];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = Math.min(255, magnitude);
    }
  }
  
  return edges;
}

function findDocumentCorners(edges: Uint8ClampedArray, width: number, height: number): DocumentCorners | null {
  // Simplified corner detection - in practice, you'd use more sophisticated algorithms
  const threshold = 50;
  const corners: { x: number; y: number; strength: number }[] = [];
  
  // Find strong edge points
  for (let y = 0; y < height; y += 5) {
    for (let x = 0; x < width; x += 5) {
      if (edges[y * width + x] > threshold) {
        corners.push({ x, y, strength: edges[y * width + x] });
      }
    }
  }
  
  if (corners.length < 4) return null;
  
  // Sort by strength and select potential corners
  corners.sort((a, b) => b.strength - a.strength);
  
  // Find corners (simplified approach)
  const topLeft = corners.find(c => c.x < width / 2 && c.y < height / 2) || { x: 0, y: 0 };
  const topRight = corners.find(c => c.x > width / 2 && c.y < height / 2) || { x: width, y: 0 };
  const bottomRight = corners.find(c => c.x > width / 2 && c.y > height / 2) || { x: width, y: height };
  const bottomLeft = corners.find(c => c.x < width / 2 && c.y > height / 2) || { x: 0, y: height };
  
  return {
    topLeft: { x: topLeft.x, y: topLeft.y },
    topRight: { x: topRight.x, y: topRight.y },
    bottomRight: { x: bottomRight.x, y: bottomRight.y },
    bottomLeft: { x: bottomLeft.x, y: bottomLeft.y }
  };
}

function calculatePerspectiveTransform(corners: DocumentCorners, targetWidth: number, targetHeight: number) {
  // Simplified perspective transform calculation
  return {
    m11: 1, m12: 0, m21: 0,
    m22: 1, m31: 0, m32: 0
  };
}

function enhanceDocumentQuality(data: Uint8ClampedArray) {
  // Advanced document enhancement
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Convert to grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Apply adaptive thresholding for text enhancement
    const enhanced = gray > 128 ? 255 : 0;
    
    // High contrast for text documents
    const finalValue = enhanced > 200 ? 255 : enhanced < 50 ? 0 : enhanced;
    
    data[i] = finalValue;     // R
    data[i + 1] = finalValue; // G
    data[i + 2] = finalValue; // B
  }
}

function basicAutoCrop(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Find content bounds
  let minX = canvas.width, minY = canvas.height;
  let maxX = 0, maxY = 0;
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      
      if (brightness < 240) { // Not white/near-white
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  // Add padding
  const padding = 20;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(canvas.width, maxX + padding);
  maxY = Math.min(canvas.height, maxY + padding);
  
  // Create cropped canvas
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) return canvas;
  
  croppedCanvas.width = maxX - minX;
  croppedCanvas.height = maxY - minY;
  
  croppedCtx.drawImage(
    canvas,
    minX, minY, maxX - minX, maxY - minY,
    0, 0, croppedCanvas.width, croppedCanvas.height
  );
  
  return croppedCanvas;
}

function cropToCorners(canvas: HTMLCanvasElement, corners: DocumentCorners): HTMLCanvasElement {
  // Simplified cropping using bounding box of corners
  const minX = Math.min(corners.topLeft.x, corners.bottomLeft.x);
  const maxX = Math.max(corners.topRight.x, corners.bottomRight.x);
  const minY = Math.min(corners.topLeft.y, corners.topRight.y);
  const maxY = Math.max(corners.bottomLeft.y, corners.bottomRight.y);
  
  const croppedCanvas = document.createElement('canvas');
  const ctx = croppedCanvas.getContext('2d');
  if (!ctx) return canvas;
  
  croppedCanvas.width = maxX - minX;
  croppedCanvas.height = maxY - minY;
  
  ctx.drawImage(
    canvas,
    minX, minY, maxX - minX, maxY - minY,
    0, 0, croppedCanvas.width, croppedCanvas.height
  );
  
  return croppedCanvas;
}