import { format } from "date-fns";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useState, useMemo } from "react";
import { BellDot } from "lucide-react";
import { useUserDashboardContext } from "@/contexts/UserDashboardContext";
import { useNavigate } from "react-router-dom";
import festiveBg from "@/assets/gleeworld-festive-background.webp";

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
  const navigate = useNavigate();

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

  // Determine which background to use: admin setting > default festive
  const backgroundImage = useMemo(() => {
    if (welcomeCardSetting?.image_url && !imageError) return welcomeCardSetting.image_url;
    return festiveBg;
  }, [welcomeCardSetting?.image_url, imageError]);

  return (
    <div 
      className="relative rounded-2xl sm:rounded-3xl shadow-lg h-[40vh] flex items-center bg-transparent"
    >

      {/* Transparent background - no overlay */}
      
      {/* Content Layer */}
      <div className="relative z-10 text-center w-full px-4 sm:px-6 py-6 sm:py-8 pb-12 sm:pb-16 md:pb-20">
        {/* Welcome text positioned at center bottom */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-dancing font-bold text-white leading-tight"
              style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8), 0px 0px 6px rgba(0,0,0,0.6)' }}>
            Welcome back {displayName}!
          </h1>
        </div>
      </div>
      
      {/* Role badge positioned at bottom right */}
      <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 z-20">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 sm:px-3 sm:py-1.5 border border-white/20">
          <p className="text-white text-[10px] sm:text-xs md:text-sm font-medium drop-shadow">
            {getUserTitle()} • Class of {profile?.class_year || 'Unknown'}
          </p>
        </div>
      </div>
      {/* GLEE 100 emblem positioned at bottom left */}
      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 z-20">
        <img 
          src="/lovable-uploads/8775a40d-2f4b-486a-b712-f11a753ba969.png"
          alt="GLEE 100 Anniversary Emblem"
          className="w-12 h-15 sm:w-14 sm:h-18 md:w-16 md:h-20 opacity-90 hover:opacity-100 transition-opacity"
          style={{ 
            filter: 'brightness(0) saturate(100%) invert(1) drop-shadow(2px 2px 8px rgba(0,0,0,0.8)) drop-shadow(0px 0px 4px rgba(0,0,0,0.6))'
          }}
        />
      </div>
      
      {/* Notification Bell */}
      <div 
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 cursor-pointer hover:scale-110 transition-transform" 
        onClick={() => {
          // Open Community Hub notifications tab
          const communityHub = document.querySelector('[data-section="community-hub"]');
          if (communityHub) {
            communityHub.scrollIntoView({ behavior: 'smooth' });
            // Trigger opening the notifications tab in the Community Hub
            setTimeout(() => {
              const notificationsTab = document.querySelector('[data-value="notifications"]') as HTMLButtonElement;
              if (notificationsTab) {
                notificationsTab.click();
              }
            }, 500);
          }
        }}
      >
        <BellDot 
          className={`w-12 h-12 sm:w-16 sm:h-16 drop-shadow-lg transition-colors ${
            dashboardData?.unread_notifications > 0 
              ? 'text-red-400 animate-pulse' 
              : 'text-blue-200'
          }`}
        />
      </div>
    </div>
  );
};