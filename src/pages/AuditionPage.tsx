import { useState } from "react";
import { parse, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Mic, ArrowLeft, ArrowRight } from "lucide-react";
import { Navigate } from "react-router-dom";
import { CongratulationsDialog } from "@/components/audition/CongratulationsDialog";
import { AuditionFormProvider, useAuditionForm, AuditionFormData } from "@/components/audition/AuditionFormProvider";
import { AuditionFormProgress } from "@/components/audition/AuditionFormProgress";
import { RegistrationPage } from "@/components/audition/pages/RegistrationPage";
import { BasicInfoPage } from "@/components/audition/pages/BasicInfoPage";
import { MusicalBackgroundPage } from "@/components/audition/pages/MusicalBackgroundPage";
import { MusicSkillsPage } from "@/components/audition/pages/MusicSkillsPage";
import { PersonalInfoPage } from "@/components/audition/pages/PersonalInfoPage";
import { SchedulingAndSelfiePage } from "@/components/audition/pages/SchedulingAndSelfiePage";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { sendAuditionEmail } from "@/utils/sendAuditionerPreviewEmail";

function AuditionFormContent() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const { 
    form, 
    currentPage, 
    totalPages, 
    capturedImage, 
    nextPage, 
    previousPage, 
    canProceed 
  } = useAuditionForm();

  const onSubmit = async (data: AuditionFormData) => {
    console.log('🚀 Submit function called with data:', data);
    console.log('👤 Current user:', user);
    console.log('📸 Captured image:', capturedImage);
    
    if (!user) {
      console.log('❌ No user found');
      toast.error("Please log in to submit your audition form");
      return;
    }

    if (!capturedImage) {
      console.log('❌ No captured image');
      toast.error("Please take a selfie before submitting");
      return;
    }
    
    // Require date and time selection
    if (!data.auditionDate || !data.auditionTime) {
      toast.error("Please select an audition date and time");
      return;
    }

    console.log('✅ Starting submission process...');
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

      // Save audition data to database - fix table and field mapping
      console.log('💾 Attempting to save to database...');
      
      // First get an active audition session
      const { data: activeSessions, error: sessionError } = await supabase
        .from('audition_sessions')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (sessionError || !activeSessions || activeSessions.length === 0) {
        throw new Error('No active audition session found. Please contact administration.');
      }
      
      // Parse the selected time like "3:30 PM" onto the selected date
      const timeParsed = parse(data.auditionTime, 'h:mm a', data.auditionDate);
      if (isNaN(timeParsed.getTime())) {
        throw new Error('Invalid time value');
      }
      
      const firstNameResolved = capitalizeNames(
        data.firstName || (user as any)?.user_metadata?.full_name?.split(' ')?.[0] || (user.email?.split('@')[0] ?? 'Auditioner')
      );
      const formattedDate = format(data.auditionDate, 'EEEE, MMMM d, yyyy');
      const formattedTime = `${format(timeParsed, 'h:mm a')} ET`;

      // Normalize values to satisfy DB CHECK constraints
      const rawVoice = (data.highSchoolSection || '').toLowerCase();
      const validVoices = ['soprano', 'alto', 'tenor', 'bass'];
      const voicePart = validVoices.includes(rawVoice) ? rawVoice : null;

      const proposedSight = data.readsMusic ? 'beginner' : null; // conservative default
      const validSightLevels = ['beginner', 'intermediate', 'advanced'];
      const sightReadingLevel = proposedSight && validSightLevels.includes(proposedSight) ? proposedSight : null;
      
      const submissionData = {
        user_id: user.id,
        session_id: activeSessions[0].id,
        full_name: `${capitalizeNames(data.firstName)} ${capitalizeNames(data.lastName)}`,
        email: data.email,
        phone_number: data.phone,
        profile_image_url: capturedImage,
        previous_choir_experience: data.sangInHighSchool ? 'High School Choir' : 'No previous experience',
        voice_part_preference: voicePart,
        years_of_vocal_training: data.isSoloist ? 1 : 0,
        instruments_played: data.playsInstrument && data.instrumentDetails ? [data.instrumentDetails] : [],
        music_theory_background: data.readsMusic ? 'Basic' : 'None',
        sight_reading_level: sightReadingLevel,
        why_glee_club: data.personalityDescription,
        vocal_goals: data.additionalInfo || 'General vocal improvement',
        audition_time_slot: timeParsed.toISOString(),
        status: 'submitted'
      } as const;
      
      console.log('📋 Submission data prepared:', submissionData);
      
      const { error } = await supabase
        .from('audition_applications')
        .insert(submissionData);

      if (error) {
        console.log('❌ Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Successfully saved to database!');
      
      // Send email confirmation to auditioner
      try {
        console.log('📧 Sending confirmation email via utility...');
        const sendResult = await sendAuditionEmail({
          firstName: firstNameResolved,
          lastName: capitalizeNames(data.lastName),
          email: data.email,
          auditionDate: format(data.auditionDate, 'yyyy-MM-dd'),
          auditionTime: data.auditionTime,
          auditionLocation: 'Rockefeller Fine Arts Building Room 109'
        });
        if (!sendResult?.success) {
          console.warn('Email not sent or suppressed:', sendResult);
        } else {
          console.log('✅ Confirmation email sent:', sendResult);
        }
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
        // Don't fail the whole process if email fails
      }
      
      form.reset();
      setShowCongratulations(true);
    } catch (error: any) {
      console.error('💥 Detailed error:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      });
      toast.error(`Failed to submit: ${error?.message || 'Unknown error'}`);
    } finally {
      console.log('🏁 Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const renderCurrentPage = () => {
    if (!user) {
      // Flow for non-authenticated users
      switch (currentPage) {
        case 1:
          return <RegistrationPage />;
        case 2:
          return <BasicInfoPage />;
        case 3:
          return <MusicalBackgroundPage />;
        case 4:
          return <MusicSkillsPage />;
        case 5:
          return <PersonalInfoPage />;
        case 6:
          return <SchedulingAndSelfiePage />;
        default:
          return <RegistrationPage />;
      }
    } else {
      // Flow for authenticated users
      switch (currentPage) {
        case 1:
          return <BasicInfoPage />;
        case 2:
          return <MusicalBackgroundPage />;
        case 3:
          return <MusicSkillsPage />;
        case 4:
          return <PersonalInfoPage />;
        case 5:
          return <SchedulingAndSelfiePage />;
        default:
          return <BasicInfoPage />;
      }
    }
  };

  // Allow access for both authenticated and non-authenticated users

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pb-24 md:pb-8">
      <div className="container mx-auto px-2 md:px-6 max-w-2xl lg:max-w-3xl">
        <div className="text-center mb-2 md:mb-8 pt-4 md:pt-8">
          <Mic className="w-8 h-8 md:w-16 md:h-16 mx-auto text-purple-600 mb-2 md:mb-4" />
          <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 md:mb-3">Audition Application</h1>
          <p className="text-sm md:text-xl lg:text-2xl text-gray-600">Join the Spelman College Glee Club Family</p>
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
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 md:hidden z-40">
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
                  console.log('🔘 MOBILE Submit button clicked directly!');
                  console.log('🔘 isSubmitting:', isSubmitting);
                  console.log('🔘 canProceed():', canProceed());
                  
                  const formData = form.getValues();
                  console.log('🔘 Form data:', formData);
                  
                  await onSubmit(formData);
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
                      console.log('🔘 Submit button clicked directly!');
                      console.log('🔘 isSubmitting:', isSubmitting);
                      console.log('🔘 canProceed():', canProceed());
                      
                      const formData = form.getValues();
                      console.log('🔘 Form data:', formData);
                      
                      await onSubmit(formData);
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