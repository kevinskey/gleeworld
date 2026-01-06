import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, ChevronRight, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProfileOverviewCardProps {
  profile: {
    avatar_url?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    voice_part?: string;
    classification?: string;
    join_date?: string;
  } | null;
  isEditing: boolean;
  onAvatarUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  voicePartValue?: string;
  onVoicePartChange?: (value: string) => void;
  isAdmin?: boolean;
}

const voiceParts = [
  { value: "S1", label: "Soprano 1" },
  { value: "S2", label: "Soprano 2" },
  { value: "A1", label: "Alto 1" },
  { value: "A2", label: "Alto 2" },
];

const classifications = ["Freshman", "Sophomore", "Junior", "Senior"];

export const ProfileOverviewCard = ({
  profile,
  isEditing,
  onAvatarUpload,
  voicePartValue,
  onVoicePartChange,
  isAdmin,
}: ProfileOverviewCardProps) => {
  const displayName = profile?.full_name || 
    `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 
    'User';
  
  const firstName = profile?.first_name || displayName.split(' ')[0] || '';
  
  const getInitials = () => {
    const names = displayName.split(' ');
    return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const getVoicePartLabel = (value?: string) => {
    const part = voiceParts.find(p => p.value === value);
    return part ? `$${part.value.charAt(1)}` : 'Not set';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Profile Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar className="h-28 w-28 border-4 border-border shadow-lg">
              <AvatarImage src={profile?.avatar_url || ""} className="object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {isEditing && onAvatarUpload && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors">
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={onAvatarUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Camera className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
          
          {/* Name */}
          <h3 className="mt-3 text-xl font-bold text-foreground">{displayName}</h3>
          {firstName && firstName !== displayName && (
            <p className="text-sm text-muted-foreground">{firstName}</p>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground min-w-[50px]">email</span>
            <span className="text-foreground">{profile?.email || 'Not set'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground min-w-[50px]">Phone</span>
            <span className="text-foreground">{profile?.phone_number || 'Not set'}</span>
          </div>
        </div>

        {/* Voice Part & Status */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Voice Part</span>
            {isEditing && isAdmin ? (
              <Select value={voicePartValue || ""} onValueChange={onVoicePartChange}>
                <SelectTrigger className="w-20 h-8 text-sm">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {voiceParts.map((part) => (
                    <SelectItem key={part.value} value={part.value}>
                      {part.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm font-medium">{getVoicePartLabel(voicePartValue)}</span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">
                {profile?.classification || 'Not set'}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Join Date</span>
            <span className="text-sm">{formatDate(profile?.join_date)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
