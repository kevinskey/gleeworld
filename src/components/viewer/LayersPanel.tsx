import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PDFViewerHandle } from '@/components/PDFViewerWithAnnotations';

interface LayersPanelProps {
  pdfRef: React.MutableRefObject<PDFViewerHandle | null>;
  // Bump key to force-refresh the layer list after add/toggle/delete.
  refreshSignal: number;
  onChanged: () => void;
}

// Tiny panel surfacing the imperative-handle layer controls. Used inside
// ViewerReader's annotation chrome so a conductor can keep, say, "Bowing"
// and "Conductor notes" as separate toggleable overlays on the same score.
export function LayersPanel({ pdfRef, refreshSignal, onChanged }: LayersPanelProps) {
  const layers = pdfRef.current?.getLayers() ?? [];
  const currentLayerId = pdfRef.current?.getCurrentLayerId() ?? null;
  void refreshSignal;
  const [newLayerName, setNewLayerName] = useState('');

  const handleAdd = async () => {
    const name = newLayerName.trim();
    if (!name) return;
    await pdfRef.current?.addLayer(name);
    setNewLayerName('');
    onChanged();
  };

  return (
    <div className="space-y-2 max-w-xs">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Layers</div>
      <div className="flex gap-1">
        <Input
          value={newLayerName}
          onChange={(e) => setNewLayerName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Fingerings, Bowing…"
          className="h-7 text-xs"
        />
        <Button size="sm" onClick={handleAdd} disabled={!newLayerName.trim()} className="h-7 px-2">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      <ul className="space-y-0.5">
        <li>
          <button
            type="button"
            onClick={() => { pdfRef.current?.setCurrentLayerId(null); onChanged(); }}
            className={cn(
              'w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2',
              currentLayerId === null ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/40',
            )}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
            <span className="flex-1">Ungrouped</span>
          </button>
        </li>
        {layers.map((l) => (
          <li key={l.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { pdfRef.current?.toggleLayer(l.id, !l.is_visible); onChanged(); }}
              className="p-1 hover:bg-accent/40 rounded"
              title={l.is_visible ? 'Hide layer' : 'Show layer'}
            >
              {l.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            <button
              type="button"
              onClick={() => { pdfRef.current?.setCurrentLayerId(l.id); onChanged(); }}
              className={cn(
                'flex-1 text-left px-2 py-1 rounded text-xs flex items-center gap-2',
                currentLayerId === l.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/40',
              )}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="flex-1 truncate">{l.name}</span>
            </button>
            <button
              type="button"
              onClick={() => { if (confirm(`Delete layer "${l.name}"?`)) { pdfRef.current?.deleteLayerById(l.id); onChanged(); } }}
              className="p-1 hover:bg-accent/40 rounded text-muted-foreground hover:text-destructive"
              title="Delete layer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
