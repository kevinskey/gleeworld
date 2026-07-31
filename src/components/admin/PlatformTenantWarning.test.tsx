// @vitest-environment jsdom
//
// Guard against re-branding the platform site by accident: Site Setup and
// Workspace Settings scope their saves to the subdomain you're on, so an
// admin who opens them on gleeworld.org edits the `main` tenant — that's
// how a tenant's logo ended up on the platform site. The banner must track
// getTenantSlug() (the value the write path actually sends), including its
// default of 'main' when no tenant bootstrap exists.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';

const getTenantSlugMock = vi.hoisted(() => vi.fn<() => string>(() => 'main'));

vi.mock('@/integrations/supabase/client', () => ({
  getTenantSlug: getTenantSlugMock,
}));

import { PlatformTenantWarning } from './PlatformTenantWarning';

afterEach(() => {
  cleanup();
});

describe('PlatformTenantWarning', () => {
  it('warns when editing the main (platform) tenant', () => {
    getTenantSlugMock.mockReturnValue('main');
    render(<PlatformTenantWarning />);
    expect(screen.getByText(/GleeWorld platform site/i)).toBeInTheDocument();
  });

  it('renders nothing on a normal tenant', () => {
    getTenantSlugMock.mockReturnValue('kevin');
    const { container } = render(<PlatformTenantWarning />);
    expect(container).toBeEmptyDOMElement();
  });
});
