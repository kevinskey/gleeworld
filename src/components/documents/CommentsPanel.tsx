// Comment threads for one document. Anchors live in the doc as `comment`
// marks (CommentMark); the text lives in gw_doc_comments so a comment can be
// edited or resolved without rewriting the document.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Check, Loader2, MessageSquare, RotateCcw, Trash2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  listComments, setCommentResolved, deleteComment, updateCommentBody, orphanedComments,
  sortComments, type DocComment,
} from '@/lib/documents/commentsApi';
import { anchoredCommentIds } from './extensions/CommentMark';

interface CommentsPanelProps {
  docId: string;
  editor: Editor | null;
  /** Bumped by the page whenever a comment is added, so the list refetches. */
  refreshToken: number;
}

export function CommentsPanel({ docId, editor, refreshToken }: CommentsPanelProps) {
  const [comments, setComments] = useState<DocComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setComments(await listComments(docId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load comments.');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => { void load(); }, [load, refreshToken]);

  // Which anchors still exist in the document. Recomputed from editor JSON
  // rather than tracked, so deleting commented text is noticed immediately.
  const anchored = useMemo(
    () => (editor ? anchoredCommentIds(editor.getJSON()) : new Set<string>()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, refreshToken, comments.length],
  );
  const orphans = useMemo(() => new Set(orphanedComments(comments, anchored).map((c) => c.id)), [comments, anchored]);
  const ordered = useMemo(() => sortComments(comments), [comments]);

  const jumpToAnchor = useCallback((anchorId: string) => {
    if (!editor) return;
    let target: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (target !== null || !node.isText) return;
      const hit = node.marks.find((m) => m.type.name === 'comment' && m.attrs.commentId === anchorId);
      if (hit) target = pos;
    });
    if (target === null) {
      toast.info('That comment’s text is no longer in the document.');
      return;
    }
    editor.chain().focus().setTextSelection(target + 1).scrollIntoView().run();
  }, [editor]);

  const withBusy = useCallback(async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'That didn’t save.');
    } finally {
      setBusyId(null);
    }
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading comments…
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="px-1 py-8 text-center text-sm text-muted-foreground">
        <MessageSquare className="mx-auto mb-2 h-5 w-5 opacity-50" />
        No comments yet. Select some text and use the comment button in the
        toolbar to start a thread.
      </div>
    );
  }

  return (
    <div className="space-y-3 py-1">
      {ordered.map((comment) => {
        const isOrphan = orphans.has(comment.id);
        const busy = busyId === comment.id;
        return (
          <div
            key={comment.id}
            className={`rounded-lg border p-3 text-sm ${
              comment.resolved_at ? 'border-border bg-muted/40 opacity-70' : 'border-border bg-card'
            }`}
          >
            {editingId === comment.id ? (
              <>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  className="mb-2 text-sm"
                  aria-label="Edit comment"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm" className="h-7 text-xs" disabled={busy || !draft.trim()}
                    onClick={() => withBusy(comment.id, async () => {
                      await updateCommentBody(comment.id, draft.trim());
                      setEditingId(null);
                    })}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => jumpToAnchor(comment.anchor_id)}
                  className="mb-2 block w-full whitespace-pre-wrap text-left hover:underline"
                  title="Jump to the commented text"
                >
                  {comment.body}
                </button>

                {isOrphan && (
                  <p className="mb-2 flex items-center gap-1.5 text-xs text-amber-600">
                    <Unlink className="h-3.5 w-3.5" />
                    The text this was attached to has been deleted.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1">
                  <span className="mr-auto text-[11px] text-muted-foreground">
                    {new Date(comment.created_at).toLocaleString()}
                    {comment.resolved_at ? ' · resolved' : ''}
                  </span>
                  <Button
                    size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={busy}
                    title={comment.resolved_at ? 'Reopen' : 'Resolve'}
                    onClick={() => withBusy(comment.id, () =>
                      setCommentResolved(comment.id, comment.resolved_at ? null : comment.user_id))}
                  >
                    {comment.resolved_at ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={busy}
                    onClick={() => { setEditingId(comment.id); setDraft(comment.body); }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" disabled={busy}
                    title="Delete comment"
                    onClick={() => withBusy(comment.id, async () => {
                      await deleteComment(comment.id);
                      // Drop the anchor too, or the highlight outlives the thread.
                      editor?.commands.unsetComment(comment.anchor_id);
                    })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
