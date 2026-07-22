// /academy/c/:code/discuss/:threadId — discussion thread detail view.
// Renders the opening post + every reply (sorted oldest-first), each as
// markdown. Anyone in the course can reply unless the thread is locked.
// Instructor can pin / lock / delete.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft, Send, Pin, Lock, Trash2, Loader2, MessagesSquare, Pencil, X, Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { SimpleMarkdown } from '@/components/markdown/SimpleMarkdown';
import { ConfirmDeleteButton } from '@/components/shared/ConfirmDeleteButton';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

interface Thread {
  id: string;
  course_id: string;
  title: string;
  content: string;
  author_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  created_at: string;
}

interface Reply {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
}

export default function DiscussionThreadPage() {
  const { code, threadId } = useParams<{ code: string; threadId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const [reply, setReply] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [posting, setPosting] = useState(false);
  const [editingThread, setEditingThread] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const { data: thread, isLoading: threadLoading } = useQuery<Thread | null>({
    queryKey: ['discussion-thread', threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_discussions')
        .select('id, course_id, title, content, author_id, is_pinned, is_locked, view_count, created_at')
        .eq('id', threadId!)
        .is('parent_id', null)
        .maybeSingle();
      return data as Thread | null;
    },
  });

  const { data: course } = useQuery({
    queryKey: ['discussion-course', thread?.course_id],
    enabled: !!thread?.course_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_courses')
        .select('id, instructor_id, created_by')
        .eq('id', thread!.course_id)
        .maybeSingle();
      return data;
    },
  });

  // Pull all descendants of this thread (replies + their replies). We
  // limit nesting depth to 2 in the UI to keep things readable.
  const { data: allDescendants = [], isLoading: repliesLoading } = useQuery<any[]>({
    queryKey: ['discussion-replies', threadId, thread?.course_id],
    enabled: !!threadId && !!thread?.course_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_discussions')
        .select('id, content, author_id, parent_id, created_at')
        .eq('course_id', thread!.course_id)
        .not('parent_id', 'is', null)
        .order('created_at', { ascending: true });
      return data ?? [];
    },
  });

  // Top-level replies = parent_id === threadId
  const replies = allDescendants.filter((r: any) => r.parent_id === threadId);
  // Map of replyId -> list of nested replies
  const nestedMap = new Map<string, any[]>();
  allDescendants.forEach((r: any) => {
    if (r.parent_id && r.parent_id !== threadId) {
      const arr = nestedMap.get(r.parent_id) || [];
      arr.push(r);
      nestedMap.set(r.parent_id, arr);
    }
  });

  // Author profile lookups (one fetch per page render). Include nested
  // reply authors so their names also resolve.
  const allAuthorIds = Array.from(new Set([
    ...(thread ? [thread.author_id] : []),
    ...allDescendants.map((r: any) => r.author_id),
  ].filter(Boolean)));
  const { data: profiles = [] } = useQuery({
    queryKey: ['discussion-authors', allAuthorIds.join(',')],
    enabled: allAuthorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_profiles_directory')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', allAuthorIds);
      return data ?? [];
    },
  });
  const profMap = new Map(profiles.map((p: any) => [p.user_id, p]));

  // Bump view_count once on mount.
  useEffect(() => {
    if (!thread?.id) return;
    supabase
      .from('gw_course_discussions')
      .update({ view_count: (thread.view_count || 0) + 1 })
      .eq('id', thread.id)
      .then(() => { /* fire-and-forget */ });
  }, [thread?.id]);

  const canModerate = !!user && !!course && (
    isSuperAdmin() || isAdmin() ||
    course.instructor_id === user.id || course.created_by === user.id ||
    thread?.author_id === user.id
  );

  const postReply = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in to reply.');
      if (!reply.trim()) throw new Error('Empty reply.');
      const { error } = await supabase.from('gw_course_discussions').insert({
        course_id: thread!.course_id,
        parent_id: thread!.id,
        title: '',
        content: reply.trim(),
        author_id: user.id,
        is_pinned: false,
        is_locked: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply(''); setShowPreview(false);
      qc.invalidateQueries({ queryKey: ['discussion-replies', threadId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Reply failed.'),
  });

  const togglePin = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('gw_course_discussions')
        .update({ is_pinned: !thread?.is_pinned })
        .eq('id', thread!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discussion-thread', threadId] }),
  });

  const toggleLock = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('gw_course_discussions')
        .update({ is_locked: !thread?.is_locked })
        .eq('id', thread!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discussion-thread', threadId] }),
  });

  const saveThread = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('gw_course_discussions')
        .update({
          title: editTitle.trim(),
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', thread!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Thread updated.');
      setEditingThread(false);
      qc.invalidateQueries({ queryKey: ['discussion-thread', threadId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Save failed.'),
  });

  const deleteThread = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('gw_course_discussions').delete().eq('id', thread!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Thread deleted.');
      navigate(`/academy/c/${code}?tab=discussions`);
    },
  });

  if (threadLoading) {
    return <UniversalLayout><div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div></UniversalLayout>;
  }
  if (!thread) {
    return (
      <UniversalLayout>
      <div className="px-6 py-10 max-w-2xl mx-auto">
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-8 text-center space-y-3">
            <MessagesSquare className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">Thread not found or was deleted.</p>
            <Button variant="outline" onClick={() => navigate(`/academy/c/${code}?tab=discussions`)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to discussions
            </Button>
          </CardContent>
        </Card>
      </div>
      </UniversalLayout>
    );
  }

  const openingAuthor = profMap.get(thread.author_id);

  return (
    <UniversalLayout>
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/academy/c/${code}?tab=discussions`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
            {thread.is_pinned && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs"><Pin className="w-3 h-3 mr-1" />Pinned</Badge>}
            {thread.is_locked && <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200"><Lock className="w-3 h-3 mr-1" />Locked</Badge>}
            {thread.title}
          </h1>
          <div className="text-xs text-muted-foreground mt-1">
            {thread.view_count || 0} view{thread.view_count === 1 ? '' : 's'} · {replies.length} repl{replies.length === 1 ? 'y' : 'ies'}
          </div>
        </div>
        {canModerate && (
          <div className="flex items-center gap-1">
            {!editingThread && (
              <Button
                size="icon" variant="ghost"
                onClick={() => {
                  setEditTitle(thread.title);
                  setEditContent(thread.content);
                  setEditingThread(true);
                }}
                title="Edit thread"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => togglePin.mutate()} title={thread.is_pinned ? 'Unpin' : 'Pin'}>
              <Pin className={`w-4 h-4 ${thread.is_pinned ? 'text-amber-600' : 'text-muted-foreground'}`} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => toggleLock.mutate()} title={thread.is_locked ? 'Unlock' : 'Lock'}>
              <Lock className={`w-4 h-4 ${thread.is_locked ? 'text-rose-600' : 'text-muted-foreground'}`} />
            </Button>
            <ConfirmDeleteButton
              confirmKey="delete-discussion-thread"
              title="Delete this thread?"
              description="The thread and every reply will be permanently removed."
              onConfirm={() => deleteThread.mutate()}
              ariaLabel="Delete thread"
              className="inline-flex items-center justify-center rounded-md h-9 w-9 text-rose-600 hover:text-rose-700 hover:bg-muted"
            >
              <Trash2 className="w-4 h-4" />
            </ConfirmDeleteButton>
          </div>
        )}
      </div>

      {/* Opening post — edit mode swaps in title + content inputs */}
      {editingThread ? (
        <Card className={SOFT_CARD + ' ring-1 ring-primary/40'} style={SOFT_CARD_STYLE}>
          <CardContent className="p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Editing thread</div>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title"
              className="font-semibold text-base"
            />
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              placeholder="Opening post — markdown supported"
            />
            {editContent && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Preview</div>
                <SimpleMarkdown source={editContent} className="text-sm" />
              </div>
            )}
            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setEditingThread(false)}>
                <X className="w-4 h-4 mr-1.5" /> Cancel
              </Button>
              <Button onClick={() => saveThread.mutate()} disabled={saveThread.isPending || !editTitle.trim() || !editContent.trim()}>
                {saveThread.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PostCard
          author={openingAuthor}
          timestamp={thread.created_at}
          content={thread.content}
          isOriginal
        />
      )}

      {/* Replies */}
      {repliesLoading ? (
        <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
      ) : replies.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">No replies yet — be the first.</div>
      ) : (
        replies.map((r) => (
          <ReplyCard
            key={r.id}
            reply={r}
            author={profMap.get(r.author_id)}
            currentUserId={user?.id}
            canModerateThread={!!course && (course.instructor_id === user?.id || course.created_by === user?.id || isSuperAdmin() || isAdmin())}
            onChanged={() => qc.invalidateQueries({ queryKey: ['discussion-replies', threadId, thread?.course_id] })}
            nestedReplies={nestedMap.get(r.id) || []}
            profMap={profMap}
            threadLocked={!!thread.is_locked}
            courseId={thread.course_id}
          />
        ))
      )}

      {/* Reply composer */}
      {thread.is_locked ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-5 text-center text-sm text-muted-foreground">
            🔒 This thread is locked. No new replies.
          </CardContent>
        </Card>
      ) : (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Add a reply
            </div>
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              placeholder="Your thoughts… markdown supported (**bold**, *italic*, [links](url), - lists)"
            />
            {showPreview && reply && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Preview</div>
                <SimpleMarkdown source={reply} className="text-sm" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? 'Hide preview' : 'Preview'}
              </Button>
              <Button onClick={() => postReply.mutate()} disabled={!reply.trim() || postReply.isPending}>
                {postReply.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                Reply
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </UniversalLayout>
  );
}

function PostCard({
  author, timestamp, content, isOriginal,
}: {
  author: any;
  timestamp: string;
  content: string;
  isOriginal?: boolean;
}) {
  const name = author?.full_name || author?.email || 'Anonymous';
  const initials = name.split(/\s+/).map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <Card className={SOFT_CARD + (isOriginal ? ' ring-1 ring-primary/20' : '')} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src={author?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{name}</div>
            <div className="text-sm text-muted-foreground">
              {timestamp ? formatDistanceToNow(parseISO(timestamp), { addSuffix: true }) : ''}
              {timestamp && <> · {format(parseISO(timestamp), 'MMM d, h:mm a')}</>}
            </div>
          </div>
          {isOriginal && <Badge variant="outline" className="text-xs">OP</Badge>}
        </div>
        <SimpleMarkdown source={content || ''} className="text-sm leading-relaxed" />
      </CardContent>
    </Card>
  );
}

// Reply card with inline edit + nested reply support (1 level deep).
function ReplyCard({
  reply, author, currentUserId, canModerateThread, onChanged,
  nestedReplies = [], profMap, threadLocked, courseId, depth = 0,
}: {
  reply: { id: string; content: string; author_id: string; created_at: string };
  author: any;
  currentUserId?: string;
  canModerateThread: boolean;
  onChanged: () => void;
  nestedReplies?: any[];
  profMap?: Map<string, any>;
  threadLocked?: boolean;
  courseId?: string;
  depth?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(reply.content);
  const [busy, setBusy] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const canModify = !!currentUserId && (currentUserId === reply.author_id || canModerateThread);
  const name = author?.full_name || author?.email || 'Anonymous';
  const initials = name.split(/\s+/).map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  async function postNested() {
    if (!currentUserId || !replyContent.trim() || !courseId) return;
    setBusy(true);
    const { error } = await supabase.from('gw_course_discussions').insert({
      course_id: courseId,
      parent_id: reply.id,
      title: '',
      content: replyContent.trim(),
      author_id: currentUserId,
      is_pinned: false,
      is_locked: false,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setReplyContent(''); setReplying(false);
    onChanged();
  }

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from('gw_course_discussions')
      .update({ content: content.trim(), updated_at: new Date().toISOString() })
      .eq('id', reply.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Updated.');
    setEditing(false);
    onChanged();
  }
  async function remove() {
    const { error } = await supabase.from('gw_course_discussions').delete().eq('id', reply.id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  }

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src={author?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{name}</div>
            <div className="text-sm text-muted-foreground">
              {reply.created_at && formatDistanceToNow(parseISO(reply.created_at), { addSuffix: true })}
              {reply.created_at && <> · {format(parseISO(reply.created_at), 'MMM d, h:mm a')}</>}
            </div>
          </div>
          {canModify && !editing && (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setContent(reply.content); setEditing(true); }} title="Edit reply">
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <ConfirmDeleteButton
                confirmKey="delete-discussion-reply"
                title="Delete this reply?"
                description="This reply will be permanently removed."
                onConfirm={remove}
                ariaLabel="Delete reply"
                className="inline-flex items-center justify-center rounded-md h-9 w-9 text-rose-600 hover:text-rose-700 hover:bg-muted"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </ConfirmDeleteButton>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={busy || !content.trim()}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <SimpleMarkdown source={reply.content || ''} className="text-sm leading-relaxed" />
            {/* Reply / nested-reply controls — only at depth 0 (replying to a thread reply). */}
            {depth === 0 && !threadLocked && currentUserId && (
              <div className="mt-3 pt-3 border-t flex items-center justify-end">
                {!replying ? (
                  <Button size="sm" variant="ghost" onClick={() => setReplying(true)}>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Reply
                  </Button>
                ) : null}
              </div>
            )}
            {replying && (
              <div className="mt-3 space-y-2 pt-3 border-t">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={3}
                  placeholder={`Reply to ${name}…`}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setReplying(false); setReplyContent(''); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={postNested} disabled={busy || !replyContent.trim()}>
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                    Post reply
                  </Button>
                </div>
              </div>
            )}
            {nestedReplies.length > 0 && (
              <div className="mt-3 pl-6 border-l-2 border-border space-y-3">
                {nestedReplies.map((nr) => (
                  <ReplyCard
                    key={nr.id}
                    reply={nr}
                    author={profMap?.get(nr.author_id)}
                    currentUserId={currentUserId}
                    canModerateThread={canModerateThread}
                    onChanged={onChanged}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
