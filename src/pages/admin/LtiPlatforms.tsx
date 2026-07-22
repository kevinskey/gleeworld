// Super-admin view: list/add/edit registered LTI platforms.
//
// Replaces the "run this SQL by hand" onboarding step from Phase 1/2.
// RLS on lti_platforms restricts read+write to super-admins, so the
// SELECT/INSERT/UPDATE calls below just work for the right viewer and
// return zero rows for everyone else.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Power } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

interface Platform {
  id: string;
  issuer: string;
  client_id: string;
  deployment_id: string;
  auth_login_url: string;
  auth_token_url: string;
  jwks_url: string;
  tenant_id: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface Tenant {
  id: string;
  name: string;
}

// Canvas-Cloud defaults — auto-fill for the common case.
const CANVAS_DEFAULTS = {
  issuer: 'https://canvas.instructure.com',
  auth_login_url: 'https://canvas.instructure.com/api/lti/authorize_redirect',
  auth_token_url: 'https://canvas.instructure.com/login/oauth2/token',
  jwks_url: 'https://canvas.instructure.com/api/lti/security/jwks',
};

export default function LtiPlatforms() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Platform | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [{ data: pData }, { data: tData }] = await Promise.all([
      supabase.from('lti_platforms').select('*').order('created_at', { ascending: false }),
      supabase.from('gw_tenants').select('id, name').order('name'),
    ]);
    setPlatforms((pData ?? []) as Platform[]);
    setTenants((tData ?? []) as Tenant[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const toggleActive = async (p: Platform) => {
    const { error } = await supabase
      .from('lti_platforms')
      .update({ is_active: !p.is_active })
      .eq('id', p.id);
    if (error) return toast.error('Could not toggle', { description: error.message });
    toast.success(p.is_active ? 'Disabled' : 'Enabled');
    refresh();
  };

  const remove = async (p: Platform) => {
    if (!confirm(`Delete ${p.display_name || p.client_id}? Any future LTI launches from this Canvas instance will be rejected.`)) return;
    const { error } = await supabase.from('lti_platforms').delete().eq('id', p.id);
    if (error) return toast.error('Could not delete', { description: error.message });
    toast.success('Deleted');
    refresh();
  };

  return (
    <UniversalLayout>
    <DashboardPageShell
      title="LTI Platforms"
      subtitle="Registered Canvas (or other LMS) instances that can launch into GleeWorld."
      actions={
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" /> Add Canvas instance</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit platform' : 'Register a Canvas instance'}</DialogTitle>
            </DialogHeader>
            <PlatformForm
              tenants={tenants}
              initial={editing}
              onSaved={() => { setDialogOpen(false); setEditing(null); refresh(); }}
            />
          </DialogContent>
        </Dialog>
      }
    >
      {loading ? (
        <div className="flex items-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…</div>
      ) : platforms.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          No LTI platforms registered yet. Click "Add Canvas instance" to register your first.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {platforms.map((p) => {
            const tenant = tenants.find((t) => t.id === p.tenant_id);
            return (
              <Card key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                      {p.display_name || p.client_id}
                      {!p.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Disabled</span>}
                    </div>
                    <div className="text-xs text-muted-foreground break-all">{p.issuer}</div>
                    <div className="text-xs text-muted-foreground font-mono break-all">
                      client_id: {p.client_id} · deployment_id: {p.deployment_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Tenant: <span className="font-medium">{tenant?.name ?? p.tenant_id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(p)} title={p.is_active ? 'Disable' : 'Enable'}>
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(p)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Captured Canvas course contexts → GleeWorld course bindings.
          Each captured context can be pinned to a specific gw_course so
          grade passback knows which Canvas course to target. Until a
          context is bound, the grade-push fallback uses the student's
          most recent context (works for single-course tenants). */}
      <ContextBindings />

      {/* Setup cheatsheet — shown below the list so admins always have it. */}
      <Card>
        <CardContent className="p-5 text-sm space-y-2">
          <h2 className="font-semibold">Canvas admin setup (paste in the Canvas Developer Key form)</h2>
          <dl className="grid grid-cols-[200px,1fr] gap-y-1.5 text-xs font-mono">
            <dt className="text-muted-foreground">Target Link URI</dt>
            <dd>https://gleeworld.org/auth/lti</dd>
            <dt className="text-muted-foreground">OIDC Initiation URL</dt>
            <dd>https://supabase.gleeworld.org/functions/v1/lti-oidc-init</dd>
            <dt className="text-muted-foreground">Redirect URIs</dt>
            <dd>https://supabase.gleeworld.org/functions/v1/lti-launch</dd>
            <dt className="text-muted-foreground">JWK Method → URL</dt>
            <dd>https://supabase.gleeworld.org/functions/v1/lti-jwks</dd>
          </dl>
        </CardContent>
      </Card>
    </DashboardPageShell>
    </UniversalLayout>
  );
}

interface ContextRow {
  id: string;
  context_id: string;
  context_title: string | null;
  tenant_id: string;
  gw_course_id: string | null;
  last_launch_at: string | null;
}
interface CourseRow { id: string; title: string; tenant_id: string; }

function ContextBindings() {
  const [contexts, setContexts] = useState<ContextRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [{ data: ctx }, { data: cs }] = await Promise.all([
      supabase
        .from('lti_context_links')
        .select('id, context_id, context_title, tenant_id, gw_course_id, last_launch_at')
        .order('last_launch_at', { ascending: false, nullsFirst: false }),
      supabase.from('gw_courses').select('id, title, tenant_id').order('title'),
    ]);
    setContexts((ctx ?? []) as ContextRow[]);
    setCourses((cs ?? []) as CourseRow[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const bind = async (id: string, courseId: string | null) => {
    const { error } = await supabase
      .from('lti_context_links')
      .update({ gw_course_id: courseId })
      .eq('id', id);
    if (error) return toast.error('Could not bind', { description: error.message });
    toast.success(courseId ? 'Bound to course' : 'Binding cleared');
    refresh();
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-end justify-between mb-3 gap-3">
          <div>
            <h2 className="font-semibold">Canvas course bindings</h2>
            <p className="text-xs text-muted-foreground">
              Map each Canvas course we've seen at launch to a GleeWorld course.
              Grade passback uses these mappings to put the score in the right Canvas gradebook.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…</div>
        ) : contexts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No Canvas course launches captured yet. Bindings appear here after the first LTI launch from each Canvas course.</p>
        ) : (
          <div className="border border-border rounded-md divide-y divide-border">
            {contexts.map((c) => {
              const tenantCourses = courses.filter((co) => co.tenant_id === c.tenant_id);
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{c.context_title || c.context_id}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{c.context_id}</div>
                  </div>
                  <select
                    value={c.gw_course_id ?? ''}
                    onChange={(e) => bind(c.id, e.target.value || null)}
                    className="h-9 border border-border rounded-md bg-background px-2 text-sm max-w-xs"
                  >
                    <option value="">(unbound — uses fallback)</option>
                    {tenantCourses.map((co) => <option key={co.id} value={co.id}>{co.title}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformForm({
  tenants, initial, onSaved,
}: {
  tenants: Tenant[];
  initial: Platform | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    issuer: initial?.issuer ?? CANVAS_DEFAULTS.issuer,
    client_id: initial?.client_id ?? '',
    deployment_id: initial?.deployment_id ?? '',
    auth_login_url: initial?.auth_login_url ?? CANVAS_DEFAULTS.auth_login_url,
    auth_token_url: initial?.auth_token_url ?? CANVAS_DEFAULTS.auth_token_url,
    jwks_url: initial?.jwks_url ?? CANVAS_DEFAULTS.jwks_url,
    tenant_id: initial?.tenant_id ?? '',
    display_name: initial?.display_name ?? '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.client_id || !form.deployment_id || !form.tenant_id) {
      toast.error('Missing required fields', { description: 'Client ID, Deployment ID, and Tenant are required.' });
      return;
    }
    setSaving(true);
    const payload = { ...form, display_name: form.display_name || null };
    const { error } = initial
      ? await supabase.from('lti_platforms').update(payload).eq('id', initial.id)
      : await supabase.from('lti_platforms').insert(payload);
    setSaving(false);
    if (error) return toast.error('Save failed', { description: error.message });
    toast.success(initial ? 'Platform updated' : 'Platform registered');
    onSaved();
  };

  const field = (key: keyof typeof form, label: string, placeholder?: string) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        value={form[key] ?? ''}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="mt-1 font-mono text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Tenant (GleeWorld organization that owns this Canvas integration)</Label>
        <select
          value={form.tenant_id}
          onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
          className="w-full mt-1 h-10 border border-border rounded-md bg-background px-3 text-sm"
        >
          <option value="">Select tenant…</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      {field('display_name', 'Display name', 'e.g. Acme Canvas')}
      {field('issuer', 'Issuer URL')}
      {field('client_id', 'Client ID (from Canvas Developer Key)')}
      {field('deployment_id', 'Deployment ID (from Canvas Developer Key)')}
      {field('auth_login_url', 'Canvas authorize_redirect URL')}
      {field('auth_token_url', 'Canvas OAuth token URL')}
      {field('jwks_url', 'Canvas JWKs URL')}
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {initial ? 'Save changes' : 'Register platform'}
      </Button>
    </div>
  );
}
