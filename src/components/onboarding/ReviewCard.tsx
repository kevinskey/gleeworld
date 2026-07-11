import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MinusCircle, User, Mail, Phone, Ruler, FileCheck, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnboardingProfile, getOnboardingCompletion } from '@/hooks/useOnboardingProfile';

interface ReviewCardProps {
  profile: OnboardingProfile;
  onComplete: () => void;
  saving?: boolean;
}

export const ReviewCard = ({ profile, onComplete, saving }: ReviewCardProps) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleSubmit = async () => {
    setIsCompleting(true);
    // Add a small delay to show the loading state
    setTimeout(() => {
      onComplete();
      setIsCompleting(false);
    }, 1000);
  };

  // Shared completion policy: only basic profile (name + email) is required;
  // uniform + agreements are optional. Same source the stepper uses, so Review
  // never contradicts the stepper.
  const status = getOnboardingCompletion(profile);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & Submit</CardTitle>
        <CardDescription>
          Please review your information below and submit your onboarding when ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Completion Status */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            Completion Status
            {status.required ? (
              <Badge variant="default" className="bg-green-500">Ready to submit</Badge>
            ) : (
              <Badge variant="secondary">In Progress</Badge>
            )}
          </h3>

          <div className="space-y-2">
            {/* Profile — the only required section */}
            <div className="flex items-center gap-3">
              {status.profile ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm">Profile Information</span>
              {!status.profile && <span className="ml-auto text-xs text-red-500">Required</span>}
            </div>

            {/* Uniform — optional */}
            <div className="flex items-center gap-3">
              {status.uniform ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <MinusCircle className="w-4 h-4 text-slate-300" />
              )}
              <span className="text-sm">Uniform & Measurements</span>
              {!status.uniform && <span className="ml-auto text-xs text-slate-400">Optional</span>}
            </div>

            {/* Agreements — optional */}
            <div className="flex items-center gap-3">
              {status.agreements ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <MinusCircle className="w-4 h-4 text-slate-300" />
              )}
              <span className="text-sm">Agreements & Consent</span>
              {!status.agreements && <span className="ml-auto text-xs text-slate-400">Optional</span>}
            </div>
          </div>
        </div>

        {/* Profile Summary */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile Summary
          </h3>
          
          <div className="flex items-start gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.headshot_url || ''} />
              <AvatarFallback className="text-lg">
                {profile.first_name?.[0] || profile.email?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm flex-1">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">
                  {profile.preferred_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Not provided'}
                </p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Pronouns:</span>
                <p className="font-medium">{profile.pronouns || 'Not provided'}</p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{profile.email || 'Not provided'}</p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-medium">{profile.phone || 'Not provided'}</p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Voice Part:</span>
                <p className="font-medium">{profile.voice_part || 'Not selected'}</p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Graduation Year:</span>
                <p className="font-medium">{profile.graduation_year || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Measurements Summary */}
        {(profile.measurements?.height_feet || profile.measurements?.height_inches || profile.measurements?.chest || profile.measurements?.waist || profile.measurements?.hips || profile.measurements?.shoe_size) && (
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Measurements
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {(profile.measurements?.height_feet || profile.measurements?.height_inches) && (
                <div>
                  <span className="text-muted-foreground">Height:</span>
                  <p className="font-medium">
                    {profile.measurements?.height_feet || 0}'{profile.measurements?.height_inches || 0}"
                  </p>
                </div>
              )}
              
              {profile.measurements?.chest && (
                <div>
                  <span className="text-muted-foreground">Chest:</span>
                  <p className="font-medium">{profile.measurements.chest}"</p>
                </div>
              )}
              
              {profile.measurements?.waist && (
                <div>
                  <span className="text-muted-foreground">Waist:</span>
                  <p className="font-medium">{profile.measurements.waist}"</p>
                </div>
              )}
              
              {profile.measurements?.hips && (
                <div>
                  <span className="text-muted-foreground">Hips:</span>
                  <p className="font-medium">{profile.measurements.hips}"</p>
                </div>
              )}
              
              {profile.measurements?.shoe_size && (
                <div>
                  <span className="text-muted-foreground">Shoe Size:</span>
                  <p className="font-medium">{profile.measurements.shoe_size} US</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agreements Summary */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Agreements
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              {profile.photo_consent ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Photo & Media Consent</span>
            </div>
            
            <div className="flex items-center gap-3">
              {profile.media_release_signed_at ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span>
                Electronic Signature
                {profile.media_release_signed_at && (
                  <span className="text-muted-foreground ml-2">
                    (Signed {new Date(profile.media_release_signed_at).toLocaleDateString()})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!status.required || isCompleting || saving}
            className="w-full"
            size="lg"
          >
            {isCompleting ? (
              'Completing Onboarding...'
            ) : (
              'Complete Onboarding'
            )}
          </Button>

          {!status.required && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Add your name and email to finish. Uniform and agreements are optional.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};