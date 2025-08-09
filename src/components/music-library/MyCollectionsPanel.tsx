import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, FolderPlus, Plus, FileText } from 'lucide-react';
import { useCollections } from '@/hooks/useCollections';

interface MyCollectionsPanelProps {
  currentSelected?: { url: string; title: string; id?: string } | null;
  onOpenScore: (pdfUrl: string, title: string, id?: string) => void;
}

export const MyCollectionsPanel: React.FC<MyCollectionsPanelProps> = ({ currentSelected, onOpenScore }) => {
  const { systemCollections, myCollections, itemsByCollection, loading, loadItems, createCollection, addCurrentToCollection } = useCollections(currentSelected);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newName, setNewName] = useState('');

  const canAddCurrent = useMemo(() => Boolean(currentSelected?.id), [currentSelected]);

  const renderCollection = (c: any) => {
    const isOpen = expanded[c.id];
    const items = itemsByCollection[c.id] || [];

    return (
      <div key={c.id} className="border rounded mb-2">
        <div className="flex items-center justify-between p-2">
          <button className="flex items-center gap-2" onClick={() => { setExpanded((e) => ({ ...e, [c.id]: !isOpen })); if (!isOpen && !items.length) loadItems(c.id); }}>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="text-sm font-medium">{c.title}</span>
          </button>
          <Button size="sm" variant="secondary" disabled={!canAddCurrent} onClick={() => addCurrentToCollection(c.id)}>Add current</Button>
        </div>
        {isOpen && (
          <div className="px-3 pb-2 space-y-1">
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">No scores yet.</p>
            ) : (
              items.map((it) => (
                <button
                  key={it.id}
                  className="w-full text-left text-sm px-2 py-1 rounded hover:bg-muted flex items-center gap-2"
                  onClick={() => it.sheet?.pdf_url && onOpenScore(it.sheet.pdf_url, it.sheet.title, it.sheet.id)}
                >
                  <FileText className="h-4 w-4" /> {it.sheet?.title || 'Untitled'}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">My Collections</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="New collection name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 w-40" />
            <Button size="sm" onClick={async () => { if (!newName.trim()) return; await createCollection(newName.trim()); setNewName(''); }}>Create</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {systemCollections.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-muted-foreground mb-1">System Collections</div>
                {systemCollections.map(renderCollection)}
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">My Collections</div>
              {myCollections.length === 0 ? (
                <p className="text-xs text-muted-foreground">No collections yet. Create one above.</p>
              ) : (
                myCollections.map(renderCollection)
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
