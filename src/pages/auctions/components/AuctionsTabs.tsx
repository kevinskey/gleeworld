// Shared sub-navigation for the Auctions module. The module has four
// surfaces and they are peers, so they get tabs rather than four nav entries
// competing for one sidebar slot.
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/auctions', label: 'Calendar', end: true },
  { to: '/auctions/lots', label: 'Lots', end: false },
  { to: '/auctions/searches', label: 'Saved searches', end: false },
  { to: '/auctions/matches', label: 'Matches', end: false },
];

export function AuctionsTabs() {
  return (
    <nav className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-border -mt-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
