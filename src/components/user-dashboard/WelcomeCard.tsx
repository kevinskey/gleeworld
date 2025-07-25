import { format } from "date-fns";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";

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

  return (
    <div 
      className="relative overflow-hidden rounded-3xl shadow-lg py-8 px-6 min-h-[200px] flex items-center"
      style={{
        background: welcomeCardSetting?.image_url 
          ? `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), url("${welcomeCardSetting.image_url}")` 
          : 'linear-gradient(135deg, #8b5cf6, #3b82f6, #4f46e5)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="relative text-center w-full">
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