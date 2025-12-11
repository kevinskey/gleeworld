import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Music, GraduationCap, Star, ChevronRight, Calendar, Mail } from "lucide-react";

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
}

export const MemberDossierCard: React.FC<MemberDossierCardProps> = ({
  member,
  hasExitInterview,
  satisfactionAvg,
  onViewDossier
}) => {
  return (
    <Card 
      className="hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onViewDossier}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {member.avatar_url ? (
              <img 
                src={member.avatar_url} 
                alt={member.full_name || "Member"} 
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h3 className="font-semibold">{member.full_name || "Unknown"}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {member.voice_part && (
                  <span className="flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    {member.voice_part}
                  </span>
                )}
                {member.class_year && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {member.class_year}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right space-y-1">
              {hasExitInterview ? (
                <Badge variant="default" className="text-xs">Interview Complete</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">No Interview</Badge>
              )}
              {satisfactionAvg !== null && (
                <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {satisfactionAvg.toFixed(1)}/5
                </div>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
