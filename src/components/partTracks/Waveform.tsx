// Simple peaks-based waveform renderer for the multitrack timeline.
// Draws on canvas with a tinted fill that matches the track color.

import { useEffect, useRef } from 'react';

interface WaveformProps {
  peaks: number[] | null;
  color: string;
  height?: number;
  progress?: number; // 0..1 — paints a played-position overlay
  /** Where in the row (0..1) the take's peaks begin. Used when the
   *  take was recorded mid-song: e.g. a vocal that started at 30s in
   *  a 180s project sits at offsetFrac = 30/180. Default 0. */
  offsetFrac?: number;
  /** Width of the take's peaks within the row (0..1). Lets a 60s take
   *  in a 180s project draw only across the middle third of the row
   *  instead of stretching full-width. Default 1. */
  widthFrac?: number;
  /** Fires when the user clicks/taps the waveform. Receives the
   *  fractional position (0..1) within the timeline so the parent can
   *  translate it to seconds against the track's duration / master
   *  timeline. */
  onSeek?: (frac: number) => void;
}

export function Waveform({
  peaks, color, height = 56, progress = 0,
  offsetFrac = 0, widthFrac = 1, onSeek,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
    const dpr = window.devicePixelRatio || 1;
    // Size from the PARENT, not the canvas itself: a previous draw pins
    // canvas.style.width to pixels, so measuring the canvas would keep
    // returning the stale width forever after the container resizes
    // (e.g. the timeline-zoom lane widening).
    const rect = { width: canvas.parentElement?.clientWidth ?? canvas.getBoundingClientRect().width };
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, height);

    // The "take region" is where the recorded peaks live on the master
    // timeline. Tracks recorded mid-song (record_offset_sec > 0) sit
    // partway in; tracks shorter than the master take only fill part
    // of the row. Outside that region the row is empty (centerline).
    const clampedOffset = Math.max(0, Math.min(1, offsetFrac));
    const clampedWidth = Math.max(0, Math.min(1 - clampedOffset, widthFrac));
    const regionX = rect.width * clampedOffset;
    const regionW = rect.width * clampedWidth;

    if (!peaks || peaks.length === 0 || regionW <= 0) {
      // Empty-track / out-of-range placeholder — a thin centerline.
      ctx.strokeStyle = `${color}33`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(rect.width, height / 2);
      ctx.stroke();
    } else {
      // Visual auto-scale: a typical vocal take peaks at 0.1–0.3, so
      // amp * height left the bars looking microscopic on a tall row.
      // We divide every bucket by the loudest one so the loudest bar
      // hits ~95% of the row height. Floor at 0.1 so a silent track
      // doesn't end up amplified to look like noise.
      let maxPeak = 0;
      for (let i = 0; i < peaks.length; i++) {
        if (peaks[i] > maxPeak) maxPeak = peaks[i];
      }
      const scale = maxPeak > 0.1 ? 0.95 / maxPeak : 0.95 / 0.1;

      // Draw a thin centerline across the rest of the row so the user
      // can see where on the master timeline the take sits.
      ctx.strokeStyle = `${color}1f`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(rect.width, height / 2);
      ctx.stroke();

      const playedX = rect.width * Math.max(0, Math.min(1, progress));
      const stepW = regionW / peaks.length;
      for (let i = 0; i < peaks.length; i++) {
        const px = regionX + i * stepW;
        const amp = peaks[i];
        const h = Math.max(1, Math.min(height, amp * scale * height));
        const top = (height - h) / 2;
        ctx.fillStyle = px < playedX ? color : `${color}66`;
        ctx.fillRect(px, top, Math.max(0.5, stepW * 0.9), h);
      }
    }

    // Master playhead — one consistent vertical line at master time on
    // every row. Painted last so it sits over the peaks.
    if (progress > 0 && progress < 1) {
      const playedX = rect.width * Math.max(0, Math.min(1, progress));
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playedX, 0);
      ctx.lineTo(playedX, height);
      ctx.stroke();
    }
    };

    draw();
    // Redraw when the lane resizes (timeline zoom, orientation change,
    // window resize) — prop changes alone can't see container width.
    const ro = new ResizeObserver(draw);
    ro.observe(canvas.parentElement ?? canvas);
    return () => ro.disconnect();
  }, [peaks, color, height, progress, offsetFrac, widthFrac]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={(e) => {
        if (!onSeek) return;
        const r = e.currentTarget.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        onSeek(frac);
      }}
      className={`w-full block ${onSeek ? 'cursor-pointer touch-manipulation' : ''}`}
      style={{ height, touchAction: onSeek ? 'none' : undefined }}
    />
  );
}
