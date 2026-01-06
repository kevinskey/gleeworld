import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { ProfileOverviewCard } from "./ProfileOverviewCard";
import { ParticipationCard, ParticipationCompactCard } from "./ParticipationCard";
import { WardrobeCard } from "./WardrobeCard";
import { MusicAccessCard } from "./MusicAccessCard";
import { FinancialInfoCard } from "./FinancialInfoCard";
import { AdminConsentCard } from "./AdminConsentCard";
import { AdminNotesCard } from "./AdminNotesCard";

interface ProfileData {
  avatar_url?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  voice_part?: string;
  classification?: string;
  join_date?: string;
  dress_size?: string;
  shoe_size?: string;
  notes?: string;
}

interface ProfileDashboardLayoutProps {
  profile: ProfileData | null;
  displayName: string;
  isEditing: boolean;
  isAdmin: boolean;
  onEditToggle: () => void;
  onAvatarUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  voicePartValue?: string;
  onVoicePartChange?: (value: string) => void;
  children?: React.ReactNode;
}

export const ProfileDashboardLayout = ({
  profile,
  displayName,
  isEditing,
  isAdmin,
  onEditToggle,
  onAvatarUpload,
  voicePartValue,
  onVoicePartChange,
  children,
}: ProfileDashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Glee Club Member Dashboard
            </h1>
            <p className="text-muted-foreground">Spelman College Glee Club</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground hidden sm:inline">{displayName}</span>
            <Button
              onClick={onEditToggle}
              variant={isEditing ? "outline" : "default"}
              size="sm"
            >
              {isEditing ? (
                "Cancel"
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  View Profile
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            <ProfileOverviewCard
              profile={profile}
              isEditing={isEditing}
              onAvatarUpload={onAvatarUpload}
              voicePartValue={voicePartValue}
              onVoicePartChange={onVoicePartChange}
              isAdmin={isAdmin}
            />
            <ParticipationCompactCard />
          </div>

          {/* Middle Column */}
          <div className="space-y-4">
            <ParticipationCard isEditing={isEditing} />
            <WardrobeCard
              tshirtSize={profile?.dress_size}
              shoeSize={profile?.shoe_size}
              isEditing={isEditing}
            />
            <AdminConsentCard isEditing={isEditing} />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <MusicAccessCard
              sheetMusicAccess={`${profile?.voice_part || 'Soprano'} | Folder`}
              isEditing={isEditing}
            />
            <FinancialInfoCard isEditing={isEditing} />
            <AdminNotesCard
              notes={profile?.notes}
              isEditing={isEditing}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {/* Additional content from parent */}
        {children}
      </div>
    </div>
  );
};
