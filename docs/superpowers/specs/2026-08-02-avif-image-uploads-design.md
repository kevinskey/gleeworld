# Accept AVIF files as pictures — design

**Date:** 2026-08-02 · **Approved:** Kevin (option: all image uploads)

## Goal

Every upload surface that currently restricts images to an explicit MIME list
also accepts `image/avif`. Surfaces already using `accept="image/*"` need no
change — they accept AVIF today.

## Approach

Add `image/avif` (and the `avif` extension where extension regexes are used)
to the explicit allowlists only. No new conversion code:

- The public-site `ImageUploadField` already re-encodes every non-GIF/SVG
  image through a canvas to PNG/JPEG before upload, so site-editor AVIF
  uploads are stored in universally-viewable formats. (Files under 500 KB
  skip re-encoding and are stored as AVIF — fine on all modern browsers,
  iOS/Safari 16.4+.)
- Other surfaces store the original file; AVIF displays natively in every
  current browser.

## Files changed

| File | Change |
|---|---|
| `src/components/public-site/ImageUploadField.tsx` | add `image/avif` to `accept` |
| `src/pages/admin/SiteSetup.tsx` (3 pickers) | add `image/avif` to `accept` |
| `src/components/dashboard/GleeCamCard.tsx` | add `image/avif` to `IMAGE_FILE_TYPES` |
| `src/components/media-library/FinderMediaLibrary.tsx` | add `avif` to image-extension regex |
| `src/components/media-library/MediaPreviewModal.tsx` | add `avif` to image-extension regex |
| `src/components/media-library/FinderFileList.tsx` | add `avif` to image-extension regex |
| `src/components/media-library/FinderFileGrid.tsx` | add `avif` to image-extension regex |
| `src/components/tour/TourDocumentsSection.tsx` | add `avif` to preview regex |

## Out of scope

AVIF→JPEG conversion for pre-16.4 iOS viewers (rare; can extend the HEIC
converter later if it ever matters).
