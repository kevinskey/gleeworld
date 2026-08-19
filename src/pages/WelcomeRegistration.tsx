import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, GraduationCap } from "lucide-react";

// Minimal invited-student registration: name + phone (email is the login
// identity, shown read-only). Invite emails point here instead of the full
// 5-step /onboarding stepper; the complete profile happens later as a class
// assignment. See docs/superpowers/specs/2026-08-11-welcome-registration-design.md.

const welcomeSchema = z.object({
  full_name: z.string().trim().min(1, "Your name is required"),
  phone_number: z
    .string()
    .min(7, "Phone number is required")
    .regex(/^[+()\-\s\d]{7,20}$/, "Enter a valid phone number"),
});

type WelcomeFormData = z.infer<typeof welcomeSchema>;

// Only follow same-app paths so ?next= can't bounce students off-site.
export function sanitizeNextPath(raw: string | null): string {
  if (!raw) return "/academy";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/academy";
  return raw;
}

// handle_new_user_profile derives a full_name from the email local part
// ("jane.doe@x.org" → "Jane Doe") when the invite carries no name, so a
// profile is never truly nameless. Don't prefill that guess — an empty
// field makes the student type their real name.
export function isPlaceholderName(fullName: string | null | undefined, email: string | null | undefined): boolean {
  if (!fullName) return true;
  if (!email) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return norm(fullName) === norm(email.split("@")[0] ?? "");
}

export default function WelcomeRegistration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  const next = sanitizeNextPath(searchParams.get("next"));
  const email = user?.email ?? "";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WelcomeFormData>({
    resolver: zodResolver(welcomeSchema),
    defaultValues: { full_name: "", phone_number: "" },
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("gw_profiles")
        .select("full_name, phone, phone_number")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      // Already registered here once — go straight to class.
      if (data?.phone_number || data?.phone) {
        navigate(next, { replace: true });
        return;
      }
      if (data?.full_name && !isPlaceholderName(data.full_name, user.email)) {
        setValue("full_name", data.full_name);
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, next, navigate, setValue]);

  const onSubmit = async (data: WelcomeFormData) => {
    if (!user) return;
    setSaving(true);
    try {
      const fullName = data.full_name.trim();
      const [firstName, ...rest] = fullName.split(/\s+/);
      const phone = data.phone_number.trim();
      const fields = {
        full_name: fullName,
        first_name: firstName,
        last_name: rest.join(" ") || null,
        // Two legacy phone columns exist; existing forms disagree on which
        // to write, so write both.
        phone,
        phone_number: phone,
        updated_at: new Date().toISOString(),
      };
      const { data: updated, error } = await supabase
        .from("gw_profiles")
        .update(fields)
        .eq("user_id", user.id)
        .select("id");
      if (error) throw error;
      if (!updated || updated.length === 0) {
        const { error: insertErr } = await supabase
          .from("gw_profiles")
          .insert({ user_id: user.id, email, ...fields });
        if (insertErr) throw insertErr;
      }
      navigate(next, { replace: true });
    } catch (err) {
      console.error("Welcome registration failed:", err);
      toast({
        title: "Couldn't save",
        description: "Something went wrong saving your info. Please try again.",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--tint)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-[var(--tint)] text-[var(--tint-contrast)] flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <CardTitle>Welcome! You're almost in.</CardTitle>
          <CardDescription>
            Tell us who you are and we'll take you to your class. You can fill
            out the rest of your profile later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                autoComplete="name"
                placeholder="Your first and last name"
                {...register("full_name")}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone_number">Phone number</Label>
              <Input
                id="phone_number"
                type="tel"
                autoComplete="tel"
                placeholder="(555) 555-5555"
                {...register("phone_number")}
              />
              {errors.phone_number && (
                <p className="text-xs text-destructive">{errors.phone_number.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} readOnly disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                This is the email your invitation was sent to — it's how you sign in.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : null}
              Continue to class
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
