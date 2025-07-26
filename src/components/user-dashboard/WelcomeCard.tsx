import { format } from "date-fns";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useState, useMemo } from "react";
import { BellDot } from "lucide-react";
import { useUserDashboard } from "@/hooks/useUserDashboard";

interface WelcomeCardProps {
  displayName: string;
  profile: {
    exec_board_role?: string | null;
    voice_part?: string | null;
    role?: string;
    created_at?: string;
  } | null;
}

export const WelcomeCard = ({ displayName, profile }: WelcomeCardProps) => {
  const { getSettingByName } = useDashboardSettings();
  const welcomeCardSetting = getSettingByName('welcome_card_background');
  const [imageError, setImageError] = useState(false);
  const { dashboardData } = useUserDashboard();

  const getUserTitle = () => {
    const role = profile?.role;
    switch (role) {
      case 'super-admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'Member';
    }
  };

  // Enhanced error handling with logging
  const handleImageError = (error: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Welcome card image failed to load:', {
      imageUrl: welcomeCardSetting?.image_url,
      error: error.currentTarget.src,
      setting: welcomeCardSetting
    });
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('Welcome card image loaded successfully:', welcomeCardSetting?.image_url);
    setImageError(false);
  };

  // Memoize values to prevent re-renders causing blinking
  const backgroundStyles = useMemo(() => {
    if (!welcomeCardSetting?.image_url || imageError) {
      console.log('No background image or error:', { 
        hasImageUrl: !!welcomeCardSetting?.image_url, 
        imageError,
        setting: welcomeCardSetting
      });
      return {};
    }
    
    console.log('Using background image:', welcomeCardSetting.image_url);
    return {
      backgroundImage: `url("${welcomeCardSetting.image_url}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }, [welcomeCardSetting?.image_url, imageError]);

  const hasBackgroundImage = Boolean(welcomeCardSetting?.image_url && !imageError);

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-lg min-h-[200px] flex items-center">
      {/* Background Image Layer */}
      {hasBackgroundImage && (
        <>
          <div 
            className="absolute inset-0"
            style={backgroundStyles}
          />
          {/* Hidden img element to detect load errors */}
          <img
            src={welcomeCardSetting?.image_url}
            alt=""
            className="hidden"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        </>
      )}
      
      {/* Background Gradient Layer (fallback or overlay) */}
      <div 
        className={`absolute inset-0 ${hasBackgroundImage 
          ? 'bg-black/30' 
          : 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700'
        }`}
      />
      
      {/* Content Layer */}
      <div className="relative z-10 text-center w-full px-6 py-8">
        <h1 className="text-3xl font-medium text-white drop-shadow-lg">
          Welcome back {displayName}!
        </h1>
        <p className="text-white/90 text-base mt-2 drop-shadow">
          {[profile?.exec_board_role, profile?.voice_part].filter(Boolean).join(', ') || getUserTitle()} • Member since {profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'Recently'}
        </p>
      </div>
      
      {/* Notification Music Note */}
      {dashboardData?.unread_notifications > 0 && (
        <div className="absolute top-4 right-4 z-20">
          <BellDot 
            className="w-8 h-8 text-white drop-shadow-lg animate-pulse" 
          />
        </div>
      )}
    </div>
  );
};