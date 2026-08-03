// Editor-only stand-in for a block with no content yet. The public render
// path keeps returning null; without this the empty block is invisible on
// the editor canvas, so there is nothing to click to configure it.
export function EmptyBlockPlaceholder({ name, hint }: { name: string; hint?: string }) {
  return (
    <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm flex flex-col items-center justify-center gap-1 py-10 px-4 text-center my-4">
      <span className="font-semibold text-slate-600">{name}</span>
      <span>{hint ?? 'No content yet — open the block settings to add some. Visitors won’t see this until it has content.'}</span>
    </div>
  );
}
