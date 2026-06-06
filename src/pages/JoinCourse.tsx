// /join/:code — public page. Looks up the course by join_code, shows the
// student a signup form, then calls gw-invite-student to create their account
// and auto-enroll them. After signup they're emailed a magic link.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function JoinCourse() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useBrandingSettings();
  const orgName = settings?.organization_name || settings?.short_name || 'this program';

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['join-course', code],
    queryFn: async () => {
      if (!code) return null;
      const { data, error } = await supabase
        .from('gw_courses')
        .select('id, course_code, title, instructor_name, semester')
        .eq('join_code', code.toUpperCase())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!code,
  });

  async function submit() {
    if (!course || !email.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('gw-invite-student', {
        body: {
          email: email.trim(),
          fullName: fullName.trim() || undefined,
          courseId: course.id,
          appOrigin: window.location.origin,
          orgName,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      toast({ title: 'Could not finish signup', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" /> Invalid code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              We couldn't find a class with code <code className="bg-muted px-1 rounded">{code}</code>. Double-check the code your director gave you.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>Back to home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" /> Join {course.course_code || course.title}
          </CardTitle>
          {course.title && course.course_code && (
            <p className="text-sm text-muted-foreground">{course.title}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {course.instructor_name && <>Instructor: {course.instructor_name} · </>}
            {course.semester}
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <h3 className="font-semibold">Check your email</h3>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <span className="font-medium">{email}</span>. Click it to enter your account — no password needed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Enter your email and we'll send you a one-tap sign-in link. You'll be enrolled in this class automatically.</p>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" autoFocus />
              </div>
              <div>
                <Label className="text-xs">Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Maya Johnson" />
              </div>
              <Button onClick={submit} disabled={submitting || !email.trim()} className="w-full">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Join the class
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
