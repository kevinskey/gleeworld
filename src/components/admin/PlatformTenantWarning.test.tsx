// @vitest-environment jsdom
//
// Guard against re-branding the platform site by accident: Site Setup and
// Workspace Settings scope their saves to the subdomain you're on, so an
// admin who opens them on gleeworld.org edits the `main` tenant — tonight
// that put a tenant's logo on the platform site. The banner makes the
// target unmistakable; it must never render on a normal tenant.
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PlatformTenantWarning } from './PlatformTenantWarning';

type TenantWindow = Window & { __TENANT_CONFIG__?: { tenant?: string } };

afterEach(() => {
  cleanup();
  delete (window as TenantWindow).__TENANT_CONFIG__;
});

describe('PlatformTenantWarning', () => {
  it('warns when editing the main (platform) tenant', () => {
    (window as TenantWindow).__TENANT_CONFIG__ = { tenant: 'main' };
    render(<PlatformTenantWarning />);
    expect(screen.getByText(/GleeWorld platform site/i)).toBeInTheDocument();
  });

  it('renders nothing on a normal tenant', () => {
    (window as TenantWindow).__TENANT_CONFIG__ = { tenant: 'kevin' };
    const { container } = render(<PlatformTenantWarning />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when no tenant bootstrap exists', () => {
    const { container } = render(<PlatformTenantWarning />);
    expect(container).toBeEmptyDOMElement();
  });
});
