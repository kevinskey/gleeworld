import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { useToast } from '@/hooks/use-toast';

import { AccountGate } from '@/components/onboarding/AccountGate';
import { OnboardingStepper } from '@/components/onboarding/OnboardingStepper';
import { OnboardingHero } from '@/components/onboarding/OnboardingHero';
import { ProfileForm } from '@/components/onboarding/ProfileForm';
import { UniformMediaForm } from '@/components/onboarding/UniformMediaForm';
import { AgreementsForm } from '@/components/onboarding/AgreementsForm';
import { ReviewCard } from '@/components/onboarding/ReviewCard';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

export const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading, saving, updateField, updateFields, getStepCompletion } = useOnboardingProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(0); // Start at 0 for hero slide
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Determine which step to show based on auth status and profile completion
  useEffect(() => {
    if (authLoading || loading) return;

    if (!user) {
      setCurrentStep(0); // Start with hero slide for unauthenticated users
      return;
    }

    // User is authenticated, check profile completion
    const completion = getStepCompletion();
    const newCompletedSteps: number[] = [0, 1]; // Hero and Account completed if authenticated

    if (completion.profile) newCompletedSteps.push(2);
    if (completion.uniform) newCompletedSteps.push(3);
    if (completion.agreements) newCompletedSteps.push(4);

    setCompletedSteps(newCompletedSteps);

    // Set current step to first incomplete step, or review if all complete
    if (!completion.profile && currentStep <= 1) {
      setCurrentStep(2);
    } else if (!completion.uniform && completion.profile && currentStep <= 2) {
      setCurrentStep(3);
    } else if (!completion.agreements && completion.profile && completion.uniform && currentStep <= 3) {
      setCurrentStep(4);
    } else if (completion.profile && completion.uniform && completion.agreements && currentStep <= 4) {
      setCurrentStep(5);
    }
  }, [user, authLoading, loading, getStepCompletion, currentStep]);

  const handleGetStarted = () => {
    setCurrentStep(1); // Move to authentication
  };

  const handleAuthenticated = () => {
    setCurrentStep(2);
    setCompletedSteps([0, 1]);
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsCompleted(true);
    
    toast({
      title: "Onboarding Complete!",
      description: "Welcome to the Spelman College Glee Club family!",
    });

    // Redirect after a short delay
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  const canProceedToNext = () => {
    const completion = getStepCompletion();
    
    switch (currentStep) {
      case 0: // Hero step
        return true;
      case 1: // Account step
        return !!user;
      case 2: // Profile step
        return completion.profile;
      case 3: // Uniform step
        return completion.uniform;
      case 4: // Agreements step
        return completion.agreements;
      default:
        return false;
    }
  };

  // Show loading while determining auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Show completion screen
  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-muted/30 p-4">
        <div className="text-center space-y-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <div>
            <h1 className="text-3xl font-bold">Welcome to GleeWorld!</h1>
            <p className="text-muted-foreground mt-2">
              Your onboarding is complete. Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show hero slide first for unauthenticated users
  if (currentStep === 0 && !user) {
    return <OnboardingHero onGetStarted={handleGetStarted} />;
  }

  // Show account gate if not authenticated and past hero
  if (!user && currentStep > 0) {
    return <AccountGate onAuthenticated={handleAuthenticated} />;
  }

  // Show loading while fetching profile
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <div className="container max-w-4xl mx-auto p-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">GleeWorld Onboarding</h1>
          <p className="text-muted-foreground mt-2">
            Complete your profile to join the Spelman College Glee Club
          </p>
        </div>

        {/* Stepper */}
        <OnboardingStepper currentStep={currentStep} completedSteps={completedSteps} />

        {/* Step Content */}
        <div className="mt-8">
          {currentStep === 2 && (
            <ProfileForm 
              profile={profile} 
              onUpdate={updateField}
              saving={saving}
            />
          )}
          
          {currentStep === 3 && (
            <UniformMediaForm 
              profile={profile} 
              onUpdate={updateField}
              saving={saving}
            />
          )}
          
          {currentStep === 4 && (
            <AgreementsForm 
              profile={profile} 
              onUpdate={updateField}
              saving={saving}
            />
          )}
          
          {currentStep === 5 && (
            <ReviewCard 
              profile={profile} 
              onComplete={handleComplete}
              saving={saving}
            />
          )}
        </div>

        {/* Navigation */}
        {currentStep > 1 && currentStep < 5 && (
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep <= 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceedToNext() || currentStep >= 5}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground mt-12">
          <p>Questions? Contact us at info@gleeworld.org</p>
        </div>
      </div>
    </div>
  );
};