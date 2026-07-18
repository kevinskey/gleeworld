import DOMPurify from 'dompurify';

// Shared HTML sanitizer for prose scraped/rendered from third-party sources
// (e.g. the usccb-readings edge function) before it's passed to
// dangerouslySetInnerHTML. Conservative allowlist: headings, paragraphs,
// line breaks, emphasis/strong/italic, lists, blockquote, and span/div with
// a class attribute for styling hooks. Strips scripts, event handlers,
// javascript: URLs, iframes/objects/embeds/forms, and inline style attrs.
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br',
  'em', 'strong', 'i', 'b', 'u',
  'ul', 'ol', 'li',
  'blockquote',
  'span', 'div',
  'a',
];

const ALLOWED_ATTR = ['class', 'href', 'target', 'rel'];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'style'],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload', 'onmouseover'],
    ALLOW_DATA_ATTR: false,
  });
}
