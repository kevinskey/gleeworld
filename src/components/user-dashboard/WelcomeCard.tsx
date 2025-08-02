import { format } from "date-fns";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useState, useMemo } from "react";
import { BellDot } from "lucide-react";
import { useUserDashboardContext } from "@/contexts/UserDashboardContext";

interface WelcomeCardProps {
  displayName: string;
  profile: {
    exec_board_role?: string | null;
    voice_part?: string | null;
    role?: string;
    created_at?: string;
    class_year?: number;
  } | null;
}

export const WelcomeCard = ({ displayName, profile }: WelcomeCardProps) => {
  const { getSettingByName } = useDashboardSettings();
  const welcomeCardSetting = getSettingByName('welcome_card_background');
  const [imageError, setImageError] = useState(false);
  const { dashboardData } = useUserDashboardContext();

  const getUserTitle = () => {
    // Check for executive board role first
    if (profile?.exec_board_role) {
      return profile.exec_board_role.charAt(0).toUpperCase() + profile.exec_board_role.slice(1);
    }
    
    const role = profile?.role;
    switch (role) {
      case 'super-admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'executive':
        return 'Executive Board';
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
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-lg min-h-[700px] flex items-center">
      {/* Background Image Layer */}
      {hasBackgroundImage && (
        <>
          <div 
            className="absolute inset-0 bg-no-repeat"
            style={{
              backgroundImage: `url("${welcomeCardSetting?.image_url}")`,
              backgroundAttachment: 'scroll',
              backgroundSize: '100% 200%', // Make image 100% larger to crop much more from top
              backgroundPosition: 'center calc(100% + 120px)' // Keep bottom anchored
            }}
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
          ? 'bg-black/50 sm:bg-black/40 md:bg-black/30' 
          : 'bg-gradient-to-r from-spelman-blue-dark via-spelman-blue-light to-spelman-blue-dark'
        }`}
      />
      
      {/* Content Layer */}
      <div className="relative z-10 text-center w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome text positioned at center bottom */}
        <div className="absolute bottom-16 left-0 right-0 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-dancing font-bold text-white drop-shadow-lg leading-tight">
            Welcome back {displayName}!
          </h1>
        </div>
      </div>
      
      {/* Role badge positioned at bottom right */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
          <p className="text-white text-xs sm:text-sm font-medium drop-shadow">
            {getUserTitle()} • Class of {profile?.class_year || 'Unknown'}
          </p>
        </div>
      </div>
      {/* GLEE 100 emblem positioned at bottom left */}
      <div className="absolute bottom-4 left-4 z-20">
        <img 
          src="/lovable-uploads/8775a40d-2f4b-486a-b712-f11a753ba969.png"
          alt="GLEE 100 Anniversary Emblem"
          className="w-8 h-10 sm:w-9 sm:h-12 md:w-10 md:h-14 drop-shadow-lg opacity-90 hover:opacity-100 transition-opacity"
          style={{ filter: 'brightness(0) saturate(100%) invert(1)' }}
        />
      </div>
      
      {/* Notification Music Note */}
      {dashboardData?.unread_notifications > 0 && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
          <BellDot 
            className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-lg animate-pulse" 
          />
        </div>
      )}
    </div>
  );
};