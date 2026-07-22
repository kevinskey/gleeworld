// Canvas-backed course detail — tabbed view: Overview, Modules,
// Assignments, Quizzes, Discussions, People, Grades. Mirrors the
// legacy Glee Academy course shell so the experience is familiar.

import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Loader2, ArrowLeft, Calendar, GraduationCap, Layers, FileText,
  AlertCircle, ClipboardCheck, MessageSquare, Users, Home, Pin, Lock,
  Megaphone, Plus, Folder, FolderOpen, Download, ChevronRight,
} from 'lucide-react';
import {
  useCanvasCourse, useCanvasCourseTab, useCanvasAnnouncements, usePostAnnouncement,
  useCreateDiscussionTopic, useCanvasCourseFiles, useCreateQuiz,
  type CanvasQuiz, type CanvasDiscussion, type CanvasPerson, type CanvasAnnouncement,
} from '@/hooks/useCanvasAcademy';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function formatDateShort(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function CanvasCourseDetail() {
  const params = useParams<{ courseId: string }>();
  const [search, setSearch] = useSearchParams();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const tab = search.get('tab') ?? 'overview';
  const setTab = (v: string) => {
    const sp = new URLSearchParams(search);
    sp.set('tab', v);
    setSearch(sp, { replace: true });
  };

  const { data, isLoading, error } = useCanvasCourse(courseId);

  if (isLoading) {
    return (
      <UniversalLayout>
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading course…
      </div>
      </UniversalLayout>
    );
  }
  if (error || !data || 'error' in data) {
    const msg = (error as Error | undefined)?.message ?? (data && 'detail' in data ? data.detail : 'Unknown error');
    return (
      <UniversalLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Could not load course</div>
            <div className="text-xs mt-0.5">{msg}</div>
          </div>
        </div>
      </div>
      </UniversalLayout>
    );
  }
  const { course, modules, assignments } = data;
  const now = Date.now();
  const upcoming = assignments
    .filter((a) => a.due_at && new Date(a.due_at).getTime() > now)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
  const past = assignments
    .filter((a) => !a.due_at || new Date(a.due_at).getTime() <= now)
    .sort((a, b) => (b.due_at ?? '').localeCompare(a.due_at ?? ''));

  return (
    <UniversalLayout>
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
      <div>
        <Link to="/academy/canvas" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> All courses
        </Link>
        <div className="flex items-end justify-between gap-3 flex-wrap mt-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{course.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {course.code && <Badge variant="outline" className="text-xs font-mono">{course.code}</Badge>}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto justify-start gap-1">
          <TabsTrigger value="overview"><Home className="w-3.5 h-3.5 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="w-3.5 h-3.5 mr-1.5" />Announcements</TabsTrigger>
          <TabsTrigger value="modules"><Layers className="w-3.5 h-3.5 mr-1.5" />Modules</TabsTrigger>
          <TabsTrigger value="assignments"><FileText className="w-3.5 h-3.5 mr-1.5" />Assignments</TabsTrigger>
          <TabsTrigger value="quizzes"><ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />Quizzes</TabsTrigger>
          <TabsTrigger value="discussions"><MessageSquare className="w-3.5 h-3.5 mr-1.5" />Discussions</TabsTrigger>
          <TabsTrigger value="people"><Users className="w-3.5 h-3.5 mr-1.5" />People</TabsTrigger>
          <TabsTrigger value="files"><Folder className="w-3.5 h-3.5 mr-1.5" />Files</TabsTrigger>
          <TabsTrigger value="grades"><GraduationCap className="w-3.5 h-3.5 mr-1.5" />Grades</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab syllabus={course.syllabus_body} modulesCount={modules.length} assignmentsCount={assignments.length} courseId={course.id} />
        </TabsContent>

        <TabsContent value="announcements" className="mt-4">
          <AnnouncementsTab courseId={course.id} active={tab === 'announcements'} />
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          {modules.length === 0 ? (
            <EmptyCard icon={Layers} message="No modules yet." />
          ) : (
            <ol className="space-y-2">
              {modules.sort((a, b) => a.position - b.position).map((m) => (
                <li key={m.id}>
                  <Card><CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {m.position}
                      </div>
                      <div className="font-semibold">{m.name}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">{m.items_count} items</Badge>
                  </CardContent></Card>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4 space-y-5">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <EmptyCard icon={FileText} message="No upcoming assignments." />
            ) : (
              <ul className="space-y-2">
                {upcoming.map((a) => <AssignmentRow key={a.id} courseId={course.id} a={a} />)}
              </ul>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Past ({past.length})
              </h2>
              <ul className="space-y-2">
                {past.map((a) => <AssignmentRow key={a.id} courseId={course.id} a={a} />)}
              </ul>
            </section>
          )}
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          <QuizzesTab courseId={course.id} active={tab === 'quizzes'} />
        </TabsContent>

        <TabsContent value="discussions" className="mt-4">
          <DiscussionsTab courseId={course.id} active={tab === 'discussions'} />
        </TabsContent>

        <TabsContent value="people" className="mt-4">
          <PeopleTab courseId={course.id} active={tab === 'people'} />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <FilesTab courseId={course.id} active={tab === 'files'} />
        </TabsContent>

        <TabsContent value="grades" className="mt-4">
          <GradesActions courseId={course.id} />
        </TabsContent>
      </Tabs>
    </div>
    </UniversalLayout>
  );
}

function EmptyCard({ icon: Icon, message }: { icon: typeof Layers; message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center text-sm text-muted-foreground space-y-2">
        <Icon className="w-6 h-6 mx-auto opacity-40" />
        <p>{message}</p>
      </CardContent>
    </Card>
  );
}

function OverviewTab({
  syllabus, modulesCount, assignmentsCount, courseId,
}: { syllabus: string | null; modulesCount: number; assignmentsCount: number; courseId: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{modulesCount}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Modules</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{assignmentsCount}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Assignments</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center flex flex-col items-center justify-center">
          <Link to={`/academy/canvas/courses/${courseId}/grades`} className="text-primary hover:underline text-sm font-semibold">
            View grades →
          </Link>
        </CardContent></Card>
      </div>
      {syllabus ? (
        <Card><CardContent className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Syllabus</h2>
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: syllabus }} />
        </CardContent></Card>
      ) : (
        <EmptyCard icon={FileText} message="No syllabus written yet." />
      )}
    </div>
  );
}

function FilesTab({ courseId, active }: { courseId: number; active: boolean }) {
  const [folderId, setFolderId] = useState<number | null>(null);
  const { data, isLoading } = useCanvasCourseFiles(courseId, folderId, active);

  if (isLoading) return <Loading />;
  if (!data || 'error' in data) return <EmptyCard icon={Folder} message="No files yet." />;
  const { folders, files, breadcrumb } = data;

  return (
    <div className="space-y-3">
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
          {breadcrumb.map((b, i) => (
            <span key={b.id} className="flex items-center gap-1">
              <button
                onClick={() => setFolderId(i === 0 ? null : b.id)}
                className="hover:text-foreground hover:underline"
              >{i === 0 ? 'Root' : b.name}</button>
              {i < breadcrumb.length - 1 && <ChevronRight className="w-3 h-3" />}
            </span>
          ))}
        </div>
      )}

      {folders.length === 0 && files.length === 0 ? (
        <EmptyCard icon={Folder} message="This folder is empty." />
      ) : (
        <ul className="space-y-1">
          {folders.map((f) => (
            <li key={`f${f.id}`}>
              <button
                onClick={() => setFolderId(f.id)}
                className="w-full text-left"
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.files_count} {f.files_count === 1 ? 'file' : 'files'}
                        {f.folders_count > 0 && <> · {f.folders_count} {f.folders_count === 1 ? 'folder' : 'folders'}</>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </li>
          ))}
          {files.map((f) => (
            <li key={`fi${f.id}`}>
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(f.size / 1024)} KB · {f.content_type}
                    </div>
                  </div>
                  <a href={f.url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      <Download className="w-3.5 h-3.5 mr-1" /> Download
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GradesActions({ courseId }: { courseId: number }) {
  const { isSuperAdmin, isAdmin, profile } = useUserRole();
  const canGrade = isSuperAdmin() || isAdmin() || profile?.role === 'instructor';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Link to={`/academy/canvas/courses/${courseId}/grades`}>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-5 flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-primary" />
          <div>
            <div className="font-semibold text-sm">My grades</div>
            <div className="text-xs text-muted-foreground">Overall + per-assignment scores</div>
          </div>
        </CardContent></Card>
      </Link>
      {canGrade && (
        <Link to={`/academy/canvas/courses/${courseId}/gradebook`}>
          <Card className="hover:shadow-md transition-shadow"><CardContent className="p-5 flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <div className="font-semibold text-sm">Gradebook</div>
              <div className="text-xs text-muted-foreground">Grade student submissions</div>
            </div>
          </CardContent></Card>
        </Link>
      )}
      {canGrade && (
        <Link to={`/academy/canvas/courses/${courseId}/analytics`}>
          <Card className="hover:shadow-md transition-shadow"><CardContent className="p-5 flex items-center gap-3">
            <Layers className="w-6 h-6 text-primary" />
            <div>
              <div className="font-semibold text-sm">Analytics</div>
              <div className="text-xs text-muted-foreground">Per-student + per-assignment stats</div>
            </div>
          </CardContent></Card>
        </Link>
      )}
      {canGrade && (
        <Link to={`/academy/canvas/courses/${courseId}/rubrics`}>
          <Card className="hover:shadow-md transition-shadow"><CardContent className="p-5 flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            <div>
              <div className="font-semibold text-sm">Rubrics</div>
              <div className="text-xs text-muted-foreground">Author + attach to assignments</div>
            </div>
          </CardContent></Card>
        </Link>
      )}
      {canGrade && (
        <Link to={`/academy/canvas/courses/${courseId}/outcomes`}>
          <Card className="hover:shadow-md transition-shadow"><CardContent className="p-5 flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-primary" />
            <div>
              <div className="font-semibold text-sm">Outcomes & Mastery</div>
              <div className="text-xs text-muted-foreground">Learning outcomes + rollups</div>
            </div>
          </CardContent></Card>
        </Link>
      )}
      {(isSuperAdmin() || isAdmin()) && (
        <Link to={`/academy/canvas/courses/${courseId}/blueprint`}>
          <Card className="hover:shadow-md transition-shadow"><CardContent className="p-5 flex items-center gap-3">
            <Layers className="w-6 h-6 text-primary" />
            <div>
              <div className="font-semibold text-sm">Blueprint</div>
              <div className="text-xs text-muted-foreground">Push synced content to child courses</div>
            </div>
          </CardContent></Card>
        </Link>
      )}
    </div>
  );
}

function AnnouncementsTab({ courseId, active }: { courseId: number; active: boolean }) {
  const { isSuperAdmin, isAdmin, profile } = useUserRole();
  const canPost = isSuperAdmin() || isAdmin() || profile?.role === 'instructor';
  const { data, isLoading } = useCanvasAnnouncements(courseId, active);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      {canPost && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New announcement
          </Button>
        </div>
      )}
      {canPost && <NewAnnouncementDialog open={open} onOpenChange={setOpen} courseId={courseId} />}

      {isLoading ? <Loading /> : (
        !data || 'error' in data || data.announcements.length === 0 ? (
          <EmptyCard icon={Megaphone} message="No announcements yet." />
        ) : (
          <ul className="space-y-2">
            {data.announcements.map((a: CanvasAnnouncement) => (
              <li key={a.id}>
                <Card><CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {a.author_avatar ? (
                      <img src={a.author_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Megaphone className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{a.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.author_name ?? 'Unknown'} · {formatDate(a.posted_at)}
                      </div>
                      {a.message && (
                        <div
                          className="prose prose-sm max-w-none mt-2"
                          dangerouslySetInnerHTML={{ __html: a.message }}
                        />
                      )}
                    </div>
                  </div>
                </CardContent></Card>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function NewAnnouncementDialog({
  open, onOpenChange, courseId,
}: { open: boolean; onOpenChange: (o: boolean) => void; courseId: number }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const post = usePostAnnouncement(courseId);

  const submit = async () => {
    if (!title.trim() || !message.trim()) return;
    try {
      await post.mutateAsync({ title: title.trim(), message: message.trim() });
      toast.success('Posted');
      setTitle(''); setMessage('');
      onOpenChange(false);
    } catch (e) {
      toast.error('Could not post', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Plain text or HTML" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={post.isPending || !title.trim() || !message.trim()}>
              {post.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Posting…</> : 'Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuizzesTab({ courseId, active }: { courseId: number; active: boolean }) {
  const { isSuperAdmin, isAdmin, profile } = useUserRole();
  const canEdit = isSuperAdmin() || isAdmin() || profile?.role === 'instructor';
  const { data, isLoading } = useCanvasCourseTab(courseId, 'quizzes', active);
  const createQuiz = useCreateQuiz(courseId);
  const navigate = useNavigate();

  const newQuiz = async () => {
    try {
      const r = await createQuiz.mutateAsync({ title: 'Untitled quiz', published: false });
      navigate(`/academy/canvas/courses/${courseId}/quizzes/${r.quiz.id}/edit`);
    } catch (e) {
      toast.error('Could not create quiz', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={newQuiz} disabled={createQuiz.isPending}>
            {createQuiz.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            New quiz
          </Button>
        </div>
      )}
      {isLoading ? <Loading /> : !data || 'error' in data || data.quizzes.length === 0 ? (
        <EmptyCard icon={ClipboardCheck} message="No quizzes yet." />
      ) : (
        <ul className="space-y-2">
          {(data.quizzes as CanvasQuiz[]).map((q) => {
            const inner = (
              <Card className={canEdit ? 'hover:shadow-md transition-shadow' : ''}>
                <CardContent className="p-3 flex items-center gap-3">
                  <ClipboardCheck className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{q.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> Due {formatDate(q.due_at)}
                      {q.points_possible !== null && <span>· {q.points_possible} pts</span>}
                      <span>· {q.question_count} questions</span>
                    </div>
                  </div>
                  {!q.published && <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                </CardContent>
              </Card>
            );
            return (
              <li key={q.id}>
                {canEdit ? <Link to={`/academy/canvas/courses/${courseId}/quizzes/${q.id}/edit`}>{inner}</Link> : inner}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DiscussionsTab({ courseId, active }: { courseId: number; active: boolean }) {
  const { isSuperAdmin, isAdmin, profile } = useUserRole();
  const canCreate = isSuperAdmin() || isAdmin() || profile?.role === 'instructor';
  const { data, isLoading } = useCanvasCourseTab(courseId, 'discussions', active);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New topic
          </Button>
        </div>
      )}
      {canCreate && <NewTopicDialog open={open} onOpenChange={setOpen} courseId={courseId} />}

      {isLoading ? <Loading /> : !data || 'error' in data || data.discussions.length === 0 ? (
        <EmptyCard icon={MessageSquare} message="No discussions yet." />
      ) : (
        <ul className="space-y-2">
          {(data.discussions as CanvasDiscussion[]).map((d) => (
            <li key={d.id}>
              <Link to={`/academy/canvas/courses/${courseId}/discussions/${d.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate flex items-center gap-2">
                        {d.pinned && <Pin className="w-3 h-3 text-amber-600 shrink-0" />}
                        {d.locked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                        {d.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.replies} {d.replies === 1 ? 'reply' : 'replies'}
                        {d.last_reply_at && <> · last {formatDateShort(d.last_reply_at)}</>}
                      </div>
                    </div>
                    {d.unread > 0 && <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">{d.unread} new</Badge>}
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

function NewTopicDialog({
  open, onOpenChange, courseId,
}: { open: boolean; onOpenChange: (o: boolean) => void; courseId: number }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const create = useCreateDiscussionTopic(courseId);

  const submit = async () => {
    if (!title.trim() || !message.trim()) return;
    try {
      await create.mutateAsync({ title: title.trim(), message: message.trim() });
      toast.success('Topic created');
      setTitle(''); setMessage('');
      onOpenChange(false);
    } catch (e) {
      toast.error('Could not create', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New discussion topic</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label className="text-xs">Opening post</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending || !title.trim() || !message.trim()}>
              {create.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating…</> : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PeopleTab({ courseId, active }: { courseId: number; active: boolean }) {
  const { data, isLoading } = useCanvasCourseTab(courseId, 'people', active);
  if (isLoading) return <Loading />;
  if (!data || 'error' in data) return <EmptyCard icon={Users} message="No one enrolled yet." />;
  const people: CanvasPerson[] = data.people;
  if (people.length === 0) return <EmptyCard icon={Users} message="No one enrolled yet." />;
  const teachers = people.filter((p) => /Teacher|Designer|Ta/i.test(p.type));
  const students = people.filter((p) => /Student/i.test(p.type));
  return (
    <div className="space-y-5">
      {teachers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Teachers ({teachers.length})
          </h2>
          <PeopleList people={teachers} />
        </section>
      )}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Students ({students.length})
        </h2>
        {students.length === 0 ? (
          <EmptyCard icon={Users} message="No students enrolled yet." />
        ) : (
          <PeopleList people={students} />
        )}
      </section>
    </div>
  );
}

function PeopleList({ people }: { people: CanvasPerson[] }) {
  return (
    <ul className="space-y-1">
      {people.map((p) => (
        <li key={p.enrollment_id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
              {p.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{p.name}</div>
            <div className="text-xs text-muted-foreground">{p.role}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-8 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
    </div>
  );
}

function AssignmentRow({ courseId, a }: { courseId: number; a: { id: number; name: string; due_at: string | null; points_possible: number | null; has_submission?: boolean } }) {
  return (
    <li>
      <Link to={`/academy/canvas/courses/${courseId}/assignments/${a.id}`}>
        <Card className="border-0 rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3 flex items-center gap-3">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{a.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3 h-3" /> {formatDate(a.due_at)}
                {a.points_possible !== null && <span>· {a.points_possible} pts</span>}
              </div>
            </div>
            {a.has_submission && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Submitted</Badge>}
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
