// Drag-to-resize a column / panel by its right edge.
//
// Returns the current width + props for a 4-px drag handle you place on
// the right edge of the resizable container. State persists per `key`
// into localStorage so the user's choice survives a reload.

import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  min?: number;
  max?: number;
  storageKey?: string;
}

export function useResizableWidth(initial: number, options: Options = {}) {
  const { min = 160, max = 600, storageKey } = options;

  const [width, setWidth] = useState<number>(() => {
    if (!storageKey || typeof window === 'undefined') return initial;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return initial;
    const n = Number(stored);
    if (!Number.isFinite(n)) return initial;
    return Math.min(max, Math.max(min, n));
  });

  // Refs hold mutable drag state so onMouseMove / onTouchMove handlers
  // don't have stale closures.
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Persist debounced — we don't need to hit localStorage on every pixel.
  useEffect(() => {
    if (!storageKey) return;
    const t = window.setTimeout(() => {
      try { window.localStorage.setItem(storageKey, String(width)); } catch { /* ignore quota */ }
    }, 250);
    return () => window.clearTimeout(t);
  }, [width, storageKey]);

  const startDrag = useCallback((clientX: number) => {
    dragStartRef.current = { startX: clientX, startWidth: width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current) return;
    const delta = e.clientX - dragStartRef.current.startX;
    setWidth(Math.min(max, Math.max(min, dragStartRef.current.startWidth + delta)));
  }, [min, max]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!dragStartRef.current) return;
    const t = e.touches[0];
    if (!t) return;
    const delta = t.clientX - dragStartRef.current.startX;
    setWidth(Math.min(max, Math.max(min, dragStartRef.current.startWidth + delta)));
  }, [min, max]);

  const endDrag = useCallback(() => {
    dragStartRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    const up = () => endDrag();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', up);
    };
  }, [onMouseMove, onTouchMove, endDrag]);

  const handleProps = {
    onMouseDown: (e: React.MouseEvent) => { e.preventDefault(); startDrag(e.clientX); },
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (t) startDrag(t.clientX);
    },
    role: 'separator' as const,
    'aria-orientation': 'vertical' as const,
  };

  return { width, handleProps };
}
