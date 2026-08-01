// Elegant package — recital-program refinement. Cormorant display
// headings over Libre Baskerville body, soft corners, generous air,
// hairline rules between sections. Built for classical ensembles,
// liturgical choirs, and anyone whose brand is a printed program.

import type { TemplatePackage } from './index';

export const elegantPackage: TemplatePackage = {
  id: 'elegant',
  name: 'Elegant',
  description:
    'Graceful serif display type with a printed-program feel — soft corners, hairline rules, unhurried spacing. Suits classical and liturgical ensembles.',
  theme: {
    fontFamily: 'libre-baskerville',
    headingFontFamily: 'cormorant',
    radiusScale: 'soft',
    sectionPaddingScale: 'generous',
    dividerStyle: 'rule',
    letterSpacing: 0.02,
    package: 'elegant',
  },
  blocks: [
    {
      type: 'hero',
      config: {
        variant: 'image',
        imageFit: 'fill',
        headline: '',
        subheadline: '',
        ctaLabel: 'Upcoming performances',
        ctaUrl: '#events',
        showTextOverlay: true,
        showUnderlay: true,
        headlineSize: 64,
        subheadlineSize: 22,
      },
    },
    { type: 'events', config: { heading: 'Performances', style: 'list', limit: 8 } },
    { type: 'about', config: { title: 'About the ensemble', body: '', imageSide: 'left' } },
    { type: 'music-player', config: { heading: 'Recordings', tracks: [] } },
    { type: 'media-gallery', config: { heading: 'Gallery', layout: 'grid', items: [] } },
    { type: 'contact', config: { email: '', phone: '' } },
  ],
};
