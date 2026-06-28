// Canvas-backed discussion topic view — entries with replies, plus
// a "post entry" form and per-entry reply form.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, AlertCircle, MessageSquare, CornerDownRight } from 'lucide-react';
import { useDiscussionEntries, usePostDiscussionEntry, useReplyToEntry } from '@/hooks/useCanvasAcademy';
import { toast } from 'sonner';

function formatDate(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CanvasDiscussionTopic() {
  const params = useParams<{ courseId: string; topicId: string }>();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const topicId = params.topicId ? Number(params.topicId) : null;
  const { data, isLoading, error } = useDiscussionEntries(courseId, topicId);
  const post = usePostDiscussionEntry(courseId, topicId);
  const [draft, setDraft] = useState('');

  const submit = async () => {
    if (!draft.trim()) return;
    try {
      await post.mutateAsync(draft.trim());
      setDraft('');
    } catch (e) {
      toast.error('Could not post', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading discussion…
      </div>
    );
  }
  if (error || !data || 'error' in data) {
    const msg = (error as Error | undefined)?.message ?? (data && 'detail' in data ? data.detail : 'Unknown error');
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Could not load discussion</div>
            <div className="text-xs mt-0.5">{msg}</div>
          </div>
        </div>
      </div>
    );
  }
  const { entries } = data;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-5">
      <div>
        <Link to={`/academy/canvas/courses/${courseId}?tab=discussions`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to discussions
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Discussion</h1>
      </div>

      <Card className="border-0 rounded-2xl bg-card shadow-sm">
        <CardContent className="p-5 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Post a reply</h2>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="Share your thoughts…" />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={post.isPending || !draft.trim()}>
              {post.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Posting…</> : 'Post'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground space-y-2">
            <MessageSquare className="w-6 h-6 mx-auto opacity-40" />
            <p>No posts yet — start the conversation.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id}>
              <Entry courseId={courseId!} topicId={topicId!} entry={e} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Entry({
  courseId, topicId, entry,
}: { courseId: number; topicId: number; entry: import('@/hooks/useCanvasAcademy').CanvasDiscussionEntry }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const reply = useReplyToEntry(courseId, topicId);

  const submit = async () => {
    if (!replyText.trim()) return;
    try {
      await reply.mutateAsync({ entry_id: entry.id, message: replyText.trim() });
      setReplyText('');
      setReplying(false);
    } catch (e) {
      toast.error('Could not reply', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Card className="border-0 rounded-2xl bg-card shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div>
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{entry.user_name}</span> · {formatDate(entry.created_at)}
          </div>
          <div className="prose prose-sm max-w-none mt-1" dangerouslySetInnerHTML={{ __html: entry.message }} />
        </div>

        {entry.replies.length > 0 && (
          <ul className="space-y-2 border-l-2 border-border pl-3 ml-1">
            {entry.replies.map((r) => (
              <li key={r.id}>
                <div className="text-xs text-muted-foreground">
                  <CornerDownRight className="w-3 h-3 inline mr-1" />
                  <span className="font-semibold text-foreground">{r.user_name}</span> · {formatDate(r.created_at)}
                </div>
                <div className="prose prose-sm max-w-none mt-1" dangerouslySetInnerHTML={{ __html: r.message }} />
              </li>
            ))}
          </ul>
        )}

        {!replying ? (
          <Button size="sm" variant="ghost" onClick={() => setReplying(true)}>Reply</Button>
        ) : (
          <div className="space-y-2">
            <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder="Reply…" autoFocus />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setReplying(false); setReplyText(''); }}>Cancel</Button>
              <Button size="sm" onClick={submit} disabled={reply.isPending || !replyText.trim()}>
                {reply.isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Posting…</> : 'Post reply'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
