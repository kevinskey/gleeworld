import { useEffect, useMemo, useRef, useState } from 'react';
import type { ParsedSlide } from '@/lib/pptx-parser';

type SlideSize = { width: number; height: number };

interface SlideRendererProps {
  slide: ParsedSlide;
  slideSize?: SlideSize;
  className?: string;
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const cr = entry.contentRect;
      setSize({ width: cr.width, height: cr.height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size };
}

export function SlideRenderer({ slide, slideSize, className }: SlideRendererProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const baseSize = slideSize ?? { width: 1280, height: 720 };

  const scale = useMemo(() => {
    if (!size.width || !size.height) return 1;
    return Math.min(size.width / baseSize.width, size.height / baseSize.height);
  }, [size.width, size.height, baseSize.width, baseSize.height]);

  const offset = useMemo(() => {
    const w = baseSize.width * scale;
    const h = baseSize.height * scale;
    return {
      left: Math.max(0, (size.width - w) / 2),
      top: Math.max(0, (size.height - h) / 2),
    };
  }, [size.width, size.height, baseSize.width, baseSize.height, scale]);

  // Separate shapes with positions vs those without (need auto-layout)
  const positionedShapes = slide.shapes.filter(s => s.x != null && s.y != null);
  const unpositionedShapes = slide.shapes.filter(s => s.x == null || s.y == null);

  return (
    <div
      ref={ref}
      className={className}
      style={{ 
        backgroundColor: slide.backgroundColor || 'hsl(var(--background))',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* scaled slide canvas */}
      <div
        className="absolute"
        style={{
          left: offset.left,
          top: offset.top,
          width: baseSize.width,
          height: baseSize.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Positioned Shapes (absolute positioning from PPTX) */}
        {positionedShapes.map((shape, idx) => (
          <div
            key={`pos-${idx}`}
            className="absolute"
            style={{
              left: shape.x ?? 0,
              top: shape.y ?? 0,
              width: shape.width ?? 'auto',
              height: shape.height ?? 'auto',
              fontSize: shape.fontSize ? `${Math.max(shape.fontSize, 12)}pt` : '18pt',
              color: shape.fontColor || 'hsl(var(--foreground))',
              fontFamily: shape.fontFamily || 'inherit',
              fontWeight: shape.bold ? 700 : 400,
              fontStyle: shape.italic ? 'italic' : 'normal',
              textAlign: shape.align || 'left',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.3,
              overflow: 'visible',
              display: 'flex',
              alignItems: shape.type === 'title' ? 'center' : 'flex-start',
              justifyContent: shape.align === 'center' ? 'center' : shape.align === 'right' ? 'flex-end' : 'flex-start',
              padding: '4px',
            }}
          >
            {shape.text}
          </div>
        ))}

        {/* Unpositioned Shapes (fallback auto-layout) */}
        {unpositionedShapes.length > 0 && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8"
            style={{ pointerEvents: 'none' }}
          >
            {unpositionedShapes.map((shape, idx) => (
              <div
                key={`auto-${idx}`}
                style={{
                  fontSize: shape.fontSize ? `${Math.max(shape.fontSize, 14)}pt` : shape.type === 'title' ? '36pt' : '18pt',
                  color: shape.fontColor || 'hsl(var(--foreground))',
                  fontFamily: shape.fontFamily || 'inherit',
                  fontWeight: shape.bold || shape.type === 'title' ? 700 : 400,
                  fontStyle: shape.italic ? 'italic' : 'normal',
                  textAlign: shape.align || 'center',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.4,
                  maxWidth: '90%',
                }}
              >
                {shape.text}
              </div>
            ))}
          </div>
        )}

        {/* Images */}
        {slide.images.map((img, idx) =>
          img.src ? (
            <img
              key={idx}
              src={img.src}
              alt=""
              className="absolute"
              style={{
                left: img.x ?? 0,
                top: img.y ?? 0,
                width: img.width ?? 'auto',
                height: img.height ?? 'auto',
                objectFit: 'contain',
                maxWidth: img.width ? undefined : '100%',
                maxHeight: img.height ? undefined : '100%',
              }}
              draggable={false}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
