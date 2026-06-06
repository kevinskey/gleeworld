// Archive view: drafts, scheduled, and sent newsletters. Click to edit or
// reuse. Replaces the standalone Alumni Newsletter Manager.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Newspaper, Plus, Clock, CheckCircle2, FileEdit, Trash2, X } from 'lucide-react';
import { NewsletterComposer } from './NewsletterComposer';

export function NewsletterList({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [composing, setComposing] = useState<string | 'new' | null>(null);

  const { data: newsletters = [] } = useQuery({
    queryKey: ['newsletters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_newsletters')
        .select('id, title, subject, status, scheduled_date, sent_date, recipient_count, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function del(id: string) {
    const { error } = await supabase.from('gw_newsletters').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['newsletters'] });
  }

  const drafts = newsletters.filter((n: any) => n.status === 'draft');
  const scheduled = newsletters.filter((n: any) => n.status === 'scheduled');
  const sent = newsletters.filter((n: any) => n.status === 'sent');

  if (composing) {
    return (
      <NewsletterComposer
        newsletterId={composing === 'new' ? undefined : composing}
        onClose={() => setComposing(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[85vh] flex flex-col my-4 bg-white text-gray-900">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white text-gray-900 z-10 border-b rounded-t-xl">
          <CardTitle className="flex items-center gap-2 text-gray-900"><Newspaper className="w-5 h-5" /> Newsletters</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setComposing('new')}>
              <Plus className="w-4 h-4 mr-2" /> New
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="text-gray-900 hover:bg-gray-100"><X className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto space-y-6 p-4">
          <Section
            title="Scheduled"
            icon={<Clock className="w-4 h-4 text-amber-600" />}
            items={scheduled}
            onEdit={(id) => setComposing(id)}
            onDelete={del}
            empty="No scheduled newsletters."
            timestampLabel={(n) => n.scheduled_date && `Will send ${new Date(n.scheduled_date).toLocaleString()}`}
          />
          <Section
            title="Drafts"
            icon={<FileEdit className="w-4 h-4 text-blue-600" />}
            items={drafts}
            onEdit={(id) => setComposing(id)}
            onDelete={del}
            empty="No drafts."
            timestampLabel={(n) => `Saved ${new Date(n.created_at).toLocaleDateString()}`}
          />
          <Section
            title="Sent"
            icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
            items={sent}
            onEdit={(id) => setComposing(id)}
            onDelete={del}
            empty="No newsletters sent yet."
            timestampLabel={(n) => n.sent_date && `Sent ${new Date(n.sent_date).toLocaleDateString()} · ${n.recipient_count ?? 0} recipients`}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Section({
  title, icon, items, onEdit, onDelete, empty, timestampLabel,
}: {
  title: string; icon: React.ReactNode; items: any[];
  onEdit: (id: string) => void; onDelete: (id: string) => void;
  empty: string; timestampLabel: (n: any) => string | undefined;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">{icon} {title} ({items.length})</h3>
      {items.length === 0 && <p className="text-xs text-muted-foreground italic">{empty}</p>}
      <div className="space-y-1">
        {items.map((n) => (
          <div key={n.id} className="border rounded p-3 flex items-center justify-between gap-2 hover:bg-muted/30">
            <button className="flex-1 text-left min-w-0" onClick={() => onEdit(n.id)}>
              <div className="font-semibold text-sm truncate">{n.title}</div>
              <div className="text-xs text-muted-foreground truncate">{n.subject}</div>
              <div className="text-xs text-muted-foreground">{timestampLabel(n)}</div>
            </button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(n.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
