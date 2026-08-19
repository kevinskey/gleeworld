interface Props {
  title: string;
  shipsIn: string;   // e.g. "Phase 2"
  blurb: string;
}

export function PlaceholderTab({ title, shipsIn, blurb }: Props) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
      <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Coming in {shipsIn}</p>
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">{blurb}</p>
    </div>
  );
}
