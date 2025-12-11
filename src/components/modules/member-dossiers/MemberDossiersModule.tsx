import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, RefreshCw, Music, BarChart3, Upload } from "lucide-react";
import { MemberDossierCard } from "./MemberDossierCard";
import { MemberDossierDetail } from "./MemberDossierDetail";
import { MemberDossierAnalytics } from "./MemberDossierAnalytics";
import { MemberDataUpload } from "./MemberDataUpload";

interface MemberProfile {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  voice_part: string | null;
  class_year: number | null;
  avatar_url: string | null;
  status: string | null;
  role: string | null;
  join_date: string | null;
  notes: string | null;
}

interface ExitInterview {
  id: string;
  user_id: string;
  semester: string;
  intent_to_continue: boolean;
  intent_to_continue_notes: string | null;
  interested_in_exec_board: boolean;
  exec_board_position_interest: string | null;
  exec_board_work_done: string | null;
  interested_in_fall_tour: boolean;
  interested_in_advanced_ensemble: boolean;
  advanced_ensemble_notes: string | null;
  interested_in_private_lessons: boolean;
  private_lessons_instrument: string | null;
  performances_participated: string[] | null;
  performances_other: string | null;
  what_worked_well: string | null;
  what_could_improve: string | null;
  suggestions_for_next_semester: string | null;
  satisfaction_overall: number | null;
  satisfaction_rehearsals: number | null;
  satisfaction_performances: number | null;
  satisfaction_community: number | null;
  satisfaction_leadership: number | null;
  satisfaction_communication: number | null;
  current_gpa: number | null;
  in_other_campus_show: boolean;
  other_campus_show_details: string | null;
  understands_leadership_program: boolean;
  can_attend_all_sessions: boolean | null;
  willing_to_submit_purpose_statement: boolean;
  willing_to_give_election_speech: boolean;
  leadership_program_notes: string | null;
  additional_comments: string | null;
  created_at: string;
}

interface MemberDossierData {
  profile: MemberProfile;
  exitInterviews: ExitInterview[];
  avgSatisfaction: number | null;
}

const MemberDossiersModule: React.FC = () => {
  const [members, setMembers] = useState<MemberDossierData[]>([]);
  const [allInterviews, setAllInterviews] = useState<ExitInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [voicePartFilter, setVoicePartFilter] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<MemberDossierData | null>(null);
  const [activeTab, setActiveTab] = useState("analytics");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all exit interviews first - only show members who have submitted interviews
      const { data: interviews, error: interviewsError } = await supabase
        .from("member_exit_interviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (interviewsError) throw interviewsError;

      setAllInterviews(interviews || []);

      // Group interviews by user_id
      const interviewsByUser: Record<string, ExitInterview[]> = {};
      (interviews || []).forEach((interview) => {
        if (!interviewsByUser[interview.user_id]) {
          interviewsByUser[interview.user_id] = [];
        }
        interviewsByUser[interview.user_id].push(interview);
      });

      // Get unique user IDs who have submitted exit interviews
      const userIdsWithInterviews = Object.keys(interviewsByUser);

      if (userIdsWithInterviews.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch only profiles for members who have exit interviews
      const { data: profiles, error: profilesError } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, first_name, last_name, email, phone, voice_part, class_year, avatar_url, status, role, join_date, notes")
        .in("user_id", userIdsWithInterviews)
        .order("full_name");

      if (profilesError) throw profilesError;

      // Calculate average satisfaction for each member
      const calculateAvgSatisfaction = (userInterviews: ExitInterview[]) => {
        if (userInterviews.length === 0) return null;
        
        const allScores: number[] = [];
        userInterviews.forEach(interview => {
          const scores = [
            interview.satisfaction_overall,
            interview.satisfaction_rehearsals,
            interview.satisfaction_performances,
            interview.satisfaction_community,
            interview.satisfaction_leadership,
            interview.satisfaction_communication
          ].filter(s => s !== null) as number[];
          allScores.push(...scores);
        });
        
        return allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null;
      };

      // Combine data - only members with exit interviews
      const memberDossiers: MemberDossierData[] = (profiles || []).map((profile) => ({
        profile,
        exitInterviews: interviewsByUser[profile.user_id] || [],
        avgSatisfaction: calculateAvgSatisfaction(interviewsByUser[profile.user_id] || [])
      }));

      setMembers(memberDossiers);
    } catch (error) {
      console.error("Error fetching member dossiers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        member.profile.full_name?.toLowerCase().includes(searchLower) ||
        member.profile.email?.toLowerCase().includes(searchLower);

      // Voice part filter
      const matchesVoicePart = voicePartFilter === "all" || 
        member.profile.voice_part === voicePartFilter;

      return matchesSearch && matchesVoicePart;
    });
  }, [members, searchQuery, voicePartFilter]);

  // Get unique voice parts for filter
  const voiceParts = useMemo(() => {
    const parts = new Set<string>();
    members.forEach(m => {
      if (m.profile.voice_part) parts.add(m.profile.voice_part);
    });
    return Array.from(parts).sort();
  }, [members]);

  // Stats
  const stats = useMemo(() => ({
    total: members.length,
    avgSatisfaction: (() => {
      const scores = members
        .map(m => m.avgSatisfaction)
        .filter(s => s !== null) as number[];
      return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    })()
  }), [members]);

  if (selectedMember) {
    return (
      <MemberDossierDetail
        member={selectedMember.profile}
        exitInterviews={selectedMember.exitInterviews}
        onBack={() => setSelectedMember(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Member Dossiers
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground mt-2">
          <span>{stats.total} members with interviews</span>
          {stats.avgSatisfaction && (
            <>
              <span>•</span>
              <span>Avg satisfaction: {stats.avgSatisfaction.toFixed(1)}/5</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="analytics" className="flex-1">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              Members ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Upload Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <MemberDossierAnalytics interviews={allInterviews} />
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-4 space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={voicePartFilter} onValueChange={setVoicePartFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Music className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Voice Part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parts</SelectItem>
                  {voiceParts.map(part => (
                    <SelectItem key={part} value={part}>{part}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Member List */}
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || voicePartFilter !== "all"
                  ? "No members match your filters"
                  : "No exit interviews submitted yet"}
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredMembers.map((member) => (
                  <MemberDossierCard
                    key={member.profile.user_id}
                    member={member.profile}
                    hasExitInterview={member.exitInterviews.length > 0}
                    satisfactionAvg={member.avgSatisfaction}
                    onViewDossier={() => setSelectedMember(member)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <MemberDataUpload />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MemberDossiersModule;
