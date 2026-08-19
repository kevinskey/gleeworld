// Sources list + add/edit/cite/delete actions for the Documents word
// processor. Renders `w-72 shrink-0` on desktop (md+) and full-width when a
// parent places it inside a mobile bottom sheet — Task 9 (DocumentEditor's
// page shell) owns which container wraps this component and how the sheet
// is triggered from the toolbar's Cite button; this component only cares
// about its own width, not its container.
import { useState } from 'react';
import { BookText, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SourceForm } from './SourceForm';
import type { CitationStyle, DocSource } from '@/lib/documents/types';

function shortLabel(source: DocSource): string {
  const family = source.authors[0]?.family?.trim();
  const year = source.year?.trim();
  if (family && year) return `${family}, ${year}`;
  if (family) return family;
  if (year) return `${source.title} (${year})`;
  return source.title || 'Untitled source';
}

export interface SourcesPanelProps {
  sources: DocSource[];
  style: CitationStyle;
  onChange: (next: DocSource[]) => void;
  onCite: (sourceId: string, locator?: string) => void;
  onDeleteSource: (sourceId: string) => void; // parent handles chip removal + confirm
}

export function SourcesPanel({ sources, style: _style, onChange, onCite, onDeleteSource }: SourcesPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DocSource | undefined>(undefined);
  const [citingId, setCitingId] = useState<string | null>(null);
  const [locatorValue, setLocatorValue] = useState('');

  function openAdd() {
    setEditingSource(undefined);
    setFormOpen(true);
  }

  function openEdit(source: DocSource) {
    setEditingSource(source);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingSource(undefined);
  }

  function handleFormSave(source: DocSource) {
    const exists = sources.some((s) => s.id === source.id);
    onChange(exists ? sources.map((s) => (s.id === source.id ? source : s)) : [...sources, source]);
    closeForm();
  }

  function startCite(id: string) {
    setCitingId(id);
    setLocatorValue('');
  }

  function confirmCite(id: string) {
    onCite(id, locatorValue.trim() || undefined);
    setCitingId(null);
    setLocatorValue('');
  }

  function cancelCite() {
    setCitingId(null);
    setLocatorValue('');
  }

  return (
    <div className="flex w-full flex-col gap-3 md:w-72 md:shrink-0">
      <Card className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Sources</h3>
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        {sources.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No sources yet. Add a book, article, website, or video — students cite as they write.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sources.map((source) => (
              <li key={source.id} className="rounded-lg border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-foreground" title={source.title}>
                    {shortLabel(source)}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7"
                      onClick={() => openEdit(source)}
                      aria-label={`Edit ${shortLabel(source)}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onDeleteSource(source.id)}
                      aria-label={`Delete ${shortLabel(source)}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {citingId === source.id ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Input
                      autoFocus
                      value={locatorValue}
                      onChange={(e) => setLocatorValue(e.target.value)}
                      placeholder="Page (optional)"
                      className="h-8 text-xs"
                      aria-label="Locator (page number)"
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      className="h-8 w-8 shrink-0"
                      onClick={() => confirmCite(source.id)}
                      aria-label="Confirm citation"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-8 w-8 shrink-0"
                      onClick={cancelCite}
                      aria-label="Cancel citation"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 w-full gap-1 text-xs"
                    onClick={() => startCite(source.id)}
                  >
                    <BookText className="w-4 h-4" /> Cite
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSource ? 'Edit source' : 'Add source'}</DialogTitle>
          </DialogHeader>
          <SourceForm initial={editingSource} onSave={handleFormSave} onCancel={closeForm} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
