// Marketing hero for the Music Store (2026-08-03 desktop/iPad/iPhone
// model): headline, in-hero search, Browse/Sell CTAs, and a CSS-only
// fanned "score covers" composition on the right — no external assets
// (CSP-safe), scaled down on phones per the iPhone mock.
import { Music, Music2, Search, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function StoreHero({
  query,
  onQueryChange,
  onBrowse,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onBrowse: () => void;
}) {
  return (
    <section className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-primary/15 border border-border/60">
      {/* Decorative fanned "covers" — pure CSS. Behind the content on
          phones (per the iPhone mock the books peek from the right),
          beside it from md up. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-32 w-40 sm:h-40 sm:w-52 md:h-48 md:w-64 opacity-60 sm:opacity-80 md:opacity-100"
      >
        <div className="absolute right-16 sm:right-24 top-4 w-20 sm:w-28 h-28 sm:h-40 rounded-lg shadow-lg rotate-[-10deg] bg-gradient-to-br from-slate-700 to-slate-900" />
        <div className="absolute right-8 sm:right-12 top-1 w-20 sm:w-28 h-28 sm:h-40 rounded-lg shadow-lg rotate-[-2deg] bg-gradient-to-br from-primary/80 to-indigo-900 grid place-items-center">
          <Music className="w-7 h-7 sm:w-9 sm:h-9 text-white/80" />
        </div>
        <div className="absolute right-0 top-5 w-20 sm:w-28 h-28 sm:h-40 rounded-lg shadow-xl rotate-[8deg] bg-gradient-to-br from-violet-300 to-primary/70 grid place-items-center">
          <Music2 className="w-6 h-6 sm:w-8 sm:h-8 text-white/90" />
        </div>
      </div>
      <div className="relative p-6 sm:p-8 md:p-10 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          GW Sheet Music Store
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Discover sheet music direct from composers.
        </p>
        <div className="relative mt-5 max-w-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-11 bg-background"
            placeholder="Search by title, composer, voicing, or keyword…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3 mt-5">
          <Button onClick={onBrowse}>
            <Music className="w-4 h-4 mr-1.5" /> Browse Music
          </Button>
          <Button asChild variant="outline" className="bg-background/70">
            <Link to="/partner">
              <Tag className="w-4 h-4 mr-1.5" /> Sell Your Music
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
