import { format } from "date-fns";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useMemo } from "react";

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

  // Memoize values to prevent re-renders causing blinking
  const backgroundStyles = useMemo(() => {
    if (!welcomeCardSetting?.image_url) return {};
    
    return {
      backgroundImage: `url("${welcomeCardSetting.image_url}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }, [welcomeCardSetting?.image_url]);

  const hasBackgroundImage = Boolean(welcomeCardSetting?.image_url);

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-lg min-h-[200px] flex items-center">
      {/* Background Image Layer */}
      {hasBackgroundImage && (
        <div 
          className="absolute inset-0"
          style={backgroundStyles}
        />
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
        <h1 className="text-xl font-medium text-white drop-shadow-lg">
          Welcome back {displayName}!
        </h1>
        <p className="text-white/90 text-sm mt-1 drop-shadow">
          {[profile?.exec_board_role, profile?.voice_part].filter(Boolean).join(', ') || getUserTitle()} • Member since {profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'Recently'}
        </p>
      </div>
    </div>
  );
};