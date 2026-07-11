// Templates: system-seeded (read-only) + the user's own. Applying one
// creates a new note with allowlisted {{placeholders}} substituted.
import { useState } from 'react';
import { FileStack, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/hooks/useProfile';
import { createNote } from '@/lib/planner/notesApi';
import { deleteTemplate } from '@/lib/planner/templatesApi';
import { defaultTemplateContext, substituteDoc } from '@/lib/planner/templates';
import type { PlannerTemplate } from '@/lib/planner/types';
import { useTemplates } from '../hooks';
import { EmptyState } from './TasksView';

export default function TemplatesView({ onOpenNote }: { onOpenNote: (noteId: string) => void }) {
  const { data: templates, isLoading } = useTemplates();
  const { profile } = useProfile();
  const qc = useQueryClient();
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const apply = useMutation({
    mutationFn: async (tpl: PlannerTemplate) => {
      const ctx = {
        ...defaultTemplateContext(),
        user_name: profile?.full_name || undefined,
      };
      return createNote({ title: tpl.name, content: substituteDoc(tpl.content, ctx) });
    },
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ['planner'] });
      onOpenNote(note.id);
    },
    onError: () => toast.error('Could not create a note from this template'),
    onSettled: () => setApplyingId(null),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner', 'templates'] }),
    onError: () => toast.error('Could not delete the template'),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Templates</h1>
        <p className="text-sm text-muted-foreground">
          Start rehearsal plans, concert production plans, and meeting minutes from a structure instead of a blank page.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : !templates?.length ? (
        <EmptyState icon={FileStack} title="No templates" body="System templates load with the module; you can also save your own." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((tpl) => (
            <div key={tpl.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-medium text-foreground">{tpl.name}</h2>
                {tpl.is_system
                  ? <Badge variant="outline" className="shrink-0 text-[11px] font-normal text-muted-foreground">Built-in</Badge>
                  : (
                    <Button
                      variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0 text-muted-foreground"
                      aria-label={`Delete template ${tpl.name}`}
                      onClick={() => remove.mutate(tpl.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
              </div>
              <p className="flex-1 text-xs text-muted-foreground">{tpl.description}</p>
              <Button
                size="sm" variant="outline" className="gap-1 self-start"
                disabled={applyingId === tpl.id}
                onClick={() => { setApplyingId(tpl.id); apply.mutate(tpl); }}
              >
                <Plus className="h-4 w-4" /> Use template
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
