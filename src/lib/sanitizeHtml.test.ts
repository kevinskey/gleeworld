// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  it('removes <script> tags entirely', () => {
    const dirty = '<p>Hello</p><script>alert(1)</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('alert(1)');
    expect(clean).toContain('Hello');
  });

  it('strips onerror handlers while keeping benign markup', () => {
    const dirty = '<p>Reading</p><img src="x" onerror="alert(1)">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('alert(1)');
    expect(clean).toContain('Reading');
  });

  it('neutralizes javascript: URLs', () => {
    const dirty = '<a href="javascript:alert(1)">click me</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('click me');
  });

  it('removes <iframe> tags', () => {
    const dirty = '<p>Text</p><iframe src="https://evil.example"></iframe>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('evil.example');
    expect(clean).toContain('Text');
  });

  it('preserves benign prose markup intact', () => {
    const dirty = '<h3>Reading</h3><p>In the beginning <strong>God</strong> created <em>the heavens</em>.</p><ul><li>one</li><li>two</li></ul><p>Line one<br>Line two</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<h3>Reading</h3>');
    expect(clean).toContain('<strong>God</strong>');
    expect(clean).toContain('<em>the heavens</em>');
    expect(clean).toContain('<ul>');
    expect(clean).toContain('<li>one</li>');
    expect(clean).toContain('<li>two</li>');
    expect(clean).toContain('<br>');
  });

  it('leaves plain text unchanged', () => {
    const dirty = 'Just plain text with no markup.';
    expect(sanitizeHtml(dirty)).toBe(dirty);
  });
});
