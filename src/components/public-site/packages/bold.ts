// Bold package — marquee energy. Bebas Neue display caps over
// Montserrat body, sharp corners, tracked-out headings. Built for show
// choirs, a cappella groups, and programs that lead with hype.

import type { TemplatePackage } from './index';

export const boldPackage: TemplatePackage = {
  id: 'bold',
  name: 'Bold',
  description:
    'Tall marquee headlines, sharp edges, and confident tracking. For show choirs and groups that lead with energy.',
  theme: {
    fontFamily: 'montserrat',
    headingFontFamily: 'bebas-neue',
    radiusScale: 'sharp',
    sectionPaddingScale: 'normal',
    dividerStyle: 'none',
    letterSpacing: 0.04,
    package: 'bold',
  },
  blocks: [
    {
      type: 'hero',
      config: {
        variant: 'image',
        imageFit: 'fill',
        headline: '',
        subheadline: '',
        ctaLabel: 'Get tickets',
        ctaUrl: '#events',
        showTextOverlay: true,
        showUnderlay: true,
        headlineSize: 84,
        subheadlineSize: 22,
      },
    },
    { type: 'events', config: { heading: 'Shows', style: 'month', limit: 12 } },
    { type: 'videos', config: { heading: 'Watch', layout: 'grid', videos: [] } },
    { type: 'media-gallery', config: { heading: 'Photos', layout: 'grid', items: [] } },
    { type: 'about', config: { title: 'Who we are', body: '', imageSide: 'right' } },
    { type: 'contact', config: { email: '', phone: '' } },
  ],
};
