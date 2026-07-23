// Institutional package — traditional, restrained, university/church.
// Serif headlines, sharp corners, hairline rules between sections.
// Content-forward: history, ensembles, direction, press. Hero uses
// `imageFit: 'fit'` so any uploaded photo shows in full instead of being
// cropped to a 16:9 banner — matches how printed programs treat
// portraits.

import type { TemplatePackage } from './index';

export const institutionalPackage: TemplatePackage = {
  id: 'institutional',
  name: 'Institutional',
  description:
    'Serif headlines, restrained spacing, hairline dividers. For choirs and choruses that read as an established program.',
  theme: {
    fontFamily: 'merriweather',
    headingFontFamily: 'playfair',
    radiusScale: 'sharp',
    sectionPaddingScale: 'tight',
    dividerStyle: 'rule',
    letterSpacing: 0,
    package: 'institutional',
  },
  blocks: [
    {
      type: 'hero',
      config: {
        variant: 'image',
        imageFit: 'fit',
        headline: '',
        subheadline: '',
        ctaLabel: 'Season calendar',
        ctaUrl: '#events',
        showTextOverlay: true,
        showUnderlay: true,
        headlineSize: 52,
        subheadlineSize: 20,
      },
    },
    { type: 'about', config: { title: 'Our history', body: '', imageSide: 'right' } },
    { type: 'ensembles', config: { heading: 'Our ensembles' } },
    { type: 'events', config: { heading: 'Season calendar', style: 'list', limit: 12 } },
    { type: 'staff', config: { heading: 'Direction' } },
    { type: 'press', config: { heading: 'Reviews & press' } },
    { type: 'music-player', config: { heading: 'Recent recordings', tracks: [] } },
    { type: 'contact', config: { email: '', phone: '' } },
  ],
};
