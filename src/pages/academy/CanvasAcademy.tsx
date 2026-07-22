// Canvas-backed Academy — Phase 1 UI.
//
// Renders the calling user's Canvas courses (pulled from the Canvas
// instance bound to their tenant). Branded to look like GleeWorld;
// the underlying data store is Canvas.
//
// Phase 1 covers the courses LIST only — the per-course detail view
// (modules, assignments, gradebook) ships in Phase 2.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, GraduationCap, BookOpen, AlertCircle, Plug, Plus, Inbox, Calendar } from 'lucide-react';
import { useCanvasCourses, useBootstrapCanvas, useCreateCourse } from '@/hooks/useCanvasAcademy';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function CanvasAcademy() {
  const { data, isLoading, error, refetch } = useCanvasCourses();
  const bootstrap = useBootstrapCanvas();
  const { isSuperAdmin, isAdmin, profile } = useUserRole();
  const canTeach = isSuperAdmin() || isAdmin() || profile?.role === 'instructor';
  const [createOpen, setCreateOpen] = useState(false);

  // Edge fn returns { error: 'canvas_not_bound' } as a soft state — surface
  // as the "Connect" CTA, not an error.
  const notBound = data && 'error' in data && data.error === 'canvas_not_bound';
  const courses = data && 'ok' in data ? data.courses : [];

  return (
    <UniversalLayout>
    <DashboardPageShell
      title="Academy"
      subtitle={canTeach
        ? 'Your courses — teach or learn.'
        : 'Your courses, assignments, and grades.'}
      actions={
        <div className="flex items-center gap-2">
          {!notBound && (
            <>
              <Link to="/academy/canvas/inbox">
                <Button variant="outline" size="sm"><Inbox className="w-4 h-4 mr-1.5" /> Inbox</Button>
              </Link>
              <Link to="/academy/canvas/calendar">
                <Button variant="outline" size="sm"><Calendar className="w-4 h-4 mr-1.5" /> Calendar</Button>
              </Link>
            </>
          )}
          {canTeach && !notBound && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> New course
            </Button>
          )}
        </div>
      }
    >
      <CreateCourseDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => refetch()} />

      {notBound && (
        <Card className="border-0 rounded-2xl bg-card shadow-sm">
          <CardContent className="p-8 text-center space-y-4">
            <Plug className="w-10 h-10 text-primary mx-auto" />
            <div>
              <h2 className="text-lg font-semibold">Enable Academy</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                One-time setup. We'll provision a workspace for your organization;
                courses you create from now on get a full gradebook, quiz engine,
                and rubric support.
              </p>
            </div>
            <Button
              onClick={async () => {
                try {
                  const r = await bootstrap.mutateAsync();
                  toast.success(r.already_bound ? 'Already enabled' : 'Academy ready');
                  refetch();
                } catch (e: any) {
                  toast.error('Could not enable Academy', { description: e?.message });
                }
              }}
              disabled={bootstrap.isPending}
            >
              {bootstrap.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Setting up…</>
              ) : (
                <><Plug className="w-4 h-4 mr-1.5" /> Enable Academy</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your courses…
        </div>
      )}

      {/* Transport-level error (not the 'canvas_not_bound' soft state) */}
      {error && !notBound && (
        <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Could not load courses</div>
            <div className="text-xs mt-0.5">{(error as Error).message}</div>
          </div>
        </div>
      )}

      {/* No courses yet (post-bootstrap) */}
      {data && 'ok' in data && courses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
            <BookOpen className="w-6 h-6 mx-auto opacity-40" />
            {canTeach ? (
              <>
                <p>No courses yet.</p>
                <p className="text-xs">Create the first one to add modules, assignments, and enroll students.</p>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create first course
                </Button>
              </>
            ) : (
              <>
                <p>You're not enrolled in any courses yet.</p>
                <p className="text-xs">Once an instructor adds you to a course, it'll show up here.</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Course grid */}
      {courses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Card key={c.id} className="border-0 rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm leading-tight line-clamp-2">{c.name}</div>
                    {c.code && <div className="text-xs text-muted-foreground mt-0.5 font-mono">{c.code}</div>}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <Link to={`/academy/canvas/courses/${c.id}`}>
                    <Button size="sm" variant="outline" className="text-xs">Open</Button>
                  </Link>
                  <div className="text-[10px] text-muted-foreground font-mono">id: {c.id}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <footer className="text-xs text-muted-foreground border-t border-border pt-4">
        Academy data is stored in your organization's private workspace.
      </footer>
    </DashboardPageShell>
    </UniversalLayout>
  );
}

function CreateCourseDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const create = useCreateCourse();

  const submit = async () => {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim(), course_code: code.trim() || undefined });
      toast.success(`Created "${name.trim()}"`);
      setName('');
      setCode('');
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error('Could not create course', { description: e?.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New course</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Course name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Music Theory I"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Course code (optional)</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. MUS101"
              className="font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            You'll be added as the teacher. Enroll students from inside the course.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending || !name.trim()}>
              {create.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating…</>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
