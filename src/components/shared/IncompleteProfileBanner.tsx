import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, User } from "lucide-react";

interface IncompleteProfileBannerProps {
  userProfile: any;
}

export const IncompleteProfileBanner = ({ userProfile }: IncompleteProfileBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  // Debug: Log the profile data to see what's missing
  console.log('IncompleteProfileBanner - userProfile:', userProfile);
  console.log('IncompleteProfileBanner - measurements:', userProfile?.measurements);
  
  // Check if profile is incomplete based on onboarding requirements
  const profileChecks = {
    first_name: !!userProfile?.first_name,
    last_name: !!userProfile?.last_name,
    email: !!userProfile?.email,
    height_feet: !!userProfile?.measurements?.height_feet,
    height_inches: !!userProfile?.measurements?.height_inches,
    chest: !!userProfile?.measurements?.chest,
    waist: !!userProfile?.measurements?.waist,
    hips: !!userProfile?.measurements?.hips,
    shoe_size: !!userProfile?.measurements?.shoe_size,
    photo_consent: !!userProfile?.photo_consent,
    media_release_signed_at: !!userProfile?.media_release_signed_at,
  };
  
  console.log('IncompleteProfileBanner - profile checks:', profileChecks);
  
  const isProfileIncomplete = !userProfile?.first_name || 
                             !userProfile?.last_name || 
                             !userProfile?.email ||
                             !userProfile?.measurements?.height_feet ||
                             !userProfile?.measurements?.height_inches ||
                             !userProfile?.measurements?.chest ||
                             !userProfile?.measurements?.waist ||
                             !userProfile?.measurements?.hips ||
                             !userProfile?.measurements?.shoe_size ||
                             !userProfile?.photo_consent ||
                             !userProfile?.media_release_signed_at;

  console.log('IncompleteProfileBanner - isProfileIncomplete:', isProfileIncomplete);

  // Don't show if profile is complete or banner is dismissed
  if (!isProfileIncomplete || isDismissed) {
    return null;
  }

  const handleCompleteProfile = () => {
    navigate('/onboarding');
  };

  return (
    <Alert className="mb-6 border-border bg-background dark:border-border dark:bg-background">
      <User className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-foreground dark:text-foreground">
          Your profile is incomplete. Complete your onboarding to access all features.
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCompleteProfile}
            className="border-border text-foreground hover:bg-muted dark:border-border dark:text-foreground dark:hover:bg-muted"
          >
            Complete Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};