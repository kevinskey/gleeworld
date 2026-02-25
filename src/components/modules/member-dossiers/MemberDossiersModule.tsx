import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, RefreshCw, Music, BarChart3, Upload, AlertTriangle, ArrowUpDown, X, Filter, ChevronDown } from "lucide-react";
import { MemberDossierCard } from "./MemberDossierCard";
import { DirectorDossierView } from "./DirectorDossierView";
import { MemberDossierAnalytics } from "./MemberDossierAnalytics";
import { MemberDataUpload } from "./MemberDataUpload";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface MemberDossiersModuleProps {
  courseId?: string;
}

type SortOption = 
  | "name-asc" 
  | "name-desc" 
  | "class-year-desc" 
  | "class-year-asc" 
  | "satisfaction-desc" 
  | "satisfaction-asc"
  | "interview-submitted"
  | "interview-missing"
  | "join-date-desc"
  | "join-date-asc";

const MemberDossiersModule: React.FC<MemberDossiersModuleProps> = ({ courseId }) => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberDossierData[]>([]);
  const [allInterviews, setAllInterviews] = useState<ExitInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [voicePartFilter, setVoicePartFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [interviewFilter, setInterviewFilter] = useState<string>("all");
  const [classYearFilter, setClassYearFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [selectedMember, setSelectedMember] = useState<MemberDossierData | null>(null);
  const [activeTab, setActiveTab] = useState("members");
  const [missingInterviews, setMissingInterviews] = useState<Array<{ name: string; email: string }>>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      let profiles: MemberProfile[] = [];

      if (courseId) {
        const { data: enrollments, error: enrollmentError } = await supabase
          .from("gw_course_enrollments")
          .select("user_id")
          .eq("course_id", courseId)
          .eq("enrollment_status", "enrolled")
          .not("user_id", "is", null);

        if (enrollmentError) throw enrollmentError;

        const userIds = (enrollments || []).map(e => e.user_id).filter((id): id is string => id !== null);

        if (userIds.length > 0) {
          const { data: profileData, error: profilesError } = await supabase
            .from("gw_profiles")
            .select("*")
            .in("user_id", userIds)
            .order("full_name");

          if (profilesError) throw profilesError;
          profiles = profileData || [];
        }
      } else {
        const { data: profileData, error: profilesError } = await supabase
          .from("gw_profiles")
          .select("*")
          .not("user_id", "is", null)
          .order("full_name");

        if (profilesError) throw profilesError;
        profiles = profileData || [];
      }

      const { data: interviews, error: interviewsError } = await supabase
        .from("member_exit_interviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (interviewsError) throw interviewsError;

      setAllInterviews(interviews || []);

      const interviewsByUser: Record<string, ExitInterview[]> = {};
      (interviews || []).forEach((interview) => {
        if (!interviewsByUser[interview.user_id]) {
          interviewsByUser[interview.user_id] = [];
        }
        interviewsByUser[interview.user_id].push(interview);
      });

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

  const filteredMembers = useMemo(() => {
    let result = members.filter(member => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        member.profile.full_name?.toLowerCase().includes(searchLower) ||
        member.profile.email?.toLowerCase().includes(searchLower) ||
        member.profile.student_number?.toLowerCase().includes(searchLower) ||
        member.profile.phone?.toLowerCase().includes(searchLower) ||
        member.profile.role?.toLowerCase().includes(searchLower) ||
        member.profile.exec_board_role?.toLowerCase().includes(searchLower);

      const matchesVoicePart = voicePartFilter === "all" || 
        member.profile.voice_part === voicePartFilter;

      const matchesRole = roleFilter === "all" || 
        member.profile.role === roleFilter;

      const hasInterview = member.exitInterviews.length > 0;
      const matchesInterview = interviewFilter === "all" || 
        (interviewFilter === "submitted" && hasInterview) ||
        (interviewFilter === "missing" && !hasInterview);

      const matchesClassYear = classYearFilter === "all" || 
        member.profile.class_year?.toString() === classYearFilter;

      return matchesSearch && matchesVoicePart && matchesRole && matchesInterview && matchesClassYear;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return (a.profile.full_name || "").localeCompare(b.profile.full_name || "");
        case "name-desc":
          return (b.profile.full_name || "").localeCompare(a.profile.full_name || "");
        case "class-year-desc":
          return (b.profile.class_year || 0) - (a.profile.class_year || 0);
        case "class-year-asc":
          return (a.profile.class_year || 0) - (b.profile.class_year || 0);
        case "satisfaction-desc":
          return (b.avgSatisfaction || 0) - (a.avgSatisfaction || 0);
        case "satisfaction-asc":
          return (a.avgSatisfaction || 0) - (b.avgSatisfaction || 0);
        case "interview-submitted":
          return b.exitInterviews.length - a.exitInterviews.length;
        case "interview-missing":
          return a.exitInterviews.length - b.exitInterviews.length;
        case "join-date-desc":
          return new Date(b.profile.join_date || 0).getTime() - new Date(a.profile.join_date || 0).getTime();
        case "join-date-asc":
          return new Date(a.profile.join_date || 0).getTime() - new Date(b.profile.join_date || 0).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [members, searchQuery, voicePartFilter, roleFilter, interviewFilter, classYearFilter, sortBy]);

  const voiceParts = useMemo(() => {
    const parts = new Set<string>();
    members.forEach(m => {
      if (m.profile.voice_part) parts.add(m.profile.voice_part);
    });
    return Array.from(parts).sort();
  }, [members]);

  const roles = useMemo(() => {
    const roleSet = new Set<string>();
    members.forEach(m => {
      if (m.profile.role) roleSet.add(m.profile.role);
    });
    return Array.from(roleSet).sort();
  }, [members]);

  const classYears = useMemo(() => {
    const years = new Set<number>();
    members.forEach(m => {
      if (m.profile.class_year) years.add(m.profile.class_year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [members]);

  const hasActiveFilters = searchQuery || voicePartFilter !== "all" || roleFilter !== "all" || 
    interviewFilter !== "all" || classYearFilter !== "all" || sortBy !== "name-asc";

  const clearFilters = () => {
    setSearchQuery("");
    setVoicePartFilter("all");
    setRoleFilter("all");
    setInterviewFilter("all");
    setClassYearFilter("all");
    setSortBy("name-asc");
  };

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
      <DirectorDossierView
        member={selectedMember.profile}
        exitInterviews={selectedMember.exitInterviews}
        onBack={() => setSelectedMember(null)}
      />
    );
  }

  const activeFilterCount = [
    voicePartFilter !== "all",
    roleFilter !== "all",
    interviewFilter !== "all",
    classYearFilter !== "all",
    sortBy !== "name-asc"
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            Member Dossiers
          </h2>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
            <span>{stats.total} total</span>
            <span className="text-green-500">{stats.withInterviews} submitted</span>
            <span className="text-orange-500">{stats.withoutInterviews} missing</span>
            {stats.avgSatisfaction && <span>Avg: {stats.avgSatisfaction.toFixed(1)}/5</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Tabs - scrollable on mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="h-9 bg-muted/50 w-auto inline-flex">
            <TabsTrigger value="members" className="text-xs px-2.5 sm:px-3 h-7 gap-1">
              <Users className="h-3.5 w-3.5 sm:hidden" />
              <span className="hidden sm:inline">Members</span>
              <span className="sm:hidden">{stats.total}</span>
              <span className="hidden sm:inline">({stats.total})</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs px-2.5 sm:px-3 h-7 gap-1">
              <BarChart3 className="h-3.5 w-3.5 sm:hidden" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-xs px-2.5 sm:px-3 h-7 gap-1">
              <Upload className="h-3.5 w-3.5 sm:hidden" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger value="missing" className="text-xs px-2.5 sm:px-3 h-7 gap-1">
              <AlertTriangle className="h-3.5 w-3.5 sm:hidden" />
              <span className="hidden sm:inline">Missing</span>
              <span>({stats.withoutInterviews})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="analytics" className="mt-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MemberDossierAnalytics interviews={allInterviews} />
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-3 space-y-3">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-card border-border"
              />
            </div>
            <Button
              variant={activeFilterCount > 0 ? "default" : "outline"}
              size="sm"
              className="h-9 gap-1 shrink-0"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Collapsible filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="h-8 text-xs col-span-2 sm:w-[160px]">
                    <ArrowUpDown className="h-3 w-3 mr-1 shrink-0" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                    <SelectItem value="name-desc">Name Z-A</SelectItem>
                    <SelectItem value="class-year-desc">Year (Newest)</SelectItem>
                    <SelectItem value="class-year-asc">Year (Oldest)</SelectItem>
                    <SelectItem value="satisfaction-desc">Satisfaction ↓</SelectItem>
                    <SelectItem value="satisfaction-asc">Satisfaction ↑</SelectItem>
                    <SelectItem value="interview-submitted">Has Interview</SelectItem>
                    <SelectItem value="interview-missing">Missing Interview</SelectItem>
                    <SelectItem value="join-date-desc">Recently Joined</SelectItem>
                    <SelectItem value="join-date-asc">Oldest Members</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={voicePartFilter} onValueChange={setVoicePartFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Voice Part" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parts</SelectItem>
                    {voiceParts.map(part => (
                      <SelectItem key={part} value={part}>{part}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={interviewFilter} onValueChange={setInterviewFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Interview" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="missing">Missing</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={classYearFilter} onValueChange={setClassYearFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {classYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs px-2">
                    <X className="h-3 w-3 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1 items-center">
              {searchQuery && <Badge variant="secondary" className="text-[10px]">"{searchQuery}"</Badge>}
              {voicePartFilter !== "all" && <Badge variant="secondary" className="text-[10px]">{voicePartFilter}</Badge>}
              {roleFilter !== "all" && <Badge variant="secondary" className="text-[10px]">{roleFilter}</Badge>}
              {interviewFilter !== "all" && <Badge variant="secondary" className="text-[10px]">{interviewFilter}</Badge>}
              {classYearFilter !== "all" && <Badge variant="secondary" className="text-[10px]">{classYearFilter}</Badge>}
              <span className="text-[10px] text-muted-foreground ml-1">
                {filteredMembers.length}/{members.length}
              </span>
            </div>
          )}

          {/* Member list */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery || voicePartFilter !== "all" ? "No members match your filters" : "No members found"}
            </div>
          ) : (
            <div className="space-y-1.5">
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

        <TabsContent value="upload" className="mt-3">
          <MemberDataUpload onMissingInterviewsFound={setMissingInterviews} />
        </TabsContent>

        <TabsContent value="missing" className="mt-3">
          {(() => {
            const membersWithoutInterviews = members.filter(m => m.exitInterviews.length === 0);
            return membersWithoutInterviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                All members have submitted exit interviews!
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-orange-500 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{membersWithoutInterviews.length} missing</span>
                </div>
                
                {/* Mobile card list */}
                <div className="sm:hidden space-y-1.5">
                  {membersWithoutInterviews.map((member, i) => (
                    <div key={member.profile.user_id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate text-foreground">
                          {member.profile.full_name || `${member.profile.first_name} ${member.profile.last_name}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.profile.email}</p>
                      </div>
                      {member.profile.voice_part && (
                        <Badge variant="outline" className="text-[10px] shrink-0">{member.profile.voice_part}</Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-2.5 font-medium text-xs text-muted-foreground">#</th>
                        <th className="text-left p-2.5 font-medium text-xs text-muted-foreground">Name</th>
                        <th className="text-left p-2.5 font-medium text-xs text-muted-foreground">Email</th>
                        <th className="text-left p-2.5 font-medium text-xs text-muted-foreground">Voice Part</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membersWithoutInterviews.map((member, i) => (
                        <tr key={member.profile.user_id} className="border-t hover:bg-muted/20">
                          <td className="p-2.5 text-muted-foreground text-xs">{i + 1}</td>
                          <td className="p-2.5 font-medium text-foreground text-sm">{member.profile.full_name || `${member.profile.first_name} ${member.profile.last_name}`}</td>
                          <td className="p-2.5 text-muted-foreground text-sm">{member.profile.email}</td>
                          <td className="p-2.5 text-muted-foreground text-sm">{member.profile.voice_part || '-'}</td>
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
    </div>
  );
};

export default MemberDossiersModule;
