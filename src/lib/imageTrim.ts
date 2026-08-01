// Alpha-based bounding box for trimming transparent padding off uploaded
// logos. Pure function over raw RGBA bytes so it's testable without a
// canvas. Returns null when the image has no opaque pixels at all — the
// caller should keep the full frame in that case rather than cropping to
// nothing.
export interface OpaqueBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

// True if any pixel is even partially transparent — i.e. the image
// actually uses its alpha channel and must not be flattened to JPEG.
export function hasTransparency(data: Uint8ClampedArray | Uint8Array): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

export function computeOpaqueBounds(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  alphaThreshold = 8,
): OpaqueBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
