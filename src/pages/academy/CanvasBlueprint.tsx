// Canvas-backed blueprint course management. Admin only.
// Mark course as blueprint, associate child courses, trigger sync.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Loader2, ArrowLeft, AlertCircle, GitBranch, RefreshCw, CheckCircle2,
} from 'lucide-react';
import {
  useBlueprintStatus, useSetBlueprint, useAssociateBlueprint, useSyncBlueprint,
  useCanvasCourses,
} from '@/hooks/useCanvasAcademy';
import { toast } from 'sonner';

export default function CanvasBlueprint() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const { data: status, isLoading } = useBlueprintStatus(courseId);
  const setBp = useSetBlueprint(courseId);
  const associate = useAssociateBlueprint(courseId);
  const sync = useSyncBlueprint(courseId);
  const allCoursesQ = useCanvasCourses();

  const [restrictions, setRestrictions] = useState({
    content: true, points: true, due_dates: false, availability_dates: false,
  });
  const [comment, setComment] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggle = async (v: boolean) => {
    try {
      await setBp.mutateAsync({ blueprint: v, restrictions: v ? restrictions : undefined });
      toast.success(v ? 'Marked as blueprint' : 'No longer a blueprint');
    } catch (e) {
      toast.error('Could not change blueprint status', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const doSync = async () => {
    try {
      await sync.mutateAsync({ comment: comment || undefined });
      toast.success('Sync started');
      setComment('');
    } catch (e) {
      toast.error('Could not sync', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading blueprint status…</div>;

  const isBlueprint = status && 'ok' in status && status.is_blueprint;
  const associated = status && 'ok' in status ? status.associated_courses : [];
  const migrations = status && 'ok' in status ? status.recent_migrations : [];

  const courses = allCoursesQ.data && 'ok' in allCoursesQ.data ? allCoursesQ.data.courses : [];
  const associatedIds = new Set(associated.map((c) => c.id));
  const availableToAdd = courses.filter((c) => c.id !== courseId && !associatedIds.has(c.id));

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-5">
      <div>
        <Link to={`/academy/canvas/courses/${courseId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to course
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Blueprint settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Blueprint courses push synchronized content to associated child courses.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <GitBranch className="w-4 h-4" /> Use as blueprint
              </div>
              <div className="text-xs text-muted-foreground">When enabled, other courses can be associated and synced from here.</div>
            </div>
            <Switch checked={!!isBlueprint} onCheckedChange={toggle} disabled={setBp.isPending} />
          </div>

          {isBlueprint && (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lock these on children</div>
              {(['content', 'points', 'due_dates', 'availability_dates'] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={restrictions[k]}
                    onChange={(e) => {
                      const next = { ...restrictions, [k]: e.target.checked };
                      setRestrictions(next);
                      setBp.mutate({ blueprint: true, restrictions: next });
                    }}
                  />
                  {k.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isBlueprint && (
        <>
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Associated courses ({associated.length})</h2>
                <Button size="sm" variant="outline" onClick={() => setPickerOpen(!pickerOpen)}>
                  {pickerOpen ? 'Hide picker' : 'Add courses'}
                </Button>
              </div>

              {pickerOpen && (
                <div className="border border-border rounded p-2 space-y-1 max-h-56 overflow-auto">
                  {availableToAdd.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2">No more courses available to associate.</div>
                  ) : availableToAdd.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 text-sm"
                      onClick={async () => {
                        try {
                          await associate.mutateAsync({ add: [c.id] });
                          toast.success(`Added "${c.name}"`);
                        } catch (e) {
                          toast.error('Could not associate', { description: e instanceof Error ? e.message : String(e) });
                        }
                      }}
                    >
                      + {c.name} {c.code && <span className="font-mono text-xs text-muted-foreground">{c.code}</span>}
                    </button>
                  ))}
                </div>
              )}

              {associated.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No child courses yet.</div>
              ) : (
                <ul className="space-y-1.5">
                  {associated.map((c) => (
                    <li key={c.id} className="flex items-center justify-between p-2 rounded border border-border text-sm">
                      <span>{c.name} {c.course_code && <span className="font-mono text-xs text-muted-foreground ml-1">{c.course_code}</span>}</span>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        try { await associate.mutateAsync({ remove: [c.id] }); toast.success('Removed'); }
                        catch (e) { toast.error('Could not remove', { description: e instanceof Error ? e.message : String(e) }); }
                      }}>Remove</Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Push sync</h2>
              <div>
                <Label className="text-xs">Comment (optional, shown in child course logs)</Label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
              </div>
              <div className="flex justify-end">
                <Button onClick={doSync} disabled={sync.isPending || associated.length === 0}>
                  {sync.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Starting sync…</> : <><RefreshCw className="w-4 h-4 mr-1.5" /> Sync now</>}
                </Button>
              </div>

              {migrations.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent syncs</div>
                  <ul className="space-y-1 text-sm">
                    {migrations.map((m) => (
                      <li key={m.id} className="flex items-center gap-2">
                        {m.workflow_state === 'completed'
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          : m.workflow_state === 'failed'
                            ? <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            : <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                        <span className="flex-1 truncate">
                          {m.comment || <span className="text-muted-foreground italic">(no comment)</span>}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{m.workflow_state}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
