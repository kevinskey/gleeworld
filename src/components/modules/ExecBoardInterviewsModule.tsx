import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { Crown, User, Calendar, ChevronRight, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ExecBoardInterview {
  id: string;
  user_id: string;
  semester: string;
  position: string;
  full_name: string | null;
  progress_summary: string | null;
  challenges_faced: string | null;
  projects_created: string | null;
  projects_participated: string | null;
  projects_completed: string | null;
  new_ideas: string | null;
  lessons_learned: string | null;
  recommendations_for_successor: string | null;
  additional_comments: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

const ExecBoardInterviewsModule: React.FC = () => {
  const [interviews, setInterviews] = useState<ExecBoardInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<ExecBoardInterview | null>(null);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("exec_board_interviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile data for each interview
      const interviewsWithProfiles = await Promise.all(
        (data || []).map(async (interview) => {
          const { data: profile } = await supabase
            .from("gw_profiles")
            .select("full_name, email")
            .eq("user_id", interview.user_id)
            .single();
          
          return { ...interview, profile };
        })
      );

      setInterviews(interviewsWithProfiles);
    } catch (error) {
      console.error("Error fetching exec board interviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const exportToCSV = () => {
    const headers = [
      "Name", "Email", "Position", "Semester", "Submitted",
      "Progress Summary", "Challenges Faced", "Projects Created",
      "Projects Participated", "Projects Completed", "New Ideas",
      "Lessons Learned", "Recommendations for Successor", "Additional Comments"
    ];

    const rows = interviews.map(i => [
      i.full_name || i.profile?.full_name || "",
      i.profile?.email || "",
      i.position,
      i.semester,
      format(new Date(i.created_at), "yyyy-MM-dd"),
      `"${(i.progress_summary || "").replace(/"/g, '""')}"`,
      `"${(i.challenges_faced || "").replace(/"/g, '""')}"`,
      `"${(i.projects_created || "").replace(/"/g, '""')}"`,
      `"${(i.projects_participated || "").replace(/"/g, '""')}"`,
      `"${(i.projects_completed || "").replace(/"/g, '""')}"`,
      `"${(i.new_ideas || "").replace(/"/g, '""')}"`,
      `"${(i.lessons_learned || "").replace(/"/g, '""')}"`,
      `"${(i.recommendations_for_successor || "").replace(/"/g, '""')}"`,
      `"${(i.additional_comments || "").replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exec-board-interviews-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-amber-600" />
              Exec Board Exit Interviews
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
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : interviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No exec board interviews submitted yet
              </div>
            ) : (
              <div className="space-y-2">
                {interviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedInterview(interview)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Crown className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">{interview.full_name || interview.profile?.full_name || "Unknown"}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{interview.position}</span>
                          <span>•</span>
                          <span>{interview.semester}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant="outline" className="border-amber-500/50 text-amber-700">
                          {interview.position}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(interview.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedInterview} onOpenChange={() => setSelectedInterview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedInterview && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-600" />
                  {selectedInterview.full_name || selectedInterview.profile?.full_name || "Unknown"}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="border-amber-500/50">
                    {selectedInterview.position}
                  </Badge>
                  <span>•</span>
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedInterview.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  <span>•</span>
                  <span>{selectedInterview.semester}</span>
                </div>
              </DialogHeader>

              <Accordion type="multiple" defaultValue={["progress", "projects", "insights"]} className="w-full">
                <AccordionItem value="progress">
                  <AccordionTrigger>Progress & Challenges</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {selectedInterview.progress_summary && (
                        <div>
                          <p className="font-medium text-sm">Progress Summary</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {selectedInterview.progress_summary}
                          </p>
                        </div>
                      )}
                      {selectedInterview.challenges_faced && (
                        <div>
                          <p className="font-medium text-sm">Challenges Faced</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {selectedInterview.challenges_faced}
                          </p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="projects">
                  <AccordionTrigger>Projects</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {selectedInterview.projects_created && (
                        <div>
                          <p className="font-medium text-sm">Projects Created</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {selectedInterview.projects_created}
                          </p>
                        </div>
                      )}
                      {selectedInterview.projects_participated && (
                        <div>
                          <p className="font-medium text-sm">Projects Participated In</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {selectedInterview.projects_participated}
                          </p>
                        </div>
                      )}
                      {selectedInterview.projects_completed && (
                        <div>
                          <p className="font-medium text-sm">Projects Completed</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {selectedInterview.projects_completed}
                          </p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="insights">
                  <AccordionTrigger>Insights & Recommendations</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {selectedInterview.new_ideas && (
                        <div>
                          <p className="font-medium text-sm">New Ideas for Moving Forward</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {selectedInterview.new_ideas}
                          </p>
                        </div>
                      )}
                      {selectedInterview.lessons_learned && (
                        <div>
                          <p className="font-medium text-sm">Lessons Learned</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {selectedInterview.lessons_learned}
                          </p>
                        </div>
                      )}
                      {selectedInterview.recommendations_for_successor && (
                        <div>
                          <p className="font-medium text-sm">Recommendations for Successor</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {selectedInterview.recommendations_for_successor}
                          </p>
                        </div>
                      )}
                      {selectedInterview.additional_comments && (
                        <div>
                          <p className="font-medium text-sm">Additional Comments</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {selectedInterview.additional_comments}
                          </p>
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
    </>
  );
};

export default ExecBoardInterviewsModule;
