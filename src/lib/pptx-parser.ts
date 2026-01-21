import JSZip from 'jszip';

export interface ParsedSlide {
  index: number;
  content: string;
  notes?: string;
  shapes: SlideShape[];
  images: SlideImage[];
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

export interface PPTXParseResult {
  slides: ParsedSlide[];
  title?: string;
  author?: string;
  slideCount: number;
  images: Map<string, string>;
}

// EMU (English Metric Units) to pixels conversion
const EMU_TO_PX = 1 / 914400 * 96;

// Parse color from XML (handles both RGB and theme colors)
function parseColor(colorNode: Element | null): string | undefined {
  if (!colorNode) return undefined;
  
  const srgbClr = colorNode.getElementsByTagName('a:srgbClr')[0];
  if (srgbClr) {
    return `#${srgbClr.getAttribute('val')}`;
  }
  
  return undefined;
}

// Extract text from paragraph elements
function extractTextFromParagraph(p: Element): { text: string; fontSize?: number; bold?: boolean; italic?: boolean; align?: string } {
  const runs = p.getElementsByTagName('a:r');
  let text = '';
  let fontSize: number | undefined;
  let bold = false;
  let italic = false;
  
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const t = run.getElementsByTagName('a:t')[0];
    if (t) {
      text += t.textContent || '';
    }
    
    const rPr = run.getElementsByTagName('a:rPr')[0];
    if (rPr) {
      const sz = rPr.getAttribute('sz');
      if (sz) fontSize = parseInt(sz) / 100;
      if (rPr.getAttribute('b') === '1') bold = true;
      if (rPr.getAttribute('i') === '1') italic = true;
    }
  }
  
  const pPr = p.getElementsByTagName('a:pPr')[0];
  let align: string | undefined;
  if (pPr) {
    align = pPr.getAttribute('algn') || undefined;
  }
  
  return { text, fontSize, bold, italic, align };
}

// Parse a single slide XML
function parseSlideXml(xml: string, slideIndex: number): ParsedSlide {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  
  const shapes: SlideShape[] = [];
  const images: SlideImage[] = [];
  let fullText = '';
  
  // Find all shape trees
  const spTree = doc.getElementsByTagName('p:spTree')[0];
  if (spTree) {
    // Get all shapes (sp elements)
    const sps = spTree.getElementsByTagName('p:sp');
    for (let i = 0; i < sps.length; i++) {
      const sp = sps[i];
      
      // Get shape position/size
      const xfrm = sp.getElementsByTagName('a:xfrm')[0];
      let x: number | undefined, y: number | undefined, width: number | undefined, height: number | undefined;
      
      if (xfrm) {
        const off = xfrm.getElementsByTagName('a:off')[0];
        const ext = xfrm.getElementsByTagName('a:ext')[0];
        
        if (off) {
          x = Math.round(parseInt(off.getAttribute('x') || '0') * EMU_TO_PX);
          y = Math.round(parseInt(off.getAttribute('y') || '0') * EMU_TO_PX);
        }
        if (ext) {
          width = Math.round(parseInt(ext.getAttribute('cx') || '0') * EMU_TO_PX);
          height = Math.round(parseInt(ext.getAttribute('cy') || '0') * EMU_TO_PX);
        }
      }
      
      // Get text content
      const txBody = sp.getElementsByTagName('p:txBody')[0];
      if (txBody) {
        const paragraphs = txBody.getElementsByTagName('a:p');
        let shapeText = '';
        let shapeStyle: Partial<SlideShape> = {};
        
        for (let j = 0; j < paragraphs.length; j++) {
          const { text, fontSize, bold, italic, align } = extractTextFromParagraph(paragraphs[j]);
          if (text) {
            shapeText += (shapeText ? '\n' : '') + text;
            if (fontSize) shapeStyle.fontSize = fontSize;
            if (bold) shapeStyle.bold = true;
            if (italic) shapeStyle.italic = true;
            if (align) shapeStyle.align = align as 'left' | 'center' | 'right';
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
          
          shapes.push({
            type,
            text: shapeText,
            x, y, width, height,
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
      const blip = pic.getElementsByTagName('a:blip')[0];
      const embed = blip?.getAttribute('r:embed');
      
      if (embed) {
        const xfrm = pic.getElementsByTagName('a:xfrm')[0];
        let x: number | undefined, y: number | undefined, width: number | undefined, height: number | undefined;
        
        if (xfrm) {
          const off = xfrm.getElementsByTagName('a:off')[0];
          const ext = xfrm.getElementsByTagName('a:ext')[0];
          
          if (off) {
            x = Math.round(parseInt(off.getAttribute('x') || '0') * EMU_TO_PX);
            y = Math.round(parseInt(off.getAttribute('y') || '0') * EMU_TO_PX);
          }
          if (ext) {
            width = Math.round(parseInt(ext.getAttribute('cx') || '0') * EMU_TO_PX);
            height = Math.round(parseInt(ext.getAttribute('cy') || '0') * EMU_TO_PX);
          }
        }
        
        images.push({ id: embed, src: '', x, y, width, height });
      }
    }
  }
  
  // Check for background color
  const bgClr = doc.getElementsByTagName('p:bg')[0];
  let backgroundColor: string | undefined;
  if (bgClr) {
    backgroundColor = parseColor(bgClr);
  }
  
  return {
    index: slideIndex,
    content: fullText,
    shapes,
    images,
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
  console.log('Parsing PowerPoint from URL:', fileUrl);
  
  // Fetch the PPTX file with CORS mode
  let response: Response;
  try {
    response = await fetch(fileUrl, {
      mode: 'cors',
      credentials: 'omit',
    });
  } catch (corsError) {
    console.error('CORS fetch failed, trying no-cors fallback:', corsError);
    // Try with different approach - this will fail for opaque responses but provides better error info
    throw new Error('Unable to fetch the PowerPoint file. The file may be in a private bucket or have CORS restrictions.');
  }
  
  if (!response.ok) {
    console.error('Fetch response not OK:', response.status, response.statusText);
    throw new Error(`Failed to fetch PowerPoint file: ${response.status} ${response.statusText}`);
  }
  
  // Verify we got binary data, not HTML error page
  const contentType = response.headers.get('content-type') || '';
  console.log('Response content-type:', contentType);
  
  if (contentType.includes('text/html')) {
    throw new Error('Received HTML instead of PowerPoint file. The file URL may be invalid or access denied.');
  }
  
  const arrayBuffer = await response.arrayBuffer();
  console.log('Fetched file size:', arrayBuffer.byteLength, 'bytes');
  
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
  
  for (let i = 0; i < slideFiles.length; i++) {
    const slideFile = slideFiles[i];
    const slideContent = await zip.file(slideFile)?.async('string');
    
    if (slideContent) {
      const slide = parseSlideXml(slideContent, i + 1);
      
      // Get relationships for this slide to resolve image references
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
                
                allImages.set(imgPath, `data:${mimeType};base64,${imgData}`);
              }
            }
            
            img.src = allImages.get(imgPath) || '';
          }
        }
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
  
  return {
    slides,
    title,
    author,
    slideCount: slides.length,
    images: allImages
  };
}
