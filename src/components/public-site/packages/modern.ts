// Modern package — the "flagship" starter. Bold typography, soft-round
// corners, generous whitespace, media-forward. Chosen defaults assume the
// tenant will publish photos + a video sooner than a wall of prose.

import type { TemplatePackage } from './index';

export const modernPackage: TemplatePackage = {
  id: 'modern',
  name: 'Modern',
  description:
    'Bold sans-serif type, soft-rounded corners, and roomy whitespace. Photos and video take the lead; text plays a supporting role.',
  theme: {
    fontFamily: 'open-sans',
    headingFontFamily: 'montserrat',
    radiusScale: 'round',
    sectionPaddingScale: 'generous',
    dividerStyle: 'none',
    letterSpacing: 0,
    package: 'modern',
  },
  blocks: [
    // Hero: fill mode so any uploaded photo crops to a 16:9 banner. Text
    // stays centered; the tenant edits the headline in the block form.
    {
      type: 'hero',
      config: {
        variant: 'image',
        imageFit: 'fill',
        headline: '',
        subheadline: '',
        ctaLabel: 'See what\u2019s coming up',
        ctaUrl: '#events',
        showTextOverlay: true,
        showUnderlay: true,
        headlineSize: 72,
        subheadlineSize: 24,
      },
    },
    { type: 'events', config: { heading: 'What\u2019s coming up', style: 'month', limit: 12 } },
    { type: 'about', config: { title: 'Our story', body: '', imageSide: 'right' } },
    // Photo gallery seeded empty — auto-hides via block Render until the
    // tenant uploads something. Present so the block is discoverable when
    // they scroll the Blocks list in the editor.
    { type: 'media-gallery', config: { heading: 'Photos', layout: 'grid', items: [] } },
    { type: 'music-player', config: { heading: 'Listen', tracks: [] } },
    { type: 'videos', config: { heading: 'Watch', layout: 'grid', videos: [] } },
    { type: 'contact', config: { email: '', phone: '' } },
  ],
};
