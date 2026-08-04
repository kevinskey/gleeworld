// Small banner rendered inside legacy RisersSection / BusBuddiesSection
// to point users at the shared Seating Charts feature.
import { Link } from 'react-router-dom';
import { ArrowRight, Armchair } from 'lucide-react';

export function LegacyMigrationBanner({ label = 'seating chart' }: { label?: string }) {
  return (
    <div className="mb-3 border rounded-md bg-indigo-50 text-indigo-900 text-xs px-3 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Armchair className="w-4 h-4 shrink-0" />
        <span className="truncate">
          Try the new Seating Charts — the same {label} plus classroom, band, orchestra, stage plots, and print/export.
        </span>
      </div>
      <Link
        to="/seating-charts"
        className="inline-flex items-center gap-1 font-semibold hover:underline shrink-0"
      >
        Open Seating Charts <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default LegacyMigrationBanner;
