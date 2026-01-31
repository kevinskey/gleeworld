
# TikTok Video Support for MUS 240

## Overview
Enable TikTok video links to be displayed with embedded playback and thumbnails in the MUS 240 module videos modal, matching the existing YouTube experience.

---

## What Already Works
- TikTok URLs can be added to `mus240_module_resources` with `resource_type: 'video'`
- Clicking a TikTok video in `ModuleVideosModal` opens it in a new browser tab
- The database schema (`url` field) supports any video URL

## What Needs Improvement
1. **No thumbnail preview** - TikTok videos show generic Play icon instead of video thumbnail
2. **No in-app playback** - Videos open in new tab instead of playing inline
3. **No visual distinction** - Users can't tell TikTok vs YouTube at a glance

---

## Implementation Plan

### 1. Create TikTok Utility Functions
**New file:** `src/utils/tiktokUtils.ts`

```text
┌─────────────────────────────────────────────┐
│  extractTikTokVideoId(url)                  │
│  - Parse @username/video/VIDEO_ID pattern   │
│  - Handle vm.tiktok.com short URLs          │
│  - Return { videoId, username } or null     │
├─────────────────────────────────────────────┤
│  isTikTokUrl(url)                           │
│  - Returns boolean if URL matches TikTok    │
├─────────────────────────────────────────────┤
│  getTikTokEmbedHtml(url)                    │
│  - Fetch oEmbed data from TikTok API        │
│  - Return embed HTML string                 │
└─────────────────────────────────────────────┘
```

### 2. Create TikTok Embed Component
**New file:** `src/components/mus240/TikTokPlayer.tsx`

Features:
- Accept TikTok video URL as prop
- Load TikTok embed script dynamically
- Render the embedded video with proper sizing
- Handle loading and error states
- Responsive design for mobile

### 3. Update ModuleVideosModal
**File:** `src/components/academy/ModuleVideosModal.tsx`

Changes:
- Import new TikTok utilities
- Detect TikTok URLs alongside YouTube
- Show TikTok thumbnail (fetched via oEmbed) in video list
- Add TikTok badge to distinguish from YouTube
- Embed TikTok player when a TikTok video is selected

### 4. Update DocumentViewer (for MUS 240 Resources)
**File:** `src/components/mus240/DocumentViewer.tsx`

Changes:
- Add TikTok URL detection (similar to existing `isYouTube`)
- Create `renderTikTokViewer()` function
- Support TikTok in the viewer type badge

---

## User Experience

### For Instructors
1. Add a TikTok link to a module's video resources (same as before)
2. No special formatting needed - just paste the TikTok URL
3. The system auto-detects and displays appropriately

### For Students
1. Open module videos modal
2. See TikTok videos with:
   - TikTok thumbnail image
   - "TikTok" badge to distinguish from YouTube
   - Video title and duration (if available)
3. Click to watch embedded TikTok video in-app
4. Optional: Click external link to view on TikTok

---

## Technical Considerations

### TikTok oEmbed API
- **Endpoint:** `https://www.tiktok.com/oembed?url={VIDEO_URL}`
- **No API key required** for basic oEmbed
- **CORS:** May require edge function proxy for thumbnail fetching
- **Response:** JSON with `html`, `thumbnail_url`, `author_name`, `title`

### Edge Function Option (if CORS issues)
If browser-side oEmbed calls fail due to CORS, create:
`supabase/functions/tiktok-oembed/index.ts`
- Proxies oEmbed requests server-side
- Caches responses to reduce API calls

### Embed Script Loading
TikTok requires their embed.js script:
```javascript
<script src="https://www.tiktok.com/embed.js" async></script>
```
Must be loaded dynamically when TikTok content is present.

---

## Files to Create
| File | Purpose |
|------|---------|
| `src/utils/tiktokUtils.ts` | URL parsing and oEmbed utilities |
| `src/components/mus240/TikTokPlayer.tsx` | Embedded TikTok player component |
| `supabase/functions/tiktok-oembed/index.ts` | (Optional) Server-side oEmbed proxy |

## Files to Modify
| File | Changes |
|------|---------|
| `src/components/academy/ModuleVideosModal.tsx` | Add TikTok detection, thumbnails, embed |
| `src/components/mus240/DocumentViewer.tsx` | Add TikTok viewer support |
| `src/utils/youtubeUtils.ts` | (Optional) Rename to `videoUtils.ts` and consolidate |

---

## Testing Checklist
- [ ] TikTok URLs correctly detected and extracted
- [ ] Thumbnails load in video list
- [ ] In-app TikTok playback works
- [ ] Fallback to external link if embed fails
- [ ] YouTube videos still work as before
- [ ] Mobile responsive layout
- [ ] Error handling for invalid TikTok URLs
