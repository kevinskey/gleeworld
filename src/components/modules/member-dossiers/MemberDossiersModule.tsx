import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, RefreshCw, Music, BarChart3, Upload, AlertTriangle } from "lucide-react";
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
  student_number: string | null;
  dues_paid: boolean | null;
  is_section_leader: boolean | null;
  is_exec_board: boolean | null;
  exec_board_role: string | null;
  music_role: string | null;
  can_dance: boolean | null;
  instruments_played: string[] | null;
  academic_year: string | null;
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
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberDossierData[]>([]);
  const [allInterviews, setAllInterviews] = useState<ExitInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [voicePartFilter, setVoicePartFilter] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<MemberDossierData | null>(null);
  const [activeTab, setActiveTab] = useState("members");
  const [missingInterviews, setMissingInterviews] = useState<Array<{ name: string; email: string }>>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch only member profiles (role = 'member')
      const { data: profiles, error: profilesError } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, first_name, last_name, email, phone, voice_part, class_year, avatar_url, status, role, join_date, notes, student_number, dues_paid, is_section_leader, is_exec_board, exec_board_role, music_role, can_dance, instruments_played, academic_year")
        .eq("role", "member")
        .not("user_id", "is", null)
        .order("full_name");

      if (profilesError) throw profilesError;

      // Fetch all exit interviews
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

      // Combine data - ALL members, with or without interviews
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
  const stats = useMemo(() => {
    const withInterviews = members.filter(m => m.exitInterviews.length > 0);
    const withoutInterviews = members.filter(m => m.exitInterviews.length === 0);
    return {
      total: members.length,
      withInterviews: withInterviews.length,
      withoutInterviews: withoutInterviews.length,
      avgSatisfaction: (() => {
        const scores = withInterviews
          .map(m => m.avgSatisfaction)
          .filter(s => s !== null) as number[];
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      })()
    };
  }, [members]);

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
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
          <span>{stats.total} total members</span>
          <span>•</span>
          <span className="text-green-600">{stats.withInterviews} submitted</span>
          <span>•</span>
          <span className="text-orange-600">{stats.withoutInterviews} missing</span>
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
            <TabsTrigger value="missing" className="flex-1">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Missing ({stats.withoutInterviews})
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
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <MemberDossierCard
                    key={member.profile.user_id}
                    member={member.profile}
                    hasExitInterview={member.exitInterviews.length > 0}
                    satisfactionAvg={member.avgSatisfaction}
                    onViewDossier={() => setSelectedMember(member)}
                    onViewInterview={() => navigate(`/dashboard?module=exit-interviews&search=${encodeURIComponent(member.profile.full_name || member.profile.email)}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <MemberDataUpload onMissingInterviewsFound={setMissingInterviews} />
          </TabsContent>

          <TabsContent value="missing" className="mt-4">
            {(() => {
              const membersWithoutInterviews = members.filter(m => m.exitInterviews.length === 0);
              return membersWithoutInterviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  All members have submitted exit interviews!
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">{membersWithoutInterviews.length} member(s) have NOT submitted exit interviews</span>
                  </div>
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium">#</th>
                          <th className="text-left p-3 font-medium">Name</th>
                          <th className="text-left p-3 font-medium">Email</th>
                          <th className="text-left p-3 font-medium">Voice Part</th>
                        </tr>
                      </thead>
                      <tbody>
                        {membersWithoutInterviews.map((member, i) => (
                          <tr key={member.profile.user_id} className="border-t hover:bg-muted/50">
                            <td className="p-3 text-muted-foreground">{i + 1}</td>
                            <td className="p-3 font-medium text-foreground">{member.profile.full_name || `${member.profile.first_name} ${member.profile.last_name}`}</td>
                            <td className="p-3 text-muted-foreground">{member.profile.email}</td>
                            <td className="p-3 text-muted-foreground">{member.profile.voice_part || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MemberDossiersModule;
