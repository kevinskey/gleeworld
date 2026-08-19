import { useState } from "react";
import { parse, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Mic, ArrowLeft, ArrowRight } from "lucide-react";
import { CongratulationsDialog } from "@/components/audition/CongratulationsDialog";
import {
  AuditionFormProvider,
  useAuditionForm,
  AuditionFormData,
  clearAuditionDraft,
} from "@/components/audition/AuditionFormProvider";
import type { AuditionPageId } from "@/components/audition/auditionPages";
import { AuditionFormProgress } from "@/components/audition/AuditionFormProgress";
import { RegistrationPage } from "@/components/audition/pages/RegistrationPage";
import { BasicInfoPage } from "@/components/audition/pages/BasicInfoPage";
import { MusicalBackgroundPage } from "@/components/audition/pages/MusicalBackgroundPage";
import { MusicSkillsPage } from "@/components/audition/pages/MusicSkillsPage";
import { PersonalInfoPage } from "@/components/audition/pages/PersonalInfoPage";
import { SchedulingAndSelfiePage } from "@/components/audition/pages/SchedulingAndSelfiePage";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { sendAuditionConfirmationEmail } from "@/utils/sendAuditionConfirmationEmail";
import { logActivity } from "@/utils/activityLogger";
import { getOrgName } from "@/lib/orgName";
import { submitPublicIntake, type PublicIntakeResult } from "@/lib/publicIntakeClient";

// tsconfig here has strictNullChecks: false, under which plain `if (!result.ok)
// { ...; return; }` does NOT narrow the discriminated union for the rest of
// the function — TS keeps the widened type and typecheck:guard fails on
// `.message` (see the identical note in PublicBookingPage.tsx, which hit the
// same trap first). A user-defined type predicate narrows correctly even
// under that config.
function isIntakeFailure(
  r: PublicIntakeResult,
): r is Extract<PublicIntakeResult, { ok: false }> {
  return r.ok === false;
}

const PAGE_COMPONENTS: Record<AuditionPageId, () => JSX.Element> = {
  basic: () => <BasicInfoPage />,
  background: () => <MusicalBackgroundPage />,
  skills: () => <MusicSkillsPage />,
  personal: () => <PersonalInfoPage />,
  scheduling: () => <SchedulingAndSelfiePage />,
  account: () => <RegistrationPage />,
};

function AuditionFormContent() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'created' | 'existing'>('created');
  const {
    form,
    currentPage,
    currentPageId,
    totalPages,
    capturedImage,
    nextPage,
    previousPage,
    canProceed
  } = useAuditionForm();

  // Signed-in users have no account step and therefore no password on the
  // form — the server's 8-character rule would reject them. This remains
  // their write path, unchanged from before this feature: a direct,
  // idempotent insert/update against audition_applications.
  const submitAsAuthenticatedUser = async (submissionData: Record<string, any>) => {
    if (!user) return;

    const capitalizeNames = (name: string) => {
      return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    // First get an active audition session
    const { data: activeSessions, error: sessionError } = await supabase
      .from('audition_sessions')
      .select('id')
      .eq('is_active', true)
      .limit(1);

    if (sessionError || !activeSessions || activeSessions.length === 0) {
      throw new Error('No active audition session found. Please contact administration.');
    }

    const firstNameResolved = capitalizeNames(
      form.getValues('firstName') || (user as any)?.user_metadata?.full_name?.split(' ')?.[0] || (user.email?.split('@')[0] ?? 'Auditioner')
    );

    const fullSubmissionData: Record<string, any> = {
      ...submissionData,
      user_id: user.id,
      session_id: activeSessions[0].id,
    };

    // Idempotent save: update if already exists for this user/session, else insert
    let dbError: any = null;

    const { data: existingApp, error: lookupError } = await supabase
      .from('audition_applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('session_id', activeSessions[0].id)
      .maybeSingle();

    if (lookupError && (lookupError as any).code && (lookupError as any).code !== 'PGRST116') {
      console.warn('Lookup warning (continuing):', lookupError);
    }

    // Prepare a minimal safe payload in case stricter fields trigger policies
    const minimalData: any = {
      user_id: user.id,
      session_id: activeSessions[0].id,
      full_name: fullSubmissionData.full_name,
      email: fullSubmissionData.email,
      audition_time_slot: fullSubmissionData.audition_time_slot,
      status: 'submitted'
    };

    if (existingApp?.id) {
      const updateData = { ...fullSubmissionData };
      delete (updateData as any).user_id;
      delete (updateData as any).session_id;

      const { error: updErr } = await supabase
        .from('audition_applications')
        .update(updateData)
        .eq('id', existingApp.id);

      if (updErr) {
        const msg = (updErr.message || '').toLowerCase();
        const looksPrivilege = msg.includes('privilege') || msg.includes('policy') || msg.includes('cannot modify your own privileges');

        if (looksPrivilege) {
          // Fallback: update only minimal, non-privileged fields
          const { error: updMinimalErr } = await supabase
            .from('audition_applications')
            .update({
              full_name: minimalData.full_name,
              email: minimalData.email,
              audition_time_slot: minimalData.audition_time_slot,
              status: minimalData.status,
            })
            .eq('id', existingApp.id);
          dbError = updMinimalErr ?? null;
        } else {
          dbError = updErr;
        }
      }
    } else {
      const { error: insErr } = await supabase
        .from('audition_applications')
        .insert(fullSubmissionData);

      if (insErr) {
        const msg = (insErr.message || '').toLowerCase();
        const looksPrivilege = msg.includes('privilege') || msg.includes('policy') || msg.includes('cannot modify your own privileges');
        if (looksPrivilege) {
          // Fallback: insert a minimal, policy-friendly record
          const { error: insMinimalErr } = await supabase
            .from('audition_applications')
            .insert(minimalData);
          dbError = insMinimalErr ?? null;
        } else {
          dbError = insErr;
        }
      }
    }

    if (dbError) {
      throw dbError;
    }

    // Send email confirmation to auditioner
    try {
      const sendResult = await sendAuditionConfirmationEmail({
        applicationId: existingApp?.id || 'new-application',
        applicantName: `${firstNameResolved} ${capitalizeNames(form.getValues('lastName'))}`,
        applicantEmail: form.getValues('email'),
        auditionDate: format(form.getValues('auditionDate'), 'yyyy-MM-dd'),
        auditionTime: form.getValues('auditionTime'),
        // No location data source exists: audition_sessions has no location
        // column (see migration 20250804132905), so there is nothing
        // tenant-real to put here. auditionLocation is optional on both the
        // client type and the edge function request body — omitting it is
        // the correct behavior, not a placeholder.
      });
      if (!sendResult?.success) {
        console.warn('Email not sent or suppressed:', sendResult);
      }
    } catch (emailError) {
      console.error('❌ Email error:', emailError);
      // Don't fail the whole process if email fails
    }

    form.reset();
    setShowCongratulations(true);
  };

  const onSubmit = async (data: AuditionFormData) => {
    if (!capturedImage) {
      toast.error("Please take a selfie before submitting");
      return;
    }

    // Require date and time selection
    if (!data.auditionDate || !data.auditionTime) {
      toast.error("Please select an audition date and time");
      return;
    }

    setIsSubmitting(true);

    try {
      // Capitalize names before submission
      const capitalizeNames = (name: string) => {
        return name
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };

      // Parse the selected time like "3:30 PM" onto the selected date
      const timeParsed = parse(data.auditionTime, 'h:mm a', data.auditionDate);
      if (isNaN(timeParsed.getTime())) {
        throw new Error('Invalid time value');
      }


      // Note: user_id and session_id are intentionally NOT included here.
      // For the anonymous path (submitPublicIntake below) the edge function
      // supplies both server-side — a client-supplied user_id would let
      // anyone file an application against another person's account. For
      // the authenticated path, submitAsAuthenticatedUser adds them back.
      const submissionData: Record<string, unknown> = {
        full_name: `${capitalizeNames(data.firstName)} ${capitalizeNames(data.lastName)}`,
        email: data.email,
        phone_number: data.phone,
        profile_image_url: capturedImage,
        // The middle/high-school questions were removed from the form, so
        // neither of these has a source any more. Left unset rather than
        // defaulted: recording 'No previous experience' for every auditioner
        // because we stopped asking would be worse than recording nothing,
        // and voice_part_preference came from the high-school section answer.
        years_of_vocal_training: data.isSoloist ? 1 : 0,
        instruments_played: (data.playsInstrument || data.sectionType === 'instrumental') && data.instrumentDetails
          ? [data.instrumentDetails]
          : [],
        music_theory_background: data.readsMusic ? 'Basic' : 'None',
        // Optional now, so it can arrive undefined. Empty string rather than
        // null, because this column's nullability is not guaranteed.
        why_glee_club: data.personalityDescription ?? '',
        vocal_goals: data.additionalInfo || 'General vocal improvement',
        audition_time_slot: timeParsed.toISOString(),
        status: 'submitted',
        // Audition form extensions (20260621230000_audition_extended_fields):
        section_type: data.sectionType ?? null,
        years_instrument_experience: typeof data.yearsInstrumentExperience === 'number'
          ? data.yearsInstrumentExperience
          : null,
        can_dance: typeof data.canDance === 'boolean' ? data.canDance : null,
        tshirt_size: data.tshirtSize ?? null,
      };

      // Only include sight_reading_level if it matches allowed values
      const allowedSight = ['beginner', 'intermediate', 'advanced'];
      const candidateSight = null as string | null; // currently no field in UI; keep null
      if (candidateSight && allowedSight.includes(candidateSight)) {
        submissionData.sight_reading_level = candidateSight;
      }

      if (user) {
        await submitAsAuthenticatedUser(submissionData);
        return;
      }

      // Anonymous visitor — the case this feature exists for. The account
      // is created (or matched to an existing one) and the application is
      // written server-side, in the same request, with no client session
      // required.
      const result = await submitPublicIntake({
        kind: 'audition',
        account: {
          email: data.email,
          password: data.password ?? '',
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
        payload: { application: submissionData },
      });

      if (isIntakeFailure(result)) {
        toast.error(result.message);
        return;
      }

      clearAuditionDraft();
      setAccountStatus(result.accountStatus === 'existing' ? 'existing' : 'created');
      setShowCongratulations(true);
    } catch (error: unknown) {
      // Narrowed once: supabase-js, our own throws and the intake client all
      // land here, and none of them guarantee an Error instance.
      const errMessage = error instanceof Error ? error.message : String(error);
      // PostgREST errors carry code/details/hint; only an Error carries a
      // stack. Narrow the whole shape once rather than asserting field by
      // field — these four are all the diagnostics log reads.
      const errShape = (error ?? {}) as {
        code?: string; details?: string; hint?: string;
      };
      const errStack = error instanceof Error ? error.stack : undefined;
      console.error('💥 Detailed error:', {
        message: errMessage,
        details: errShape.details,
        hint: errShape.hint,
        code: errShape.code,
        stack: errStack
      });
      // Non-blocking activity log for diagnostics
      try {
        await logActivity({
          actionType: 'audition_application_failed',
          resourceType: 'audition',
          details: {
            message: errMessage,
            code: errShape.code,
            details: errShape.details,
            hint: errShape.hint
          }
        });
      } catch {}
      toast.error(`Failed to submit: ${errMessage || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCurrentPage = () => PAGE_COMPONENTS[currentPageId]();

  // Allow access for both authenticated and non-authenticated users

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pb-24 md:pb-8">
      <div className="container mx-auto px-2 md:px-6 max-w-2xl lg:max-w-3xl">
        <div className="text-center mb-2 md:mb-8 pt-4 md:pt-8">
          <Mic className="w-8 h-8 md:w-16 md:h-16 mx-auto text-purple-600 mb-2 md:mb-4" />
          <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 md:mb-3">Audition Application</h1>
          <p className="text-sm md:text-xl lg:text-2xl text-gray-600">Join the {getOrgName()} Family</p>
        </div>

        <AuditionFormProgress />

        <Card className="bg-white/80 backdrop-blur-md border-white/30 shadow-xl mb-2 md:mb-0">
          <CardContent className="pt-3 md:pt-8 px-3 md:px-8 pb-3 md:pb-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 md:space-y-8">
                <div className="text-sm md:text-lg lg:text-xl">
                  {renderCurrentPage()}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Fixed bottom navigation for mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden z-40">
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={previousPage}
              disabled={currentPage === 1}
              className="flex items-center gap-2 flex-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentPage < totalPages ? (
              <Button
                type="button"
                onClick={nextPage}
                disabled={!canProceed()}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 flex-1"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                type="button"
                onClick={async () => {
                  await onSubmit(form.getValues());
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                disabled={isSubmitting || !canProceed()}
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            )}
          </div>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:block mt-6">
          <Card className="bg-white/80 backdrop-blur-md border-white/30 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={previousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>

                {currentPage < totalPages ? (
                  <Button
                    type="button"
                    onClick={nextPage}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={async () => {
                      await onSubmit(form.getValues());
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={isSubmitting || !canProceed()}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <CongratulationsDialog
        open={showCongratulations}
        onOpenChange={setShowCongratulations}
        accountStatus={accountStatus}
      />
    </div>
  );
}

export default function AuditionPage() {
  return (
    <PublicLayout>
      <AuditionFormProvider>
        <AuditionFormContent />
      </AuditionFormProvider>
    </PublicLayout>
  );
}