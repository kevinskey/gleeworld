// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { TenantFavicon } from './TenantFavicon';

const LOGO = 'https://supabase.gleeworld.org/storage/v1/object/public/site-branding/demo-logo.png';

vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({
    settings: { logo_url: LOGO, org_name: 'Harmony Hall Choir' },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

beforeEach(() => {
  // Mirror the two icon links shipped in index.html:28-29.
  document.head.innerHTML = `
    <link rel="icon" type="image/png" href="/lovable-uploads/gleeworld-logo-192.png">
    <link rel="shortcut icon" href="/lovable-uploads/gleeworld-logo-192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2">
  `;
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
});

const hrefOf = (rel: string) =>
  document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)?.getAttribute('href');

describe('TenantFavicon', () => {
  it('points rel="icon" at the tenant logo', () => {
    render(<TenantFavicon />);
    expect(hrefOf('icon')).toBe(LOGO);
  });

  it('points rel="shortcut icon" at the tenant logo', () => {
    render(<TenantFavicon />);
    expect(hrefOf('shortcut icon')).toBe(LOGO);
  });

  it('points apple-touch-icon at the tenant logo', () => {
    render(<TenantFavicon />);
    expect(hrefOf('apple-touch-icon')).toBe(LOGO);
  });

  it('sets the document title to the org name', () => {
    render(<TenantFavicon />);
    expect(document.title).toBe('Harmony Hall Choir');
  });

  it('appends an icon link when the document has none', () => {
    document.head.innerHTML = '';
    render(<TenantFavicon />);
    expect(hrefOf('icon')).toBe(LOGO);
  });
});
