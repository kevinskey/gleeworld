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
  } | null;
}

export const WelcomeCard = ({ displayName, profile }: WelcomeCardProps) => {
  // Use the same historic campus background as Executive Board Dashboard
  const historicCampusImage = "/lovable-uploads/7f76a692-7ffc-414c-af69-fc6585338524.png";
  const [imageError, setImageError] = useState(false);
  const { dashboardData } = useUserDashboardContext();

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
      imageUrl: historicCampusImage,
      error: error.currentTarget.src
    });
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('Welcome card image loaded successfully:', historicCampusImage);
    setImageError(false);
  };

  // Memoize values to prevent re-renders causing blinking
  const backgroundStyles = useMemo(() => {
    if (!historicCampusImage || imageError) {
      console.log('No background image or error:', { 
        hasImageUrl: !!historicCampusImage, 
        imageError
      });
      return {};
    }
    
    console.log('Using background image:', historicCampusImage);
    return {
      backgroundImage: `url("${historicCampusImage}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }, [historicCampusImage, imageError]);

  const hasBackgroundImage = Boolean(historicCampusImage && !imageError);

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-lg min-h-[180px] sm:min-h-[220px] md:min-h-[260px] flex items-center">
      {/* Background Image Layer */}
      {hasBackgroundImage && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${historicCampusImage}")`,
              backgroundAttachment: 'scroll' // Better for mobile
            }}
          />
          {/* Hidden img element to detect load errors */}
          <img
            src={historicCampusImage}
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
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-white drop-shadow-lg leading-tight">
          Welcome back {displayName}!
        </h1>
        <p className="text-white/90 text-sm sm:text-base md:text-lg mt-2 sm:mt-3 drop-shadow leading-relaxed">
          {[profile?.exec_board_role, profile?.voice_part].filter(Boolean).join(', ') || getUserTitle()} • Member since {profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'Recently'}
        </p>
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