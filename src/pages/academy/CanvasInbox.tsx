// Canvas-backed inbox — list + per-conversation thread view + new
// message composer.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, AlertCircle, Inbox, Send, Archive, Mail, Plus, X } from 'lucide-react';
import {
  useCanvasInbox, useCanvasConversation, useReplyToConversation,
  useCreateConversation, useSearchRecipients, type CanvasRecipient,
} from '@/hooks/useCanvasAcademy';
import { toast } from 'sonner';

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CanvasInbox() {
  const params = useParams<{ conversationId?: string }>();
  const convId = params.conversationId ? Number(params.conversationId) : null;
  const [scope, setScope] = useState<'inbox' | 'sent' | 'archived' | 'unread'>('inbox');
  const [composeOpen, setComposeOpen] = useState(false);
  const { data, isLoading, error } = useCanvasInbox(scope);

  if (convId) return <ConversationDetail conversationId={convId} />;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-5">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <Link to="/academy/canvas" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Academy
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">Messages from your courses.</p>
        </div>
        <Button onClick={() => setComposeOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Compose
        </Button>
      </header>

      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />

      <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
        <TabsList>
          <TabsTrigger value="inbox"><Inbox className="w-3.5 h-3.5 mr-1.5" />Inbox</TabsTrigger>
          <TabsTrigger value="unread"><Mail className="w-3.5 h-3.5 mr-1.5" />Unread</TabsTrigger>
          <TabsTrigger value="sent"><Send className="w-3.5 h-3.5 mr-1.5" />Sent</TabsTrigger>
          <TabsTrigger value="archived"><Archive className="w-3.5 h-3.5 mr-1.5" />Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading messages…
        </div>
      ) : error || !data || 'error' in data ? (
        <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>Could not load inbox.</div>
        </div>
      ) : data.conversations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-2">
            <Inbox className="w-6 h-6 mx-auto opacity-40" />
            <p>No {scope === 'inbox' ? '' : scope + ' '}messages.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {data.conversations.map((c) => (
            <li key={c.id}>
              <Link to={`/academy/canvas/inbox/${c.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className="flex -space-x-2 shrink-0">
                      {c.participants.slice(0, 3).map((p) => (
                        p.avatar_url
                          ? <img key={p.id} src={p.avatar_url} alt="" className="w-8 h-8 rounded-full border-2 border-card object-cover" />
                          : <div key={p.id} className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center border-2 border-card">{p.name.charAt(0)}</div>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold truncate">
                          {c.participants.map((p) => p.name).slice(0, 3).join(', ')}
                          {c.participants.length > 3 && <span className="text-muted-foreground"> +{c.participants.length - 3}</span>}
                        </div>
                        <div className="text-[10px] text-muted-foreground shrink-0">{formatDate(c.last_message_at)}</div>
                      </div>
                      <div className="text-xs font-medium truncate">{c.subject ?? '(no subject)'}</div>
                      {c.last_message && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConversationDetail({ conversationId }: { conversationId: number }) {
  const { data, isLoading, error } = useCanvasConversation(conversationId);
  const reply = useReplyToConversation(conversationId);
  const [draft, setDraft] = useState('');

  const send = async () => {
    if (!draft.trim()) return;
    try {
      await reply.mutateAsync(draft.trim());
      setDraft('');
    } catch (e) {
      toast.error('Could not send', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading conversation…
      </div>
    );
  }
  if (error || !data || 'error' in data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>Could not load conversation.</div>
        </div>
      </div>
    );
  }
  const { conversation } = data;
  const byId = new Map(conversation.participants.map((p) => [p.id, p]));

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-5">
      <div>
        <Link to="/academy/canvas/inbox" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Inbox
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{conversation.subject ?? '(no subject)'}</h1>
        <div className="text-xs text-muted-foreground mt-1">
          {conversation.participants.map((p) => p.name).join(', ')}
        </div>
      </div>

      <ul className="space-y-3">
        {conversation.messages.slice().reverse().map((m) => {
          const author = byId.get(m.author_id);
          return (
            <li key={m.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {author?.avatar_url
                      ? <img src={author.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                      : <div className="w-6 h-6 rounded-full bg-muted text-xs flex items-center justify-center">{(author?.name ?? '?').charAt(0)}</div>
                    }
                    <div className="text-xs">
                      <span className="font-semibold">{author?.name ?? `User ${m.author_id}`}</span>
                      <span className="text-muted-foreground ml-2">{formatDate(m.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="Reply…" />
          <div className="flex justify-end">
            <Button onClick={send} disabled={reply.isPending || !draft.trim()}>
              {reply.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Sending…</> : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComposeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [picked, setPicked] = useState<CanvasRecipient[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CanvasRecipient[]>([]);
  const search = useSearchRecipients();
  const create = useCreateConversation();

  const runSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    try {
      const r = await search.mutateAsync({ q });
      setResults(r.filter((x) => typeof x.id === 'number'));
    } catch { /* swallow; toast at submit */ }
  };

  const submit = async () => {
    if (!body.trim() || picked.length === 0) return;
    try {
      await create.mutateAsync({
        recipient_ids: picked.map((p) => Number(p.id)),
        body: body.trim(),
        subject: subject.trim() || undefined,
      });
      toast.success('Sent');
      setSubject(''); setBody(''); setPicked([]); setQuery(''); setResults([]);
      onOpenChange(false);
    } catch (e) {
      toast.error('Could not send', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New message</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">To</Label>
            <div className="flex flex-wrap gap-1 mb-1">
              {picked.map((p) => (
                <span key={p.id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  {p.name}
                  <button onClick={() => setPicked(picked.filter((x) => x.id !== p.id))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <Input value={query} onChange={(e) => runSearch(e.target.value)} placeholder="Search by name…" />
            {results.length > 0 && (
              <ul className="mt-1 border border-border rounded-md max-h-40 overflow-auto bg-card text-sm">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      className="w-full text-left px-2 py-1.5 hover:bg-muted/50"
                      onClick={() => {
                        if (!picked.find((p) => p.id === r.id)) setPicked([...picked, r]);
                        setQuery(''); setResults([]);
                      }}
                    >{r.name}{r.type && <span className="text-xs text-muted-foreground ml-2">({r.type})</span>}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <Label className="text-xs">Subject (optional)</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending || !body.trim() || picked.length === 0}>
              {create.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Sending…</> : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
