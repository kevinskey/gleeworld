import React from "react";
import { Badge } from "@/components/ui/badge";
import { User, Music, GraduationCap, Star, ChevronRight } from "lucide-react";

interface MemberProfile {
  user_id: string;
  full_name: string | null;
  email: string;
  voice_part: string | null;
  class_year: number | null;
  avatar_url: string | null;
  status: string | null;
}

interface MemberDossierCardProps {
  member: MemberProfile;
  hasExitInterview: boolean;
  satisfactionAvg: number | null;
  onViewDossier: () => void;
  onViewInterview?: () => void;
}

export const MemberDossierCard: React.FC<MemberDossierCardProps> = ({
  member,
  hasExitInterview,
  satisfactionAvg,
  onViewDossier,
  onViewInterview
}) => {
  return (
    <div
      className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onViewDossier}
    >
      {/* Avatar */}
      {member.avatar_url ? (
        <img 
          src={member.avatar_url} 
          alt={member.full_name || "Member"} 
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
      )}

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate text-foreground leading-tight">
          {member.full_name || "Unknown"}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground leading-tight mt-0.5">
          {member.voice_part && (
            <span className="flex items-center gap-0.5">
              <Music className="h-3 w-3" />
              {member.voice_part}
            </span>
          )}
          {member.class_year && (
            <span className="flex items-center gap-0.5">
              <GraduationCap className="h-3 w-3" />
              {member.class_year}
            </span>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex flex-col items-end gap-0.5">
          {hasExitInterview ? (
            <Badge 
              variant="default" 
              className="text-[10px] py-0 h-5 cursor-pointer hover:bg-primary/80"
              onClick={(e) => {
                e.stopPropagation();
                onViewInterview?.();
              }}
            >
              Interview
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] py-0 h-5">No Interview</Badge>
          )}
          {satisfactionAvg !== null && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              {satisfactionAvg.toFixed(1)}
            </span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
      </div>
    </div>
  );
};
