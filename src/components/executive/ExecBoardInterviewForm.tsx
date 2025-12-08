import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, Loader2, CheckCircle } from "lucide-react";
import { EXECUTIVE_POSITIONS } from "@/hooks/useExecutivePermissions";

const getCurrentSemester = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  // Fall: Aug-Dec (months 7-11), Spring: Jan-May (months 0-4)
  if (month >= 7) {
    return `Fall ${year}`;
  } else {
    return `Spring ${year}`;
  }
};

export const ExecBoardInterviewForm = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [existingInterview, setExistingInterview] = useState<any>(null);
  const [userName, setUserName] = useState<string>("");
  const [formData, setFormData] = useState({
    semester: getCurrentSemester(),
    position: "",
    full_name: "",
    progress_summary: "",
    challenges_faced: "",
    projects_created: "",
    projects_participated: "",
    projects_completed: "",
    new_ideas: "",
    lessons_learned: "",
    recommendations_for_successor: "",
    additional_comments: ""
  });

  // Fetch user's name from profile
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("gw_profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data?.full_name) {
        setUserName(data.full_name);
        setFormData(prev => ({ ...prev, full_name: data.full_name }));
      }
    };
    fetchUserName();
  }, [user]);

  useEffect(() => {
    if (user) {
      checkExistingInterview();
    } else {
      setInitialLoading(false);
    }
  }, [user, formData.semester]);

  const checkExistingInterview = async () => {
    try {
      const { data } = await supabase
        .from("exec_board_interviews")
        .select("*")
        .eq("user_id", user?.id)
        .eq("semester", formData.semester)
        .maybeSingle();

      if (data) {
        setExistingInterview(data);
        setFormData({
          semester: data.semester,
          position: data.position,
          full_name: data.full_name || userName,
          progress_summary: data.progress_summary || "",
          challenges_faced: data.challenges_faced || "",
          projects_created: data.projects_created || "",
          projects_participated: data.projects_participated || "",
          projects_completed: data.projects_completed || "",
          new_ideas: data.new_ideas || "",
          lessons_learned: data.lessons_learned || "",
          recommendations_for_successor: data.recommendations_for_successor || "",
          additional_comments: data.additional_comments || ""
        });
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to submit");
      return;
    }

    if (!formData.position || !formData.progress_summary) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);

    try {
      if (existingInterview) {
        // Update existing
        const { error } = await supabase
          .from("exec_board_interviews")
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingInterview.id);

        if (error) throw error;
        toast.success("Interview updated successfully!");
      } else {
        // Insert new
        const { error } = await supabase
          .from("exec_board_interviews")
          .insert({
            user_id: user.id,
            ...formData
          });

        if (error) throw error;
        toast.success("Interview submitted successfully!");
      }
      setSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting interview:", error);
      toast.error("Failed to submit interview");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSubmitted(false);
  };

  if (initialLoading) {
    return (
      <Card className="border-2 border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-600" />
            End of Semester Interview
          </CardTitle>
          <CardDescription>Loading your interview data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  if (submitted && !existingInterview) {
    return (
      <Card className="border-2 border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
          <p className="text-muted-foreground mb-4">
            Your semester interview has been submitted successfully.
          </p>
          <Button variant="outline" onClick={() => setSubmitted(false)}>
            Edit Response
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-amber-600" />
          End of Semester Interview
        </CardTitle>
        <CardDescription>
          Share your progress, experiences, and ideas from this semester. Your feedback helps strengthen future leadership.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-card-foreground">Your Name *</Label>
              <div className="p-3 bg-muted rounded-md text-sm font-medium text-card-foreground">
                {userName || "Loading..."}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester" className="text-card-foreground">Semester *</Label>
              <Select value={formData.semester} onValueChange={(v) => handleChange("semester", v)}>
                <SelectTrigger className="text-card-foreground">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fall 2024">Fall 2024</SelectItem>
                  <SelectItem value="Spring 2025">Spring 2025</SelectItem>
                  <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position" className="text-card-foreground">Executive Position *</Label>
              <Select value={formData.position} onValueChange={(v) => handleChange("position", v)}>
                <SelectTrigger className="text-card-foreground">
                  <SelectValue placeholder="Select your position" />
                </SelectTrigger>
                <SelectContent>
                  {EXECUTIVE_POSITIONS.map(pos => (
                    <SelectItem key={pos.value} value={pos.label}>{pos.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="progress_summary" className="text-card-foreground">Progress Summary *</Label>
            <Textarea
              id="progress_summary"
              placeholder="Describe your progress in your position this semester. What have you accomplished? How have you grown as a leader?"
              value={formData.progress_summary}
              onChange={(e) => handleChange("progress_summary", e.target.value)}
              className="min-h-[120px] text-foreground placeholder:text-muted-foreground/70"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenges_faced" className="text-card-foreground">Challenges Faced</Label>
            <Textarea
              id="challenges_faced"
              placeholder="What challenges or obstacles did you encounter? How did you address them?"
              value={formData.challenges_faced}
              onChange={(e) => handleChange("challenges_faced", e.target.value)}
              className="min-h-[100px] text-foreground placeholder:text-muted-foreground/70"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projects_created" className="text-card-foreground">Projects Created</Label>
              <Textarea
                id="projects_created"
                placeholder="List any new projects or initiatives you started..."
                value={formData.projects_created}
                onChange={(e) => handleChange("projects_created", e.target.value)}
                className="min-h-[100px] text-foreground placeholder:text-muted-foreground/70"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projects_participated" className="text-card-foreground">Projects Participated In</Label>
              <Textarea
                id="projects_participated"
                placeholder="List projects you contributed to..."
                value={formData.projects_participated}
                onChange={(e) => handleChange("projects_participated", e.target.value)}
                className="min-h-[100px] text-foreground placeholder:text-muted-foreground/70"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projects_completed" className="text-card-foreground">Projects Completed</Label>
              <Textarea
                id="projects_completed"
                placeholder="List projects you helped bring to completion..."
                value={formData.projects_completed}
                onChange={(e) => handleChange("projects_completed", e.target.value)}
                className="min-h-[100px] text-foreground placeholder:text-muted-foreground/70"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_ideas" className="text-card-foreground">New Ideas for Moving Forward</Label>
            <Textarea
              id="new_ideas"
              placeholder="Share any new ideas, improvements, or initiatives you'd like to see implemented..."
              value={formData.new_ideas}
              onChange={(e) => handleChange("new_ideas", e.target.value)}
              className="min-h-[100px] text-foreground placeholder:text-muted-foreground/70"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessons_learned" className="text-card-foreground">Lessons Learned</Label>
            <Textarea
              id="lessons_learned"
              placeholder="What key lessons have you learned this semester?"
              value={formData.lessons_learned}
              onChange={(e) => handleChange("lessons_learned", e.target.value)}
              className="min-h-[100px] text-foreground placeholder:text-muted-foreground/70"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recommendations_for_successor" className="text-card-foreground">Recommendations for Your Successor</Label>
            <Textarea
              id="recommendations_for_successor"
              placeholder="What advice would you give to the next person in your position?"
              value={formData.recommendations_for_successor}
              onChange={(e) => handleChange("recommendations_for_successor", e.target.value)}
              className="min-h-[100px] text-foreground placeholder:text-muted-foreground/70"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional_comments" className="text-card-foreground">Additional Comments</Label>
            <Textarea
              id="additional_comments"
              placeholder="Any other thoughts, feedback, or comments you'd like to share..."
              value={formData.additional_comments}
              onChange={(e) => handleChange("additional_comments", e.target.value)}
              className="min-h-[80px] text-foreground placeholder:text-muted-foreground/70"
            />
          </div>

          <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingInterview ? "Update Interview" : "Submit Interview"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
