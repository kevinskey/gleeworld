// @vitest-environment jsdom
//
// Production bug (2026-07-31): UniversalLayout wrote inline --primary /
// --accent / --ring overrides onto its wrapper div, sourced ONLY from the
// public-site theme (get_tenant_public_site). TenantThemeRoot is the
// canonical writer of those tokens on <html> and merges branding-first
// (gw_branding_settings wins, public-site theme is the fallback) — the same
// merge order PublicPageEditor uses. The inline copies shadowed the root
// values for every descendant, so Workspace Settings → Branding color
// changes never showed up anywhere inside the layout: main's branding said
// green #4bc516 but the whole dashboard rendered the public-site accent
// cyan #15f3ff. UniversalLayout must not re-declare the shadcn brand tokens;
// its only color job is the tinted shell background, which must follow the
// same branding-first merge.
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/dashboard' }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({
      data: { theme: { primaryColor: '#9334ea', accentColor: '#15f3ff' } },
      error: null,
    })),
  },
}));

vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({
    settings: { primary_color: '#4bc516', accent_color: '#eac585' },
  }),
}));

vi.mock('./UniversalHeader', () => ({ UniversalHeader: () => null }));
vi.mock('./PublicHeader', () => ({ PublicHeader: () => null }));
vi.mock('./UniversalFooter', () => ({ UniversalFooter: () => null }));
vi.mock('@/components/navigation/MobileBottomNav', () => ({ MobileBottomNav: () => null }));
vi.mock('@/components/dashboard/DashboardShell', () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { UniversalLayout } from './UniversalLayout';

function renderLayout() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UniversalLayout>
        <div data-testid="content" />
      </UniversalLayout>
    </QueryClientProvider>,
  );
}

async function shellDiv(): Promise<HTMLElement> {
  const { container, findByTestId } = renderLayout();
  await findByTestId('content');
  // Let the public-site query resolve so any (buggy) theme-derived styles land.
  await new Promise((r) => setTimeout(r, 0));
  const div = container.querySelector('div.min-h-screen') as HTMLElement;
  expect(div).not.toBeNull();
  return div;
}

describe('UniversalLayout brand tokens', () => {
  it('never shadows the root shadcn brand tokens with inline overrides', async () => {
    const div = await shellDiv();
    for (const prop of ['--primary', '--primary-foreground', '--ring', '--accent', '--accent-foreground', '--site-primary', '--site-accent']) {
      expect(div.style.getPropertyValue(prop), `${prop} must come from TenantThemeRoot, not an inline shadow`).toBe('');
    }
  });

  it('tints the shell background from branding primary, not the public-site theme', async () => {
    const div = await shellDiv();
    // tint('#4bc516', 0.06) — branding green, not public-site purple #9334ea.
    expect(div.style.background).toBe('rgb(235, 242, 232)');
  });
});
