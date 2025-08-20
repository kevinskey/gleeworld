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

  // Check if profile is incomplete
  const isProfileIncomplete = !userProfile?.first_name || 
                             !userProfile?.last_name || 
                             !userProfile?.phone || 
                             !userProfile?.address;

  // Don't show if profile is complete or banner is dismissed
  if (!isProfileIncomplete || isDismissed) {
    return null;
  }

  const handleCompleteProfile = () => {
    navigate('/onboarding');
  };

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <User className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-800 dark:text-amber-200">
          Your profile is incomplete. Complete your onboarding to access all features.
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCompleteProfile}
            className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
          >
            Complete Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};