// Message templates panel — surfaces in Messenger → Templates.
//
// Storage model: localStorage, scoped per (tenant, user). Keeping it
// client-side as the MVP means no migration / RLS / sync work to land
// the feature — the user can save reusable announcements and pick them
// from the Email/SMS/Broadcasts composers on the same device. A future
// pass can move this to gw_message_templates with RLS and team sharing
// once the shape settles.

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Mail, Smartphone, Megaphone, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export type TemplateChannel = 'email' | 'sms' | 'announcement';

export interface MessageTemplate {
  id: string;
  name: string;
  channel: TemplateChannel;
  subject?: string;   // email only
  body: string;
  updated_at: string;
}

const CHANNEL_LABELS: Record<TemplateChannel, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  email:        { label: 'Email',        Icon: Mail },
  sms:          { label: 'SMS',          Icon: Smartphone },
  announcement: { label: 'Announcement', Icon: Megaphone },
};

function storageKey(tenant: string, userId: string) {
  return `gw_message_templates:${tenant}:${userId}`;
}

function loadTemplates(tenant: string, userId: string): MessageTemplate[] {
  try {
    const raw = window.localStorage.getItem(storageKey(tenant, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveTemplates(tenant: string, userId: string, templates: MessageTemplate[]) {
  try {
    window.localStorage.setItem(storageKey(tenant, userId), JSON.stringify(templates));
  } catch { /* quota — non-fatal */ }
}

export function MessageTemplatesPanel() {
  const { user } = useAuth();
  const tenant = (typeof window !== 'undefined' && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || 'default';
  const userId = user?.id ?? 'anon';

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<TemplateChannel | 'all'>('all');

  useEffect(() => {
    setTemplates(loadTemplates(tenant, userId));
  }, [tenant, userId]);

  const persist = (next: MessageTemplate[]) => {
    setTemplates(next);
    saveTemplates(tenant, userId, next);
  };

  const handleSave = (t: MessageTemplate) => {
    const existing = templates.findIndex((x) => x.id === t.id);
    const next = existing >= 0
      ? templates.map((x, i) => (i === existing ? t : x))
      : [...templates, t];
    persist(next);
    setCreating(false);
    setEditing(null);
    toast.success(existing >= 0 ? 'Template updated' : 'Template saved');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    persist(templates.filter((t) => t.id !== id));
    toast.success('Template deleted');
  };

  const handleCopy = async (t: MessageTemplate) => {
    const text = t.subject ? `Subject: ${t.subject}\n\n${t.body}` : t.body;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied — paste into a new message');
    } catch {
      toast.error('Copy failed');
    }
  };

  const filtered = useMemo(() => {
    const list = filter === 'all' ? templates : templates.filter((t) => t.channel === filter);
    return [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [templates, filter]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Message Templates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reusable announcements, rehearsal reminders, and concert blasts. Tap Copy to paste into a new message.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1" /> New template
          </Button>
        </header>

        <div className="flex items-center gap-1 text-xs">
          {(['all', 'email', 'sms', 'announcement'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full transition-colors',
                filter === f ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f === 'all' ? 'All' : CHANNEL_LABELS[f].label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {templates.length === 0
                ? 'No templates yet. Tap "New template" to save your first reusable message.'
                : `No ${filter} templates yet.`}
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((t) => {
              const { Icon, label } = CHANNEL_LABELS[t.channel];
              return (
                <li key={t.id}>
                  <Card>
                    <CardContent className="p-3 sm:p-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-md bg-muted shrink-0 inline-flex items-center justify-center">
                        <Icon className="w-4 h-4 text-foreground/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold truncate">{t.name}</span>
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
                        </div>
                        {t.subject && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">Subject: {t.subject}</div>
                        )}
                        <p className="text-xs text-foreground/80 mt-1 line-clamp-2 whitespace-pre-wrap">{t.body}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleCopy(t)} title="Copy">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(t)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(t.id)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <TemplateEditor
        open={creating || !!editing}
        initial={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSave={handleSave}
      />
    </div>
  );
}

function TemplateEditor({
  open, initial, onClose, onSave,
}: {
  open: boolean;
  initial: MessageTemplate | null;
  onClose: () => void;
  onSave: (t: MessageTemplate) => void;
}) {
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<TemplateChannel>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setChannel(initial?.channel ?? 'email');
      setSubject(initial?.subject ?? '');
      setBody(initial?.body ?? '');
    }
  }, [open, initial]);

  const submit = () => {
    if (!name.trim() || !body.trim()) {
      toast.error('Name and body are required');
      return;
    }
    onSave({
      id: initial?.id ?? `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      channel,
      subject: channel === 'email' ? subject.trim() : undefined,
      body: body.trim(),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit template' : 'New template'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly rehearsal reminder" autoFocus />
          </div>
          <div>
            <Label className="text-xs">Channel</Label>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {(['email', 'sms', 'announcement'] as const).map((c) => {
                const { Icon, label } = CHANNEL_LABELS[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChannel(c)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 rounded-md border text-xs transition-colors',
                      channel === c ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                );
              })}
            </div>
          </div>
          {channel === 'email' && (
            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Rehearsal tonight at 7:00 PM" />
            </div>
          )}
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi everyone — quick reminder about rehearsal this evening…"
              rows={7}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit}>{initial ? 'Update' : 'Save template'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
