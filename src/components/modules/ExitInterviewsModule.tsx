import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, User, Calendar, Star, ChevronRight, Download, RefreshCw, Trash2, Users, Music, Briefcase, Plane, Mail, MessageSquare, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  leadership_program_notes: string | null;
  willing_to_submit_purpose_statement: boolean;
  willing_to_give_election_speech: boolean;
  additional_comments: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    email: string;
    voice_part: string | null;
    class_year: number | null;
  };
}

// Swipeable Interview Card Component
const SwipeableInterviewCard: React.FC<{
  interview: ExitInterview;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ interview, onSelect, onDelete }) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;
    // Only allow left swipe (negative values)
    if (diff < 0) {
      setTranslateX(Math.max(diff, -100));
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    // If swiped more than 60px, show delete button
    if (translateX < -60) {
      setTranslateX(-80);
    } else {
      setTranslateX(0);
    }
  };

  const handleClick = () => {
    if (translateX < -30) {
      // Reset swipe if delete area is showing
      setTranslateX(0);
    } else {
      onSelect();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete button background */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-5 w-5 text-destructive-foreground" />
      </div>
      
      {/* Card content */}
      <div
        className="flex items-center justify-between p-3 border bg-card cursor-pointer transition-transform"
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{interview.profile?.full_name || "Unknown"}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{interview.profile?.voice_part || "—"}</span>
              <span>•</span>
              <span>{interview.semester}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <Badge variant={interview.intent_to_continue ? "default" : "secondary"}>
              {interview.intent_to_continue ? "Returning" : "Not Returning"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(interview.created_at), "MMM d, yyyy")}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

const ExitInterviewsModule: React.FC = () => {
  const [interviews, setInterviews] = useState<ExitInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<ExitInterview | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [createGroupDialog, setCreateGroupDialog] = useState<{ open: boolean; category: string; members: ExitInterview[] }>({ open: false, category: "", members: [] });
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Group interviews by different categories
  const groupedInterviews = useMemo(() => {
    const returning = interviews.filter(i => i.intent_to_continue);
    const notReturning = interviews.filter(i => !i.intent_to_continue);
    const execInterest = interviews.filter(i => i.interested_in_exec_board);
    const tourInterest = interviews.filter(i => i.interested_in_fall_tour);
    
    // Group by voice part
    const byVoicePart: Record<string, ExitInterview[]> = {};
    interviews.forEach(i => {
      const part = i.profile?.voice_part || "Unknown";
      if (!byVoicePart[part]) byVoicePart[part] = [];
      byVoicePart[part].push(i);
    });

    return { returning, notReturning, execInterest, tourInterest, byVoicePart };
  }, [interviews]);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      console.log("ExitInterviewsModule: Fetching exit interviews...");
      const { data, error } = await supabase
        .from("member_exit_interviews")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("ExitInterviewsModule: Query result:", { data: data?.length, error });
      
      if (error) throw error;

      // Fetch profile data for each interview
      const interviewsWithProfiles = await Promise.all(
        (data || []).map(async (interview) => {
          const { data: profile } = await supabase
            .from("gw_profiles")
            .select("full_name, email, voice_part, class_year")
            .eq("user_id", interview.user_id)
            .single();
          
          return { ...interview, profile };
        })
      );

      console.log("ExitInterviewsModule: Loaded", interviewsWithProfiles.length, "interviews");
      setInterviews(interviewsWithProfiles);
    } catch (error) {
      console.error("Error fetching exit interviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete exit interview from ${name}? This cannot be undone.`)) return;
    
    try {
      const { error } = await supabase
        .from("member_exit_interviews")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setInterviews(prev => prev.filter(i => i.id !== id));
      toast.success("Exit interview deleted");
    } catch (error) {
      console.error("Error deleting interview:", error);
      toast.error("Failed to delete interview");
    }
  };

  const openCreateGroupDialog = (category: string, members: ExitInterview[]) => {
    const defaultName = `Exit Interview - ${category} (${format(new Date(), "MMM yyyy")})`;
    setGroupName(defaultName);
    setCreateGroupDialog({ open: true, category, members });
  };

  const createMessagingGroup = async () => {
    if (!groupName.trim() || createGroupDialog.members.length === 0) return;
    
    setCreatingGroup(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the group (use a default course_id for general groups)
      const { data: group, error: groupError } = await supabase
        .from("gw_groups")
        .insert({
          course_id: "23c4ee3c-7bbb-4534-8c0a-eecd88298d37", // Default course for general groups
          name: groupName.trim(),
          description: `Created from Exit Interviews - ${createGroupDialog.category}`,
          leader_id: user.id,
          is_active: true,
          is_official: true,
          member_count: createGroupDialog.members.length + 1,
          semester: "Spring 2026"
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members to the group
      const memberInserts = [
        { group_id: group.id, user_id: user.id, role: "admin" },
        ...createGroupDialog.members.map(m => ({
          group_id: group.id,
          user_id: m.user_id,
          role: "member"
        }))
      ];

      const { error: membersError } = await supabase
        .from("gw_group_members")
        .insert(memberInserts);

      if (membersError) throw membersError;

      toast.success(`Group "${groupName}" created with ${createGroupDialog.members.length} members`);
      setCreateGroupDialog({ open: false, category: "", members: [] });
      setGroupName("");
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground">N/A</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    );
  };

  const exportToCSV = () => {
    const headers = [
      "Name", "Email", "Voice Part", "Class Year", "Semester", "Submitted",
      "Intent to Continue", "Interested in Exec Board", "Exec Board Position Interest",
      "Interested in Tour", "Interested in Advanced Ensemble", "Interested in Private Lessons",
      "Overall Satisfaction", "Rehearsals", "Performances", "Community", "Leadership", "Communication",
      "GPA", "What Worked Well", "What Could Improve", "Suggestions"
    ];

    const rows = interviews.map(i => [
      i.profile?.full_name || "",
      i.profile?.email || "",
      i.profile?.voice_part || "",
      i.profile?.class_year || "",
      i.semester,
      format(new Date(i.created_at), "yyyy-MM-dd"),
      i.intent_to_continue ? "Yes" : "No",
      i.interested_in_exec_board ? "Yes" : "No",
      i.exec_board_position_interest || "",
      i.interested_in_fall_tour ? "Yes" : "No",
      i.interested_in_advanced_ensemble ? "Yes" : "No",
      i.interested_in_private_lessons ? "Yes" : "No",
      i.satisfaction_overall || "",
      i.satisfaction_rehearsals || "",
      i.satisfaction_performances || "",
      i.satisfaction_community || "",
      i.satisfaction_leadership || "",
      i.satisfaction_communication || "",
      i.current_gpa || "",
      `"${(i.what_worked_well || "").replace(/"/g, '""')}"`,
      `"${(i.what_could_improve || "").replace(/"/g, '""')}"`,
      `"${(i.suggestions_for_next_semester || "").replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exit-interviews-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Exit Interviews
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchInterviews} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={interviews.length === 0}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {interviews.length} submission{interviews.length !== 1 ? "s" : ""}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : interviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No exit interviews submitted yet
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
                <TabsTrigger value="all" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  All ({interviews.length})
                </TabsTrigger>
                <TabsTrigger value="returning" className="text-xs">
                  Returning ({groupedInterviews.returning.length})
                </TabsTrigger>
                <TabsTrigger value="not-returning" className="text-xs">
                  Not Returning ({groupedInterviews.notReturning.length})
                </TabsTrigger>
                <TabsTrigger value="exec" className="text-xs">
                  <Briefcase className="h-3 w-3 mr-1" />
                  Exec Interest ({groupedInterviews.execInterest.length})
                </TabsTrigger>
                <TabsTrigger value="tour" className="text-xs">
                  <Plane className="h-3 w-3 mr-1" />
                  Tour Interest ({groupedInterviews.tourInterest.length})
                </TabsTrigger>
                <TabsTrigger value="voice-part" className="text-xs">
                  <Music className="h-3 w-3 mr-1" />
                  By Voice Part
                </TabsTrigger>
              </TabsList>

              {/* Create Group Button for current tab */}
              {activeTab !== "voice-part" && (
                <div className="mb-3">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      const members = activeTab === "all" ? interviews :
                        activeTab === "returning" ? groupedInterviews.returning :
                        activeTab === "not-returning" ? groupedInterviews.notReturning :
                        activeTab === "exec" ? groupedInterviews.execInterest :
                        groupedInterviews.tourInterest;
                      const categoryName = activeTab === "all" ? "All Respondents" :
                        activeTab === "returning" ? "Returning Members" :
                        activeTab === "not-returning" ? "Not Returning" :
                        activeTab === "exec" ? "Exec Board Interest" : "Tour Interest";
                      openCreateGroupDialog(categoryName, members);
                    }}
                    disabled={
                      (activeTab === "all" && interviews.length === 0) ||
                      (activeTab === "returning" && groupedInterviews.returning.length === 0) ||
                      (activeTab === "not-returning" && groupedInterviews.notReturning.length === 0) ||
                      (activeTab === "exec" && groupedInterviews.execInterest.length === 0) ||
                      (activeTab === "tour" && groupedInterviews.tourInterest.length === 0)
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create Messaging Group
                  </Button>
                </div>
              )}

              <div className="max-h-[400px] overflow-y-auto">
                <TabsContent value="all" className="mt-0 space-y-2">
                  {interviews.map((interview) => (
                    <SwipeableInterviewCard
                      key={interview.id}
                      interview={interview}
                      onSelect={() => setSelectedInterview(interview)}
                      onDelete={() => handleDelete(interview.id, interview.profile?.full_name || "Unknown")}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="returning" className="mt-0 space-y-2">
                  {groupedInterviews.returning.map((interview) => (
                    <SwipeableInterviewCard
                      key={interview.id}
                      interview={interview}
                      onSelect={() => setSelectedInterview(interview)}
                      onDelete={() => handleDelete(interview.id, interview.profile?.full_name || "Unknown")}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="not-returning" className="mt-0 space-y-2">
                  {groupedInterviews.notReturning.map((interview) => (
                    <SwipeableInterviewCard
                      key={interview.id}
                      interview={interview}
                      onSelect={() => setSelectedInterview(interview)}
                      onDelete={() => handleDelete(interview.id, interview.profile?.full_name || "Unknown")}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="exec" className="mt-0 space-y-2">
                  {groupedInterviews.execInterest.map((interview) => (
                    <SwipeableInterviewCard
                      key={interview.id}
                      interview={interview}
                      onSelect={() => setSelectedInterview(interview)}
                      onDelete={() => handleDelete(interview.id, interview.profile?.full_name || "Unknown")}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="tour" className="mt-0 space-y-2">
                  {groupedInterviews.tourInterest.map((interview) => (
                    <SwipeableInterviewCard
                      key={interview.id}
                      interview={interview}
                      onSelect={() => setSelectedInterview(interview)}
                      onDelete={() => handleDelete(interview.id, interview.profile?.full_name || "Unknown")}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="voice-part" className="mt-0 space-y-4">
                  {Object.entries(groupedInterviews.byVoicePart).sort().map(([voicePart, list]) => (
                    <div key={voicePart}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          {voicePart} ({list.length})
                        </h4>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() => openCreateGroupDialog(`${voicePart} Voice Part`, list)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create Group
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {list.map((interview) => (
                          <SwipeableInterviewCard
                            key={interview.id}
                            interview={interview}
                            onSelect={() => setSelectedInterview(interview)}
                            onDelete={() => handleDelete(interview.id, interview.profile?.full_name || "Unknown")}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedInterview} onOpenChange={() => setSelectedInterview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedInterview && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedInterview.profile?.full_name || "Unknown Member"}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedInterview.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  <span>•</span>
                  <span>{selectedInterview.semester}</span>
                </div>
              </DialogHeader>

              <Accordion type="multiple" defaultValue={["intentions", "satisfaction", "feedback"]} className="w-full">
                <AccordionItem value="intentions">
                  <AccordionTrigger>Intentions & Interests</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Intent to Continue</span>
                        <Badge variant={selectedInterview.intent_to_continue ? "default" : "destructive"}>
                          {selectedInterview.intent_to_continue ? "Yes" : "No"}
                        </Badge>
                      </div>
                      {selectedInterview.intent_to_continue_notes && (
                        <p className="text-sm text-muted-foreground">{selectedInterview.intent_to_continue_notes}</p>
                      )}
                      <div className="flex justify-between">
                        <span>Interested in Exec Board</span>
                        <Badge variant={selectedInterview.interested_in_exec_board ? "default" : "secondary"}>
                          {selectedInterview.interested_in_exec_board ? "Yes" : "No"}
                        </Badge>
                      </div>
                      {selectedInterview.exec_board_position_interest && (
                        <p className="text-sm"><strong>Positions:</strong> {selectedInterview.exec_board_position_interest}</p>
                      )}
                      {selectedInterview.exec_board_work_done && (
                        <p className="text-sm"><strong>Previous Work:</strong> {selectedInterview.exec_board_work_done}</p>
                      )}
                      <div className="flex justify-between">
                        <span>Interested in Fall Tour</span>
                        <Badge variant={selectedInterview.interested_in_fall_tour ? "default" : "secondary"}>
                          {selectedInterview.interested_in_fall_tour ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Interested in Advanced Ensemble</span>
                        <Badge variant={selectedInterview.interested_in_advanced_ensemble ? "default" : "secondary"}>
                          {selectedInterview.interested_in_advanced_ensemble ? "Yes" : "No"}
                        </Badge>
                      </div>
                      {selectedInterview.advanced_ensemble_notes && (
                        <p className="text-sm text-muted-foreground">{selectedInterview.advanced_ensemble_notes}</p>
                      )}
                      <div className="flex justify-between">
                        <span>Interested in Private Lessons</span>
                        <Badge variant={selectedInterview.interested_in_private_lessons ? "default" : "secondary"}>
                          {selectedInterview.interested_in_private_lessons ? "Yes" : "No"}
                        </Badge>
                      </div>
                      {selectedInterview.private_lessons_instrument && (
                        <p className="text-sm"><strong>Instrument:</strong> {selectedInterview.private_lessons_instrument}</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="satisfaction">
                  <AccordionTrigger>Satisfaction Ratings</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Overall</span>
                        {renderStars(selectedInterview.satisfaction_overall)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Rehearsals</span>
                        {renderStars(selectedInterview.satisfaction_rehearsals)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Performances</span>
                        {renderStars(selectedInterview.satisfaction_performances)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Community</span>
                        {renderStars(selectedInterview.satisfaction_community)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Leadership</span>
                        {renderStars(selectedInterview.satisfaction_leadership)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Communication</span>
                        {renderStars(selectedInterview.satisfaction_communication)}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="feedback">
                  <AccordionTrigger>Feedback & Suggestions</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {selectedInterview.what_worked_well && (
                        <div>
                          <p className="font-medium text-sm">What Worked Well</p>
                          <p className="text-sm text-muted-foreground mt-1">{selectedInterview.what_worked_well}</p>
                        </div>
                      )}
                      {selectedInterview.what_could_improve && (
                        <div>
                          <p className="font-medium text-sm">What Could Improve</p>
                          <p className="text-sm text-muted-foreground mt-1">{selectedInterview.what_could_improve}</p>
                        </div>
                      )}
                      {selectedInterview.suggestions_for_next_semester && (
                        <div>
                          <p className="font-medium text-sm">Suggestions for Next Semester</p>
                          <p className="text-sm text-muted-foreground mt-1">{selectedInterview.suggestions_for_next_semester}</p>
                        </div>
                      )}
                      {selectedInterview.additional_comments && (
                        <div>
                          <p className="font-medium text-sm">Additional Comments</p>
                          <p className="text-sm text-muted-foreground mt-1">{selectedInterview.additional_comments}</p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="leadership">
                  <AccordionTrigger>Leadership Program</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Understands Leadership Program</span>
                        <Badge variant={selectedInterview.understands_leadership_program ? "default" : "secondary"}>
                          {selectedInterview.understands_leadership_program ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Can Attend All Sessions</span>
                        <Badge variant={selectedInterview.can_attend_all_sessions ? "default" : "secondary"}>
                          {selectedInterview.can_attend_all_sessions ? "Yes" : "No"}
                        </Badge>
                      </div>
                      {selectedInterview.leadership_program_notes && (
                        <p className="text-sm text-muted-foreground">{selectedInterview.leadership_program_notes}</p>
                      )}
                      <div className="flex justify-between">
                        <span>Willing to Submit Purpose Statement</span>
                        <Badge variant={selectedInterview.willing_to_submit_purpose_statement ? "default" : "secondary"}>
                          {selectedInterview.willing_to_submit_purpose_statement ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Willing to Give Election Speech</span>
                        <Badge variant={selectedInterview.willing_to_give_election_speech ? "default" : "secondary"}>
                          {selectedInterview.willing_to_give_election_speech ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="other">
                  <AccordionTrigger>Other Information</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {selectedInterview.current_gpa && (
                        <div className="flex justify-between">
                          <span>Current GPA</span>
                          <span className="font-medium">{selectedInterview.current_gpa}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>In Other Campus Show</span>
                        <Badge variant={selectedInterview.in_other_campus_show ? "default" : "secondary"}>
                          {selectedInterview.in_other_campus_show ? "Yes" : "No"}
                        </Badge>
                      </div>
                      {selectedInterview.other_campus_show_details && (
                        <p className="text-sm text-muted-foreground">{selectedInterview.other_campus_show_details}</p>
                      )}
                      {selectedInterview.performances_participated && selectedInterview.performances_participated.length > 0 && (
                        <div>
                          <p className="font-medium text-sm">Performances Participated</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedInterview.performances_participated.map((perf, idx) => (
                              <Badge key={idx} variant="outline">{perf}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={createGroupDialog.open} onOpenChange={(open) => !open && setCreateGroupDialog({ open: false, category: "", members: [] })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Create Messaging Group
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
              />
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">Members to add:</p>
              <p className="text-sm text-muted-foreground">
                {createGroupDialog.members.length} member{createGroupDialog.members.length !== 1 ? "s" : ""} from "{createGroupDialog.category}"
              </p>
              <div className="flex flex-wrap gap-1 mt-2 max-h-24 overflow-y-auto">
                {createGroupDialog.members.slice(0, 10).map(m => (
                  <Badge key={m.id} variant="secondary" className="text-xs">
                    {m.profile?.full_name || "Unknown"}
                  </Badge>
                ))}
                {createGroupDialog.members.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{createGroupDialog.members.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateGroupDialog({ open: false, category: "", members: [] })}>
                Cancel
              </Button>
              <Button onClick={createMessagingGroup} disabled={creatingGroup || !groupName.trim()}>
                {creatingGroup ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-1" />
                )}
                Create Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExitInterviewsModule;
