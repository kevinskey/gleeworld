// Institutional package — traditional, restrained, university/church.
// Serif headlines, sharp corners, hairline rules between sections. Marked
// as coming soon until the corresponding block presets and detail work
// land; the picker shows it with a locked badge.

import type { TemplatePackage } from './index';

export const institutionalPackage: TemplatePackage = {
  id: 'institutional',
  name: 'Institutional',
  description:
    'Serif headlines, restrained spacing, hairline dividers. For choirs and choruses that read as an established program.',
  comingSoon: true,
  theme: {
    fontFamily: 'merriweather',
    headingFontFamily: 'playfair',
    radiusScale: 'sharp',
    sectionPaddingScale: 'tight',
    dividerStyle: 'rule',
    letterSpacing: 0,
    package: 'institutional',
  },
  blocks: [],
};
