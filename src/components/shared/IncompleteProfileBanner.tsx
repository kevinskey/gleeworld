import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, User } from "lucide-react";

interface IncompleteProfileBannerProps {
  userProfile: any;
}

export const IncompleteProfileBanner = ({ userProfile }: IncompleteProfileBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('profile-banner-dismissed') === 'true';
  });
  const navigate = useNavigate();

  // Don't show banner if profile is still loading
  if (!userProfile) {
    return null;
  }

  // Don't show banner for admins, super-admins, or executive board members
  if (userProfile?.is_admin || userProfile?.is_super_admin || userProfile?.is_exec_board) {
    return null;
  }

  // Role-specific profile requirements
  const isNameComplete = !!(userProfile?.first_name && userProfile?.last_name) || !!userProfile?.full_name;
  const hasBasicInfo = isNameComplete && !!userProfile?.email;

  // Only require measurements for members and auditioners
  const requiresMeasurements = userProfile?.role === 'member' || userProfile?.role === 'auditioner';
  
  let isProfileIncomplete = false;

  if (!hasBasicInfo) {
    isProfileIncomplete = true;
  } else if (requiresMeasurements) {
    // Check measurements only for roles that need them
    const hasMeasurements = !!(
      userProfile?.measurements?.height_feet &&
      userProfile?.measurements?.height_inches &&
      userProfile?.measurements?.chest &&
      userProfile?.measurements?.waist &&
      userProfile?.measurements?.hips &&
      userProfile?.measurements?.shoe_size
    );
    
    const hasConsents = !!(userProfile?.photo_consent && userProfile?.media_release_signed_at);
    
    isProfileIncomplete = !hasMeasurements || !hasConsents;
  }

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
            onClick={() => {
              setIsDismissed(true);
              localStorage.setItem('profile-banner-dismissed', 'true');
            }}
            className="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};