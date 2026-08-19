import { describe, it, expect } from 'vitest';
import { isCustomDomainHost } from '../customDomainHost';

describe('isCustomDomainHost', () => {
  it('recognizes the live branded domains', () => {
    expect(isCustomDomainHost('yo-doc.com', false)).toBe(true);
    expect(isCustomDomainHost('thesilvertoneschorus.com', false)).toBe(true);
    expect(isCustomDomainHost('www.thesilvertoneschorus.com', false)).toBe(true);
  });

  it('rejects gleeworld.org and its subdomains', () => {
    expect(isCustomDomainHost('gleeworld.org', false)).toBe(false);
    expect(isCustomDomainHost('kevin.gleeworld.org', false)).toBe(false);
    expect(isCustomDomainHost('demo.gleeworld.org', false)).toBe(false);
  });

  it('is not fooled by a lookalike suffix', () => {
    // endsWith('gleeworld.org') without the dot would wrongly match this.
    expect(isCustomDomainHost('notgleeworld.org', false)).toBe(true);
  });

  it('rejects dev hosts, with or without a port', () => {
    expect(isCustomDomainHost('localhost', false)).toBe(false);
    expect(isCustomDomainHost('localhost:8080', false)).toBe(false);
    expect(isCustomDomainHost('127.0.0.1:5173', false)).toBe(false);
    expect(isCustomDomainHost('kevin.gleeworld.org:443', false)).toBe(false);
  });

  it('rejects everything on native, where the shell has no branded host', () => {
    expect(isCustomDomainHost('yo-doc.com', true)).toBe(false);
    expect(isCustomDomainHost('localhost', true)).toBe(false);
  });

  it('is case-insensitive and tolerates whitespace', () => {
    expect(isCustomDomainHost('  YO-DOC.COM ', false)).toBe(true);
    expect(isCustomDomainHost('KEVIN.GleeWorld.org', false)).toBe(false);
  });

  it('treats an empty host as not custom', () => {
    expect(isCustomDomainHost('', false)).toBe(false);
  });
});
