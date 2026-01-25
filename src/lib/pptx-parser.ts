import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';

export interface ParsedSlide {
  index: number;
  content: string;
  notes?: string;
  shapes: SlideShape[];
  images: SlideImage[];
  audio: SlideAudio[];
  backgroundColor?: string;
}

export interface SlideShape {
  type: 'text' | 'title' | 'subtitle' | 'body' | 'shape';
  text: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface SlideImage {
  id: string;
  src: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface SlideAudio {
  id: string;
  src: string;
  name?: string;
  autoplay?: boolean;
}

export interface PPTXParseResult {
  slides: ParsedSlide[];
  title?: string;
  author?: string;
  slideCount: number;
  images: Map<string, string>;
  audioFiles: Map<string, string>;
  slideSize?: {
    width: number;
    height: number;
  };
}

// EMU (English Metric Units) to pixels conversion
// 914400 EMUs = 1 inch, 96 pixels = 1 inch at standard DPI
const EMU_TO_PX = 96 / 914400;

// Default font sizes in points for different placeholder types
const DEFAULT_FONT_SIZES: Record<string, number> = {
  'title': 44,
  'ctrTitle': 60,
  'subTitle': 32,
  'body': 24,
  'text': 18,
  'ftr': 12,
  'dt': 12,
  'sldNum': 12,
};

// Default positions for placeholders when not specified (in pixels, for 1280x720 slide)
const DEFAULT_PLACEHOLDER_POSITIONS: Record<string, { x: number; y: number; width: number; height: number }> = {
  'title': { x: 64, y: 40, width: 1152, height: 80 },
  'ctrTitle': { x: 128, y: 260, width: 1024, height: 120 },
  'subTitle': { x: 192, y: 400, width: 896, height: 60 },
  'body': { x: 64, y: 140, width: 1152, height: 520 },
};

function getDefaultSlideSizePx() {
  // Default PPT widescreen (13.333" x 7.5") at 96DPI => 1280 x 720
  return { width: 1280, height: 720 };
}

// Parse color from XML (handles both RGB and theme colors)
function parseColor(node: Element | null): string | undefined {
  if (!node) return undefined;
  
  // Direct srgbClr
  const srgbClr = node.getElementsByTagName('a:srgbClr')[0];
  if (srgbClr) {
    return `#${srgbClr.getAttribute('val')}`;
  }
  
  // Check for schemeClr (theme colors) - map to common defaults
  const schemeClr = node.getElementsByTagName('a:schemeClr')[0];
  if (schemeClr) {
    const scheme = schemeClr.getAttribute('val');
    // Map common scheme colors to reasonable defaults
    const schemeMap: Record<string, string> = {
      'tx1': '#000000',  // Text 1
      'tx2': '#44546A',  // Text 2
      'bg1': '#FFFFFF',  // Background 1
      'bg2': '#E7E6E6',  // Background 2
      'accent1': '#4472C4',
      'accent2': '#ED7D31',
      'accent3': '#A5A5A5',
      'accent4': '#FFC000',
      'accent5': '#5B9BD5',
      'accent6': '#70AD47',
      'dk1': '#000000',
      'dk2': '#44546A',
      'lt1': '#FFFFFF',
      'lt2': '#E7E6E6',
    };
    if (scheme && schemeMap[scheme]) {
      return schemeMap[scheme];
    }
  }
  
  return undefined;
}

// Get the first element with tagName from direct children only
function getDirectChild(parent: Element, tagName: string): Element | null {
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i].tagName === tagName) {
      return parent.children[i];
    }
  }
  return null;
}

// Extract transform (position/size) from xfrm element
function extractTransform(sp: Element): { x?: number; y?: number; width?: number; height?: number } {
  // Look for xfrm in spPr first (shape properties)
  const spPr = sp.getElementsByTagName('p:spPr')[0] || sp.getElementsByTagName('pic:spPr')[0];
  let xfrm = spPr?.getElementsByTagName('a:xfrm')[0];
  
  // If not in spPr, look anywhere in the shape
  if (!xfrm) {
    xfrm = sp.getElementsByTagName('a:xfrm')[0];
  }
  
  if (!xfrm) return {};
  
  const off = xfrm.getElementsByTagName('a:off')[0];
  const ext = xfrm.getElementsByTagName('a:ext')[0];
  
  let x: number | undefined, y: number | undefined, width: number | undefined, height: number | undefined;
  
  if (off) {
    const xVal = off.getAttribute('x');
    const yVal = off.getAttribute('y');
    if (xVal) x = Math.round(parseInt(xVal, 10) * EMU_TO_PX);
    if (yVal) y = Math.round(parseInt(yVal, 10) * EMU_TO_PX);
  }
  
  if (ext) {
    const cxVal = ext.getAttribute('cx');
    const cyVal = ext.getAttribute('cy');
    if (cxVal) width = Math.round(parseInt(cxVal, 10) * EMU_TO_PX);
    if (cyVal) height = Math.round(parseInt(cyVal, 10) * EMU_TO_PX);
  }
  
  return { x, y, width, height };
}

// Extract text runs with full styling
function extractTextFromParagraph(p: Element): { 
  text: string; 
  fontSize?: number; 
  fontColor?: string;
  fontFamily?: string;
  bold?: boolean; 
  italic?: boolean; 
  align?: string;
} {
  const runs = p.getElementsByTagName('a:r');
  let text = '';
  let fontSize: number | undefined;
  let fontColor: string | undefined;
  let fontFamily: string | undefined;
  let bold = false;
  let italic = false;
  
  // Also check for field elements (like slide numbers, dates)
  const fields = p.getElementsByTagName('a:fld');
  
  // Process regular runs
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const t = run.getElementsByTagName('a:t')[0];
    if (t) {
      text += t.textContent || '';
    }
    
    // Get run properties
    const rPr = run.getElementsByTagName('a:rPr')[0];
    if (rPr) {
      // Font size (in hundredths of a point)
      const sz = rPr.getAttribute('sz');
      if (sz && !fontSize) fontSize = parseInt(sz, 10) / 100;
      
      // Bold and italic
      if (rPr.getAttribute('b') === '1') bold = true;
      if (rPr.getAttribute('i') === '1') italic = true;
      
      // Font color
      const solidFill = rPr.getElementsByTagName('a:solidFill')[0];
      if (solidFill && !fontColor) {
        fontColor = parseColor(solidFill);
      }
      
      // Font family
      const latin = rPr.getElementsByTagName('a:latin')[0];
      if (latin && !fontFamily) {
        fontFamily = latin.getAttribute('typeface') || undefined;
      }
    }
  }
  
  // Process fields
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const t = field.getElementsByTagName('a:t')[0];
    if (t) {
      text += t.textContent || '';
    }
  }
  
  // Get paragraph properties for alignment
  const pPr = p.getElementsByTagName('a:pPr')[0];
  let align: string | undefined;
  if (pPr) {
    align = pPr.getAttribute('algn') || undefined;
    
    // Check for default text run properties
    const defRPr = pPr.getElementsByTagName('a:defRPr')[0];
    if (defRPr) {
      const sz = defRPr.getAttribute('sz');
      if (sz && !fontSize) fontSize = parseInt(sz, 10) / 100;
      
      const solidFill = defRPr.getElementsByTagName('a:solidFill')[0];
      if (solidFill && !fontColor) {
        fontColor = parseColor(solidFill);
      }
    }
  }
  
  // Map PowerPoint alignment values
  if (align === 'ctr') align = 'center';
  else if (align === 'r') align = 'right';
  else if (align === 'l' || !align) align = 'left';
  
  return { text, fontSize, fontColor, fontFamily, bold, italic, align };
}

// Parse a single slide XML
function parseSlideXml(xml: string, slideIndex: number, slideSize: { width: number; height: number }): ParsedSlide {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  
  const shapes: SlideShape[] = [];
  const images: SlideImage[] = [];
  const audio: SlideAudio[] = [];
  let fullText = '';
  
  // Find all shape trees
  const spTree = doc.getElementsByTagName('p:spTree')[0];
  if (spTree) {
    // Get all shapes (sp elements)
    const sps = spTree.getElementsByTagName('p:sp');
    for (let i = 0; i < sps.length; i++) {
      const sp = sps[i];
      
      // Get shape position/size
      const transform = extractTransform(sp);
      
      // Get text content
      const txBody = sp.getElementsByTagName('p:txBody')[0];
      if (txBody) {
        const paragraphs = txBody.getElementsByTagName('a:p');
        let shapeText = '';
        let shapeStyle: Partial<SlideShape> = {};
        
        for (let j = 0; j < paragraphs.length; j++) {
          const { text, fontSize, fontColor, fontFamily, bold, italic, align } = extractTextFromParagraph(paragraphs[j]);
          if (text) {
            shapeText += (shapeText ? '\n' : '') + text;
            // Take first defined style values
            if (fontSize && !shapeStyle.fontSize) shapeStyle.fontSize = fontSize;
            if (fontColor && !shapeStyle.fontColor) shapeStyle.fontColor = fontColor;
            if (fontFamily && !shapeStyle.fontFamily) shapeStyle.fontFamily = fontFamily;
            if (bold) shapeStyle.bold = true;
            if (italic) shapeStyle.italic = true;
            if (align && !shapeStyle.align) shapeStyle.align = align as 'left' | 'center' | 'right';
          }
        }
        
        if (shapeText.trim()) {
          // Determine shape type based on placeholder type
          const nvSpPr = sp.getElementsByTagName('p:nvSpPr')[0];
          const ph = nvSpPr?.getElementsByTagName('p:ph')[0];
          const phType = ph?.getAttribute('type') || 'body';
          
          let type: SlideShape['type'] = 'text';
          if (phType === 'title' || phType === 'ctrTitle') type = 'title';
          else if (phType === 'subTitle') type = 'subtitle';
          else if (phType === 'body') type = 'body';
          
          // Apply default font size if not specified
          if (!shapeStyle.fontSize) {
            shapeStyle.fontSize = DEFAULT_FONT_SIZES[phType] || DEFAULT_FONT_SIZES['text'];
          }
          
          // Apply default position if transform is missing
          let finalX = transform.x;
          let finalY = transform.y;
          let finalWidth = transform.width;
          let finalHeight = transform.height;
          
          // If position is missing, use defaults based on placeholder type
          if (finalX === undefined || finalY === undefined) {
            const defaults = DEFAULT_PLACEHOLDER_POSITIONS[phType] || DEFAULT_PLACEHOLDER_POSITIONS['body'];
            if (finalX === undefined) finalX = defaults.x;
            if (finalY === undefined) finalY = defaults.y;
            if (finalWidth === undefined) finalWidth = defaults.width;
            if (finalHeight === undefined) finalHeight = defaults.height;
          }
          
          // Default alignment for titles is center
          if (!shapeStyle.align && (type === 'title' || type === 'subtitle')) {
            shapeStyle.align = 'center';
          }
          
          shapes.push({
            type,
            text: shapeText,
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            ...shapeStyle
          });
          
          fullText += (fullText ? '\n' : '') + shapeText;
        }
      }
    }
    
    // Get pictures
    const pics = spTree.getElementsByTagName('p:pic');
    for (let i = 0; i < pics.length; i++) {
      const pic = pics[i];
      const blipFill = pic.getElementsByTagName('p:blipFill')[0];
      const blip = blipFill?.getElementsByTagName('a:blip')[0];
      const embed = blip?.getAttribute('r:embed');
      
      if (embed) {
        const transform = extractTransform(pic);
        
        images.push({ 
          id: embed, 
          src: '', 
          x: transform.x,
          y: transform.y,
          width: transform.width,
          height: transform.height
        });
      }
    }
  }
  
  // Check for background color
  let backgroundColor: string | undefined;
  const cSld = doc.getElementsByTagName('p:cSld')[0];
  if (cSld) {
    const bg = cSld.getElementsByTagName('p:bg')[0];
    if (bg) {
      const bgPr = bg.getElementsByTagName('p:bgPr')[0];
      if (bgPr) {
        const solidFill = bgPr.getElementsByTagName('a:solidFill')[0];
        if (solidFill) {
          backgroundColor = parseColor(solidFill);
        }
      }
    }
  }
  
  return {
    index: slideIndex,
    content: fullText,
    shapes,
    images,
    audio,
    backgroundColor
  };
}

// Parse relationships file to get image mappings
function parseRelationships(xml: string): Map<string, string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const rels = new Map<string, string>();
  
  const relationships = doc.getElementsByTagName('Relationship');
  for (let i = 0; i < relationships.length; i++) {
    const rel = relationships[i];
    const id = rel.getAttribute('Id');
    const target = rel.getAttribute('Target');
    if (id && target) {
      rels.set(id, target);
    }
  }
  
  return rels;
}

export async function parsePowerPoint(fileUrl: string): Promise<PPTXParseResult> {
  console.log('[pptx-parser] Parsing PowerPoint from URL:', fileUrl);
  
  let fetchUrl = fileUrl;
  
  // If this is a Supabase storage URL, we need to create a signed URL for private buckets
  // or use the download endpoint for proper CORS handling
  if (fileUrl.includes('supabase.co/storage')) {
    console.log('[pptx-parser] Detected Supabase storage URL, attempting to get signed URL...');
    
    // Extract bucket and path from the URL
    // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    // or: https://{project}.supabase.co/storage/v1/object/{bucket}/{path}
    const urlMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)/);
    
    if (urlMatch) {
      const [, bucket, path] = urlMatch;
      console.log('[pptx-parser] Bucket:', bucket, 'Path:', path);
      
      // Try to create a signed URL (works for both public and private buckets)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour expiry
      
      if (signedUrlError) {
        console.error('[pptx-parser] Failed to create signed URL:', signedUrlError);
        // Fall back to trying the original URL
      } else if (signedUrlData?.signedUrl) {
        fetchUrl = signedUrlData.signedUrl;
        console.log('[pptx-parser] Using signed URL for fetch');
      }
    }
  }
  
  // Fetch the PPTX file
  let response: Response;
  try {
    console.log('[pptx-parser] Fetching from:', fetchUrl.substring(0, 100) + '...');
    response = await fetch(fetchUrl, {
      mode: 'cors',
      credentials: 'omit',
    });
  } catch (corsError) {
    console.error('[pptx-parser] CORS fetch failed:', corsError);
    throw new Error('Unable to fetch the PowerPoint file. The file may be in a private bucket or have CORS restrictions.');
  }
  
  if (!response.ok) {
    console.error('[pptx-parser] Fetch response not OK:', response.status, response.statusText);
    throw new Error(`Failed to fetch PowerPoint file: ${response.status} ${response.statusText}`);
  }
  
  // Verify we got binary data, not HTML error page
  const contentType = response.headers.get('content-type') || '';
  console.log('[pptx-parser] Response content-type:', contentType);
  
  if (contentType.includes('text/html')) {
    throw new Error('Received HTML instead of PowerPoint file. The file URL may be invalid or access denied.');
  }
  
  const arrayBuffer = await response.arrayBuffer();
  console.log('[pptx-parser] Fetched file size:', arrayBuffer.byteLength, 'bytes');
  
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Downloaded file is empty');
  }
  
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (zipError) {
    console.error('Failed to parse as ZIP:', zipError);
    throw new Error('File is not a valid PowerPoint (.pptx) file. Make sure the file was created in PowerPoint 2007 or later.');
  }
  
  // Get slide count from content types or by listing slides
  const slideFiles: string[] = [];
  zip.forEach((relativePath) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (match) {
      slideFiles.push(relativePath);
    }
  });
  
  // Sort slides by number
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
    const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
    return numA - numB;
  });
  
  // Parse each slide
  const slides: ParsedSlide[] = [];
  const allImages = new Map<string, string>();
  const allAudio = new Map<string, string>();

  // Try to detect slide size from presentation.xml
  let slideSize = getDefaultSlideSizePx();
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('string');
  if (presentationXml) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(presentationXml, 'application/xml');
      const sldSz = doc.getElementsByTagName('p:sldSz')?.[0];
      const cx = sldSz?.getAttribute('cx');
      const cy = sldSz?.getAttribute('cy');
      if (cx && cy) {
        slideSize = {
          width: Math.round(parseInt(cx, 10) * EMU_TO_PX),
          height: Math.round(parseInt(cy, 10) * EMU_TO_PX),
        };
      }
    } catch {
      // ignore and fall back to default
    }
  }
  
  // First, extract all audio files from the media folder
  const audioExtensions = ['mp3', 'wav', 'wma', 'm4a', 'ogg', 'aac'];
  zip.forEach((relativePath) => {
    const ext = relativePath.split('.').pop()?.toLowerCase();
    if (relativePath.startsWith('ppt/media/') && ext && audioExtensions.includes(ext)) {
      // Mark for extraction
      allAudio.set(relativePath, '');
    }
  });
  
  // Extract audio files - use Blob URLs instead of base64 to avoid CSP issues
  for (const [audioPath] of allAudio) {
    const audioData = await zip.file(audioPath)?.async('arraybuffer');
    if (audioData) {
      const ext = audioPath.split('.').pop()?.toLowerCase();
      let mimeType = 'audio/mpeg';
      if (ext === 'wav') mimeType = 'audio/wav';
      else if (ext === 'wma') mimeType = 'audio/x-ms-wma';
      else if (ext === 'm4a') mimeType = 'audio/mp4';
      else if (ext === 'ogg') mimeType = 'audio/ogg';
      else if (ext === 'aac') mimeType = 'audio/aac';
      
      // Create Blob URL - this works with CSP that allows 'blob:'
      const blob = new Blob([audioData], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      allAudio.set(audioPath, blobUrl);
      console.log('[pptx-parser] Extracted audio as Blob URL:', audioPath);
    }
  }
  
  for (let i = 0; i < slideFiles.length; i++) {
    const slideFile = slideFiles[i];
    const slideContent = await zip.file(slideFile)?.async('string');
    
    if (slideContent) {
      const slide = parseSlideXml(slideContent, i + 1, slideSize);
      
      // Get relationships for this slide to resolve image and audio references
      const relsPath = slideFile.replace('slides/', 'slides/_rels/').replace('.xml', '.xml.rels');
      const relsContent = await zip.file(relsPath)?.async('string');
      
      if (relsContent) {
        const rels = parseRelationships(relsContent);
        
        // Resolve image sources
        for (const img of slide.images) {
          const relTarget = rels.get(img.id);
          if (relTarget) {
            // Convert relative path to full path
            const imgPath = relTarget.startsWith('../') 
              ? 'ppt/' + relTarget.substring(3)
              : 'ppt/slides/' + relTarget;
            
            // Check if we already have this image
            if (!allImages.has(imgPath)) {
              const imgData = await zip.file(imgPath)?.async('base64');
              if (imgData) {
                // Determine MIME type from extension
                const ext = imgPath.split('.').pop()?.toLowerCase();
                let mimeType = 'image/png';
                if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                else if (ext === 'gif') mimeType = 'image/gif';
                else if (ext === 'svg') mimeType = 'image/svg+xml';
                else if (ext === 'webp') mimeType = 'image/webp';
                else if (ext === 'emf' || ext === 'wmf') mimeType = 'image/x-emf'; // Office formats
                
                allImages.set(imgPath, `data:${mimeType};base64,${imgData}`);
              }
            }
            
            img.src = allImages.get(imgPath) || '';
          }
        }
        
        // Check for audio relationships
        rels.forEach((target, relId) => {
          const ext = target.split('.').pop()?.toLowerCase();
          if (ext && audioExtensions.includes(ext)) {
            const audioPath = target.startsWith('../') 
              ? 'ppt/' + target.substring(3)
              : 'ppt/slides/' + target;
            
            const audioSrc = allAudio.get(audioPath);
            if (audioSrc) {
              const fileName = audioPath.split('/').pop() || 'audio';
              slide.audio.push({
                id: relId,
                src: audioSrc,
                name: fileName
              });
              console.log('[pptx-parser] Added audio to slide', i + 1, ':', fileName);
            }
          }
        });
      }
      
      slides.push(slide);
    }
  }
  
  // Try to get presentation title from core properties
  let title: string | undefined;
  let author: string | undefined;
  
  const coreProps = await zip.file('docProps/core.xml')?.async('string');
  if (coreProps) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(coreProps, 'application/xml');
    
    const titleEl = doc.getElementsByTagName('dc:title')[0];
    if (titleEl) title = titleEl.textContent || undefined;
    
    const creatorEl = doc.getElementsByTagName('dc:creator')[0];
    if (creatorEl) author = creatorEl.textContent || undefined;
  }
  
  console.log('[pptx-parser] Parse complete. Slides:', slides.length, 'Images:', allImages.size, 'Audio files:', allAudio.size);
  
  return {
    slides,
    title,
    author,
    slideCount: slides.length,
    images: allImages,
    audioFiles: allAudio,
    slideSize
  };
}
