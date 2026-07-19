// Minimalist package — extreme whitespace, monochrome, one accent color,
// no dividers, quiet type. Editorial. Marked as coming soon until block
// presets land.

import type { TemplatePackage } from './index';

export const minimalistPackage: TemplatePackage = {
  id: 'minimalist',
  name: 'Minimalist',
  description:
    'Extreme whitespace, quiet type, one accent color. The content is the design.',
  comingSoon: true,
  theme: {
    fontFamily: 'sans',
    headingFontFamily: 'sans',
    radiusScale: 'sharp',
    sectionPaddingScale: 'spacious',
    dividerStyle: 'none',
    letterSpacing: 0,
    package: 'minimalist',
  },
  blocks: [],
};
