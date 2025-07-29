import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Mic, ArrowLeft, ArrowRight } from "lucide-react";
import { Navigate } from "react-router-dom";
import { AuditionFormProvider, useAuditionForm, AuditionFormData } from "@/components/audition/AuditionFormProvider";
import { AuditionFormProgress } from "@/components/audition/AuditionFormProgress";
import { RegistrationPage } from "@/components/audition/pages/RegistrationPage";
import { BasicInfoPage } from "@/components/audition/pages/BasicInfoPage";
import { MusicalBackgroundPage } from "@/components/audition/pages/MusicalBackgroundPage";
import { MusicSkillsPage } from "@/components/audition/pages/MusicSkillsPage";
import { PersonalInfoPage } from "@/components/audition/pages/PersonalInfoPage";
import { SchedulingAndSelfiePage } from "@/components/audition/pages/SchedulingAndSelfiePage";

function AuditionFormContent() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (!user) {
      toast.error("Please log in to submit your audition form");
      return;
    }

    if (!capturedImage) {
      toast.error("Please take a selfie before submitting");
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

      // Save audition data to database - using any type to bypass type check temporarily
      const { error } = await (supabase as any)
        .from('gw_auditions')
        .insert({
          user_id: user.id,
          first_name: capitalizeNames(data.firstName),
          last_name: capitalizeNames(data.lastName),
          email: data.email,
          phone: data.phone,
          sang_in_middle_school: data.sangInMiddleSchool,
          sang_in_high_school: data.sangInHighSchool,
          high_school_years: data.highSchoolYears,
          plays_instrument: data.playsInstrument,
          instrument_details: data.instrumentDetails,
          is_soloist: data.isSoloist,
          soloist_rating: data.soloistRating ? parseInt(data.soloistRating) : null,
          high_school_section: data.highSchoolSection,
          reads_music: data.readsMusic,
          interested_in_voice_lessons: data.interestedInVoiceLessons,
          interested_in_music_fundamentals: data.interestedInMusicFundamentals,
          personality_description: data.personalityDescription,
          interested_in_leadership: data.interestedInLeadership,
          additional_info: data.additionalInfo,
          audition_date: data.auditionDate.toISOString(),
          audition_time: data.auditionTime,
          selfie_url: capturedImage,
        });

      if (error) throw error;

      toast.success("Audition application submitted successfully!");
      form.reset();
      // Reset will be handled by the provider
    } catch (error) {
      console.error('Error submitting audition:', error);
      toast.error("Failed to submit audition application");
    } finally {
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
      <div className="container mx-auto px-4 md:px-6 max-w-2xl lg:max-w-3xl">
        <div className="text-center mb-6 md:mb-8 pt-6 md:pt-8">
          <Mic className="w-12 h-12 md:w-16 md:h-16 mx-auto text-purple-600 mb-3 md:mb-4" />
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 md:mb-3">Audition Application</h1>
          <p className="text-lg md:text-xl lg:text-2xl text-gray-600">Join the Spelman College Glee Club Family</p>
        </div>

        <AuditionFormProgress />

        <Card className="bg-white/80 backdrop-blur-md border-white/30 shadow-xl">
          <CardContent className="pt-6 md:pt-8 px-6 md:px-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
                <div className="text-base md:text-lg lg:text-xl">
                  {renderCurrentPage()}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Fixed bottom navigation for mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 md:hidden">
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
                onClick={form.handleSubmit(onSubmit)}
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
                    onClick={form.handleSubmit(onSubmit)}
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
    </div>
  );
}

export default function AuditionPage() {
  return (
    <AuditionFormProvider>
      <AuditionFormContent />
    </AuditionFormProvider>
  );
}