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

  return (
    <div
      ref={ref}
      className={className}
      style={{ backgroundColor: slide.backgroundColor || 'hsl(var(--background))' }}
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
        {/* Shapes */}
        {slide.shapes.map((shape, idx) => (
          <div
            key={idx}
            className="absolute"
            style={{
              left: shape.x ?? 0,
              top: shape.y ?? 0,
              width: shape.width ?? 'auto',
              height: shape.height ?? 'auto',
              fontSize: shape.fontSize ? `${shape.fontSize}pt` : undefined,
              color: shape.fontColor,
              fontFamily: shape.fontFamily,
              fontWeight: shape.bold ? 700 : undefined,
              fontStyle: shape.italic ? 'italic' : undefined,
              textAlign: shape.align,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.15,
              overflow: 'hidden',
            }}
          >
            {shape.text}
          </div>
        ))}

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
                width: img.width ?? undefined,
                height: img.height ?? undefined,
                objectFit: 'contain',
              }}
              draggable={false}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
