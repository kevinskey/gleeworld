// /admin/students/onboard — single page with three onboarding tabs:
//   1) Send single invite (email + name → magic link)
//   2) Upload roster (CSV → one invite per row)
//   3) Share class join code (per-course code + URL)
import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  UserPlus, Upload, Hash, Loader2, Mail, FileText, Copy, RefreshCw, CheckCircle2,
} from 'lucide-react';

type Course = { id: string; course_code: string | null; title: string | null; join_code: string | null };

export default function StudentOnboarding() {
  const { user } = useAuth();
  const { settings } = useBrandingSettings();
  const orgName = settings?.organization_name || settings?.short_name || 'your music program';

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['onboarding-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_courses')
        .select('id, course_code, title, join_code')
        .eq('is_active', true)
        .order('course_code', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-primary" /> Onboard students
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick the method that fits how your students will arrive.
        </p>
      </header>

      <Tabs defaultValue="single">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="single" className="gap-2"><Mail className="w-4 h-4" /> Single invite</TabsTrigger>
          <TabsTrigger value="roster" className="gap-2"><Upload className="w-4 h-4" /> Upload roster</TabsTrigger>
          <TabsTrigger value="code" className="gap-2"><Hash className="w-4 h-4" /> Join code</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-4">
          <SingleInvite courses={courses} userId={user?.id} orgName={orgName} />
        </TabsContent>
        <TabsContent value="roster" className="mt-4">
          <RosterUpload courses={courses} userId={user?.id} orgName={orgName} />
        </TabsContent>
        <TabsContent value="code" className="mt-4">
          <JoinCodes courses={courses} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SingleInvite({ courses, userId, orgName }: { courses: Course[]; userId?: string; orgName: string }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!email.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('gw-invite-student', {
        body: {
          email: email.trim(),
          fullName: fullName.trim() || undefined,
          courseId: courseId || undefined,
          invitedBy: userId,
          appOrigin: window.location.origin,
          orgName,
        },
      });
      if (error) throw error;
      toast({ title: 'Invite sent', description: `${email.trim()} will receive a sign-in link.` });
      setEmail(''); setFullName('');
    } catch (e: any) {
      toast({ title: 'Invite failed', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Send one invite</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Email *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.edu" />
        </div>
        <div>
          <Label className="text-xs">Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Maya Johnson" />
        </div>
        <div>
          <Label className="text-xs">Enroll in class (optional)</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.course_code || c.title} {c.title && c.course_code ? `· ${c.title}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={send} disabled={sending || !email.trim()}>
          {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
          Send invite
        </Button>
        <p className="text-xs text-muted-foreground">Recipient gets an email with a one-tap sign-in link. No password setup.</p>
      </CardContent>
    </Card>
  );
}

function RosterUpload({ courses, userId, orgName }: { courses: Course[]; userId?: string; orgName: string }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Array<{ email: string; fullName?: string }>>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: string[] } | null>(null);

  function parseCsv(text: string) {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return [];
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('email');
    const start = hasHeader ? 1 : 0;
    const emailIdx = hasHeader ? header.split(',').findIndex((h) => h.trim().includes('email')) : 0;
    const nameIdx = hasHeader ? header.split(',').findIndex((h) => h.trim().includes('name')) : 1;
    return lines.slice(start).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      return { email: cols[emailIdx] || '', fullName: nameIdx >= 0 ? cols[nameIdx] : undefined };
    }).filter((r) => r.email);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setRows(parseCsv(String(r.result || '')));
    r.readAsText(f);
  }

  async function sendAll() {
    if (rows.length === 0) return;
    setSending(true);
    setProgress({ done: 0, total: rows.length, failed: [] });
    const failed: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const { error } = await supabase.functions.invoke('gw-invite-student', {
          body: {
            email: r.email,
            fullName: r.fullName,
            courseId: courseId || undefined,
            invitedBy: userId,
            appOrigin: window.location.origin,
            orgName,
          },
        });
        if (error) failed.push(r.email);
      } catch {
        failed.push(r.email);
      }
      setProgress({ done: i + 1, total: rows.length, failed: [...failed] });
    }
    setSending(false);
    toast({
      title: `Done — ${rows.length - failed.length} sent`,
      description: failed.length ? `${failed.length} failed` : undefined,
      variant: failed.length ? 'destructive' : 'default',
    });
    if (failed.length === 0) {
      setRows([]);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Upload a roster (CSV)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">CSV with columns <code className="bg-muted px-1 rounded">email</code> and <code className="bg-muted px-1 rounded">name</code> (header row optional). Each row gets an invite email with a magic sign-in link.</p>
        <div>
          <Label className="text-xs">Enroll all in class (optional)</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.course_code || c.title} {c.title && c.course_code ? `· ${c.title}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="text-sm" />
        {rows.length > 0 && (
          <div className="border rounded p-3 text-sm space-y-1 max-h-60 overflow-y-auto">
            <div className="text-xs font-semibold mb-1">{rows.length} recipient{rows.length === 1 ? '' : 's'}:</div>
            {rows.slice(0, 50).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <FileText className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono">{r.email}</span>
                {r.fullName && <span className="text-muted-foreground">— {r.fullName}</span>}
              </div>
            ))}
            {rows.length > 50 && <div className="text-xs text-muted-foreground">… and {rows.length - 50} more</div>}
          </div>
        )}
        {progress && (
          <div className="text-xs">
            Progress: {progress.done}/{progress.total} · failed: {progress.failed.length}
          </div>
        )}
        <Button onClick={sendAll} disabled={sending || rows.length === 0}>
          {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
          Send {rows.length} invite{rows.length === 1 ? '' : 's'}
        </Button>
      </CardContent>
    </Card>
  );
}

function JoinCodes({ courses }: { courses: Course[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const origin = useMemo(() => (typeof window !== 'undefined' ? window.location.origin : ''), []);

  async function generate(courseId: string) {
    const code = randomCode();
    const { error } = await supabase.from('gw_courses').update({ join_code: code }).eq('id', courseId);
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['onboarding-courses'] });
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied' });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Class join codes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Generate a code for each class. Share it with students — they visit the URL, sign up, and land in your class automatically.</p>
        {courses.length === 0 && <p className="text-sm text-muted-foreground">No active classes. Create one in Academy first.</p>}
        {courses.map((c) => {
          const url = c.join_code ? `${origin}/join/${c.join_code}` : '';
          return (
            <div key={c.id} className="border rounded p-3">
              <div className="font-semibold text-sm">{c.course_code || c.title}</div>
              {c.title && c.course_code && <div className="text-xs text-muted-foreground">{c.title}</div>}
              {c.join_code ? (
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-3 h-3 text-primary" />
                    <span className="font-mono font-bold text-base">{c.join_code}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs flex-1 min-w-0">
                    <Button variant="ghost" size="sm" onClick={() => copy(url)}><Copy className="w-3 h-3 mr-1" /> Copy URL</Button>
                    <Button variant="ghost" size="sm" onClick={() => copy(c.join_code!)}><Copy className="w-3 h-3 mr-1" /> Copy code</Button>
                    <Button variant="ghost" size="sm" onClick={() => generate(c.id)}><RefreshCw className="w-3 h-3 mr-1" /> Regenerate</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => generate(c.id)}>
                  <Hash className="w-3 h-3 mr-1" /> Generate code
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // skip ambiguous I, O, 0, 1
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
