// Minimalist package — extreme whitespace, monochrome, one accent color,
// no dividers, quiet type. Editorial. Fewest blocks of any package: five
// sections, each doing one job. Hero is `imageFit: 'fit'` (no forced
// crop) and CTA-less — the calendar block below stands in for the
// call-to-action. `showTextOverlay: false` so a photo, when uploaded,
// reads on its own without a headline scrim.

import type { TemplatePackage } from './index';

export const minimalistPackage: TemplatePackage = {
  id: 'minimalist',
  name: 'Minimalist',
  description:
    'Extreme whitespace, quiet type, one accent color. The content is the design.',
  theme: {
    fontFamily: 'lato',
    headingFontFamily: 'raleway',
    radiusScale: 'sharp',
    sectionPaddingScale: 'spacious',
    dividerStyle: 'none',
    letterSpacing: 0.08,
    package: 'minimalist',
  },
  blocks: [
    {
      type: 'hero',
      config: {
        variant: 'image',
        imageFit: 'fit',
        headline: '',
        subheadline: '',
        ctaLabel: '',
        ctaUrl: '',
        showTextOverlay: false,
        showUnderlay: false,
        headlineSize: 44,
        subheadlineSize: 18,
      },
    },
    { type: 'about', config: { title: '', body: '', imageSide: 'right' } },
    { type: 'music-player', config: { heading: 'Listen', tracks: [] } },
    { type: 'events', config: { heading: 'Upcoming', style: 'list', limit: 6 } },
    { type: 'contact', config: { email: '', phone: '' } },
  ],
};
