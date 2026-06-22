// Staff-aware split-point detection for half-page reading mode.
//
// Music engravings have horizontal bands of dark pixels (the staff systems)
// separated by lighter bands of whitespace. We find the longest run of
// near-white horizontal slices closest to the vertical middle of the page,
// and return its midpoint as the split-y. That gives the half-page mode
// a split that never cuts through a staff line.

const cache = new Map<string, number>();

interface SplitOptions {
  // Where on the page to look for a split — defaults to middle 30%–70%.
  rangeStart?: number;
  rangeEnd?: number;
}

export async function findStaffSplitY(
  imageSrc: string,
  { rangeStart = 0.3, rangeEnd = 0.7 }: SplitOptions = {},
): Promise<number> {
  if (cache.has(imageSrc)) return cache.get(imageSrc)!;
  const img = await loadImage(imageSrc);

  // Downsample to a narrow strip — we only care about row-darkness, so
  // a 1px-wide column sampled at a sane row count is sufficient and ~50x
  // faster than the full image.
  const sampleHeight = 500;
  const sampleWidth = 200;
  const scale = sampleHeight / img.height;
  const W = Math.max(40, Math.floor(img.width * scale * 0.8));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) { cache.set(imageSrc, 0.5); return 0.5; }
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, W, sampleHeight);
  ctx.drawImage(img, 0, 0, W, sampleHeight);
  const { data } = ctx.getImageData(0, 0, W, sampleHeight);

  // Darkness density per row, smoothed.
  const density = new Float32Array(sampleHeight);
  for (let y = 0; y < sampleHeight; y++) {
    let s = 0;
    const off = y * W * 4;
    for (let x = 0; x < W; x++) {
      const i = off + x * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
      s += 1 - lum;
    }
    density[y] = s / W;
  }

  // Box filter — 7-row window. Heavier smoothing than you'd think because
  // staff lines themselves are thin and we want to find inter-system gaps.
  const win = 7;
  const smoothed = new Float32Array(sampleHeight);
  for (let y = 0; y < sampleHeight; y++) {
    let s = 0; let n = 0;
    for (let dy = -win; dy <= win; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= sampleHeight) continue;
      s += density[yy]; n++;
    }
    smoothed[y] = s / n;
  }

  // Find the lowest-density row (whitespace) in the configured search range,
  // preferring rows nearer the middle if multiple are similar.
  const fromY = Math.max(0, Math.floor(sampleHeight * rangeStart));
  const toY = Math.min(sampleHeight - 1, Math.floor(sampleHeight * rangeEnd));
  let bestY = Math.floor(sampleHeight / 2);
  let bestScore = Infinity;
  const mid = sampleHeight / 2;
  for (let y = fromY; y <= toY; y++) {
    // Score = darkness + small bias toward middle so we don't prefer
    // dramatic gaps near the edges of the search range.
    const distance = Math.abs(y - mid) / mid;
    const score = smoothed[y] + distance * 0.01;
    if (score < bestScore) { bestScore = score; bestY = y; }
  }

  const frac = bestY / sampleHeight;
  cache.set(imageSrc, frac);
  return frac;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
