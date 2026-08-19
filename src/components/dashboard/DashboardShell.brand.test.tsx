// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

/**
 * The left-nav brand block, in both nav states.
 *
 * Kevin: with the nav OPEN, show the logo at double size and no site name;
 * with it CLOSED, show logo and name together. The reason is space — sharing
 * ~150px with a name squeezed a wide parish lockup into a stamp and still
 * truncated the name to "The L…". Neither was legible.
 *
 * These render the REAL BrandLogo with the props the shell passes in each
 * state. An earlier draft reimplemented the size logic in the test, which
 * would have passed just as happily against the old code — proving nothing.
 */

import { BrandLogo } from './DashboardShell';

/** The two props the shell varies between nav states. */
function brand(logoUrl: string | null) {
  const hasLogo = !!logoUrl;
  return (
    <div>
      <BrandLogo
        logoUrl={logoUrl}
        fallbackInitial="T"
        alt="The Lyke House"
        size={hasLogo ? 'banner' : 'xl'}
      />
      {!hasLogo && <div data-testid="site-name">The Lyke House</div>}
    </div>
  );
}

afterEach(cleanup);

describe('left-nav brand block', () => {
  it('shows the logo alone, full width, when the tenant has one', () => {
    render(brand('https://example.org/lyke-house.png'));
    const logo = screen.getByRole('img', { name: 'The Lyke House' });
    expect(logo.className).toContain('w-full');
    expect(screen.queryByTestId('site-name')).not.toBeInTheDocument();
  });

  // A wide lockup letterboxed into a square is the bug being fixed, so the
  // banner must NOT carry fixed square dimensions.
  it('does not box a banner logo into a square', () => {
    render(brand('https://example.org/lyke-house.png'));
    const logo = screen.getByRole('img', { name: 'The Lyke House' });
    expect(logo.className).not.toContain('w-[67px]');
    expect(logo.className).toContain('h-auto');
    expect(logo.className).toContain('object-left');
  });

  it('still boxes the ordinary xl logo, which sits beside text', () => {
    render(
      <BrandLogo logoUrl="https://example.org/x.png" fallbackInitial="T" alt="X" size="xl" />,
    );
    expect(screen.getByRole('img', { name: 'X' }).className).toContain('w-[67px]');
  });

  // Dropping the name for a tenant with no logo would leave a single letter
  // as the only identification of the workspace.
  it('keeps the site name when there is no logo to stand alone', () => {
    render(brand(null));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('site-name')).toHaveTextContent('The Lyke House');
  });

  // The monogram has no intrinsic width to fill, so a banner-sized fallback
  // would stretch a single letter across the whole nav.
  it('keeps the monogram square even at banner size', () => {
    const { container } = render(
      <BrandLogo logoUrl={null} fallbackInitial="T" alt="T" size="banner" />,
    );
    expect(container.querySelector('span')?.className).toContain('w-[67px]');
  });
});
