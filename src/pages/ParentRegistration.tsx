// Public parent registration form. Parent enters their own name/email/
// password plus THEIR CHILD'S email; supabase.auth.signUp fires the
// on_auth_user_created_parent trigger, which looks up the student in
// this tenant and either creates a verified link (email matched a
// tenant profile) or a pending link (no match — an admin can resolve
// it later from the Parents panel). Either way the parent's account is
// real and, once they confirm email, they'll appear in the "Parents
// only" recipient list on every composer.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { tenantAuthGradient, tenantButtonGradient } from '@/lib/tenantGradient';
import { useIsPortrait } from '@/hooks/use-mobile';

export default function ParentRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings: branding } = useBrandingSettings();
  const isPortrait = useIsPortrait();

  const authImageUrl =
    (isPortrait && branding.auth_background_mobile_url) || branding.auth_background_url;
  const hasAuthImage = !!authImageUrl;
  const authBackgroundStyle: React.CSSProperties = hasAuthImage
    ? {
        backgroundImage: `url(${authImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#0a0518',
      }
    : { background: tenantAuthGradient(branding.primary_color) };
  const buttonGradient = tenantButtonGradient(branding.primary_color);
  const orgName = branding.short_name || branding.org_name || 'this ensemble';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim() || !email.trim() || !password || !studentEmail.trim()) {
      toast({ title: 'Missing info', description: 'Please fill out every field.', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // The trigger uses raw_user_meta_data to detect a parent signup and
      // do the child lookup; we mirror the standard signup metadata
      // (full_name, tenant_slug) so downstream tools that read those
      // keys still work, and add requested_role + student_email.
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: name.trim(),
            tenant_slug: getTenantSlug(),
            requested_role: 'parent',
            student_email: studentEmail.trim().toLowerCase(),
          },
        },
      });
      if (error) throw error;
      if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: 'Almost there',
          description: `Check your email for a confirmation link. We're linking you to ${studentEmail.trim()} — if that email isn't a student here, an admin at ${orgName} will follow up.`,
        });
      } else {
        toast({
          title: 'Parent account created',
          description: `You'll receive messages from ${orgName} intended for parents.`,
        });
      }
      navigate('/auth?mode=signin', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create your account.';
      toast({ title: 'Sign-up failed', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={authBackgroundStyle}>
        <div className="w-full max-w-md bg-card/95 backdrop-blur rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-1">
              <UserPlus className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Parent sign-up</h1>
            <p className="text-sm text-muted-foreground">
              Register so {orgName} can reach you with updates about your child.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pr-name">Your name</Label>
              <Input id="pr-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-email">Your email</Label>
              <Input id="pr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-password">Password</Label>
              <div className="relative">
                <Input
                  id="pr-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-student-email">Your child's email</Label>
              <Input
                id="pr-student-email"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="student@school.edu"
                required
              />
              <p className="text-xs text-muted-foreground">
                We use this to connect you to your child's profile. If we can't find them, we'll ask an admin to help.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting} style={{ background: buttonGradient }}>
              {submitting ? 'Creating account…' : 'Create parent account'}
            </Button>
          </form>

          <div className="flex items-center justify-between text-sm">
            <Link to="/auth?mode=signin" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
            <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
