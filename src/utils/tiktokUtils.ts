// TikTok utility functions for video embedding

export interface TikTokVideoInfo {
  videoId: string;
  username?: string;
}

/**
 * Check if a URL is a TikTok URL
 */
export function isTikTokUrl(url: string): boolean {
  if (!url) return false;
  return /tiktok\.com/.test(url) || /vm\.tiktok\.com/.test(url);
}

/**
 * Extract TikTok video ID and username from various URL formats
 * 
 * Supported formats:
 * - https://www.tiktok.com/@username/video/1234567890123456789
 * - https://tiktok.com/@username/video/1234567890123456789
 * - https://vm.tiktok.com/XXXXXXXXX/ (short URL - can't extract ID without redirect)
 * - https://www.tiktok.com/t/XXXXXXXXX/ (another short format)
 */
export function extractTikTokVideoInfo(url: string): TikTokVideoInfo | null {
  if (!url) return null;

  // Standard format: @username/video/VIDEO_ID
  const standardPattern = /tiktok\.com\/@([^/]+)\/video\/(\d+)/;
  const standardMatch = url.match(standardPattern);
  if (standardMatch) {
    return {
      username: standardMatch[1],
      videoId: standardMatch[2],
    };
  }

  // Short URL format: vm.tiktok.com/XXXXXX or tiktok.com/t/XXXXXX
  // These require a redirect to get the actual video ID, so we just return a placeholder
  const shortPattern = /(?:vm\.tiktok\.com|tiktok\.com\/t)\/([a-zA-Z0-9]+)/;
  const shortMatch = url.match(shortPattern);
  if (shortMatch) {
    return {
      videoId: shortMatch[1], // This is actually a short code, not the real video ID
    };
  }

  return null;
}

/**
 * Get the TikTok embed URL for an iframe
 * Note: TikTok embeds require their embed.js script for proper rendering
 */
export function getTikTokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/embed/v2/${videoId}`;
}

/**
 * Generate TikTok embed HTML (blockquote format that works with embed.js)
 */
export function getTikTokEmbedHtml(url: string): string {
  return `<blockquote class="tiktok-embed" cite="${url}" data-video-id="">
    <section></section>
  </blockquote>`;
}

/**
 * Load the TikTok embed.js script dynamically
 */
export function loadTikTokEmbedScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector('script[src*="tiktok.com/embed.js"]')) {
      // Re-process embeds if script already exists
      if ((window as any).tiktokEmbed?.lib?.render) {
        (window as any).tiktokEmbed.lib.render();
      }
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load TikTok embed script'));
    document.body.appendChild(script);
  });
}

/**
 * Get a static thumbnail placeholder for TikTok
 * TikTok doesn't provide easy thumbnail access, so we use their oEmbed API via edge function
 */
export function getTikTokPlaceholderThumbnail(): string {
  // Return a data URI for a TikTok-branded placeholder
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" fill="none">
      <rect width="320" height="180" fill="#010101"/>
      <path d="M160 70c-8.3 0-15 6.7-15 15v20c0 8.3 6.7 15 15 15s15-6.7 15-15V85c0-8.3-6.7-15-15-15z" fill="#25F4EE"/>
      <path d="M175 85c0-8.3-6.7-15-15-15v50c8.3 0 15-6.7 15-15V85z" fill="#FE2C55"/>
      <path d="M145 85c0-8.3 6.7-15 15-15v50c-8.3 0-15-6.7-15-15V85z" fill="#fff"/>
    </svg>
  `);
}
