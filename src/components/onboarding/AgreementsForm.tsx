import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ESignaturePad } from './ESignaturePad';
import { OnboardingProfile } from '@/hooks/useOnboardingProfile';
import { useOnboardingSignature } from '@/hooks/useOnboardingSignature';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AgreementsFormProps {
  profile: OnboardingProfile;
  onUpdate: (field: keyof OnboardingProfile, value: any) => void;
  saving?: boolean;
}

export const AgreementsForm = ({ profile, onUpdate, saving }: AgreementsFormProps) => {
  const { user } = useAuth();
  const { saveSignature, saving: signatureSaving } = useOnboardingSignature();

  const handleSignature = async (signature: string | null) => {
    if (signature && user) {
      try {
        console.log('Saving signature for user:', user.id);
        console.log('User profile name:', `${profile.first_name || ''} ${profile.last_name || ''}`.trim());
        
        // Use name from profile, or fall back to user email
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || user.email || 'Unknown User';
        
        // Save the signature to our onboarding_signatures table
        const signatureId = await saveSignature({
          signatureData: signature,
          fullName: fullName,
          onboardingStep: 'media_release_agreement',
          signatureType: 'digital'
        });
        
        console.log('Signature saved with ID:', signatureId);
        
        toast.success('Signature saved successfully!');
      } catch (error) {
        console.error('Failed to save signature:', error);
        toast.error('Failed to save signature. Please try again.');
        
        // Don't update the profile if saving failed
        return;
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agreements & Consent</CardTitle>
        <CardDescription>
          Please review and agree to the following terms and conditions.
          {(saving || signatureSaving) && <span className="text-muted-foreground text-sm ml-2">Saving...</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Photo Consent */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="photo_consent"
              checked={profile.photo_consent || false}
              onCheckedChange={(checked) => onUpdate('photo_consent', checked)}
            />
            <div className="space-y-2">
              <Label htmlFor="photo_consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Photo & Media Consent
              </Label>
              <p className="text-sm text-muted-foreground">
                I consent to the use of my photograph, image, voice, and/or likeness by the Spelman College Glee Club 
                for promotional, educational, and documentary purposes including but not limited to:
              </p>
              <ul className="text-sm text-muted-foreground ml-4 space-y-1">
                <li>• Social media posts and marketing materials</li>
                <li>• Website and program photos</li>
                <li>• Performance recordings and broadcasts</li>
                <li>• Recruitment and promotional videos</li>
                <li>• Alumni and historical documentation</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                I understand that I will not receive compensation for this usage and that these materials 
                may be used in perpetuity.
              </p>
            </div>
          </div>
        </div>

        {/* Media Release Signature */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Electronic Signature</Label>
            <p className="text-sm text-muted-foreground">
              By signing below, I acknowledge that I have read, understood, and agree to the photo and media consent terms above. 
              I understand that this electronic signature has the same legal effect as a handwritten signature.
            </p>
          </div>

          <ESignaturePad 
            onSignatureChange={handleSignature}
            signature={profile.media_release_signature}
          />

          {profile.media_release_signed_at && (
            <p className="text-sm text-green-600">
              ✓ Signed on {new Date(profile.media_release_signed_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Additional Terms */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Important Notes</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• You can withdraw your consent at any time by contacting the Glee Club administration</li>
            <li>• Withdrawal will not affect materials already published or distributed</li>
            <li>• These agreements are required for participation in Glee Club activities</li>
            <li>• Contact us at info@gleeworld.org for any questions about these terms</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};