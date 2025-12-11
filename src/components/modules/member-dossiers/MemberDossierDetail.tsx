import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  User, Music, GraduationCap, Star, ArrowLeft, Mail, Phone, 
  Calendar, ClipboardList, Target, Heart, Briefcase, Plane,
  MessageSquare, TrendingUp, Award
} from "lucide-react";
import { format } from "date-fns";

interface ExitInterview {
  id: string;
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

interface MemberDossierDetailProps {
  member: MemberProfile;
  exitInterviews: ExitInterview[];
  onBack: () => void;
}

export const MemberDossierDetail: React.FC<MemberDossierDetailProps> = ({
  member,
  exitInterviews,
  onBack
}) => {
  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground text-sm">N/A</span>;
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

  const latestInterview = exitInterviews[0];
  
  // Calculate average satisfaction
  const calculateAvgSatisfaction = (interview: ExitInterview) => {
    const scores = [
      interview.satisfaction_overall,
      interview.satisfaction_rehearsals,
      interview.satisfaction_performances,
      interview.satisfaction_community,
      interview.satisfaction_leadership,
      interview.satisfaction_communication
    ].filter(s => s !== null) as number[];
    
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  };

  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            {member.avatar_url ? (
              <img 
                src={member.avatar_url} 
                alt={member.full_name || "Member"} 
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-xl">{member.full_name || "Unknown Member"}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {member.voice_part && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    {member.voice_part}
                  </Badge>
                )}
                {member.class_year && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    Class of {member.class_year}
                  </Badge>
                )}
                {member.status && (
                  <Badge variant={member.status === "active" ? "default" : "secondary"}>
                    {member.status}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-1 mt-3 text-sm text-muted-foreground">
                {member.email && (
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </span>
                )}
                {member.phone && (
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {member.phone}
                  </span>
                )}
                {member.join_date && (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Joined {format(new Date(member.join_date), "MMMM yyyy")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Exit Interviews */}
      {exitInterviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No exit interviews submitted yet</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={["interview-0"]} className="space-y-3">
          {exitInterviews.map((interview, index) => (
            <AccordionItem key={interview.id} value={`interview-${index}`} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 text-left">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <div>
                    <span className="font-medium">{interview.semester} Exit Interview</span>
                    <p className="text-xs text-muted-foreground">
                      Submitted {format(new Date(interview.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-accent/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Returning</p>
                    <Badge variant={interview.intent_to_continue ? "default" : "secondary"}>
                      {interview.intent_to_continue ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Exec Interest</p>
                    <Badge variant={interview.interested_in_exec_board ? "default" : "secondary"}>
                      {interview.interested_in_exec_board ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Tour Interest</p>
                    <Badge variant={interview.interested_in_fall_tour ? "default" : "secondary"}>
                      {interview.interested_in_fall_tour ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Avg Satisfaction</p>
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">
                        {calculateAvgSatisfaction(interview)?.toFixed(1) || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Satisfaction Ratings */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Satisfaction Ratings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 py-0 pb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Overall</p>
                      {renderStars(interview.satisfaction_overall)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rehearsals</p>
                      {renderStars(interview.satisfaction_rehearsals)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Performances</p>
                      {renderStars(interview.satisfaction_performances)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Community</p>
                      {renderStars(interview.satisfaction_community)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Leadership</p>
                      {renderStars(interview.satisfaction_leadership)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Communication</p>
                      {renderStars(interview.satisfaction_communication)}
                    </div>
                  </CardContent>
                </Card>

                {/* Goals & Aspirations */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Goals & Aspirations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 py-0 pb-4">
                    {interview.interested_in_exec_board && interview.exec_board_position_interest && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Exec Board Interest</p>
                        <p className="text-sm">{interview.exec_board_position_interest}</p>
                      </div>
                    )}
                    {interview.interested_in_advanced_ensemble && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Advanced Ensemble Interest</p>
                        <p className="text-sm">{interview.advanced_ensemble_notes || "Yes - interested"}</p>
                      </div>
                    )}
                    {interview.interested_in_private_lessons && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Private Lessons Interest</p>
                        <p className="text-sm">{interview.private_lessons_instrument || "Yes - interested"}</p>
                      </div>
                    )}
                    {interview.current_gpa && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Current GPA</p>
                        <p className="text-sm font-semibold">{interview.current_gpa}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Feedback */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Feedback & Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 py-0 pb-4">
                    {interview.what_worked_well && (
                      <div>
                        <p className="text-xs font-medium text-green-600">What Worked Well</p>
                        <p className="text-sm">{interview.what_worked_well}</p>
                      </div>
                    )}
                    {interview.what_could_improve && (
                      <div>
                        <p className="text-xs font-medium text-amber-600">What Could Improve</p>
                        <p className="text-sm">{interview.what_could_improve}</p>
                      </div>
                    )}
                    {interview.suggestions_for_next_semester && (
                      <div>
                        <p className="text-xs font-medium text-blue-600">Suggestions for Next Semester</p>
                        <p className="text-sm">{interview.suggestions_for_next_semester}</p>
                      </div>
                    )}
                    {interview.additional_comments && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Additional Comments</p>
                        <p className="text-sm">{interview.additional_comments}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Performances */}
                {interview.performances_participated && interview.performances_participated.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Performances Participated
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                      <div className="flex flex-wrap gap-2">
                        {interview.performances_participated.map((perf, i) => (
                          <Badge key={i} variant="outline">{perf}</Badge>
                        ))}
                      </div>
                      {interview.performances_other && (
                        <p className="text-sm text-muted-foreground mt-2">Other: {interview.performances_other}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Leadership Program (if interested in exec) */}
                {interview.interested_in_exec_board && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Leadership Program Readiness
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Understands Program:</span>
                          <Badge variant={interview.understands_leadership_program ? "default" : "secondary"} className="text-xs">
                            {interview.understands_leadership_program ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Can Attend All Sessions:</span>
                          <Badge variant={interview.can_attend_all_sessions ? "default" : "secondary"} className="text-xs">
                            {interview.can_attend_all_sessions ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Purpose Statement:</span>
                          <Badge variant={interview.willing_to_submit_purpose_statement ? "default" : "secondary"} className="text-xs">
                            {interview.willing_to_submit_purpose_statement ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Election Speech:</span>
                          <Badge variant={interview.willing_to_give_election_speech ? "default" : "secondary"} className="text-xs">
                            {interview.willing_to_give_election_speech ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                      {interview.leadership_program_notes && (
                        <p className="text-sm text-muted-foreground mt-2">{interview.leadership_program_notes}</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Admin Notes */}
      {member.notes && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Admin Notes</CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            <p className="text-sm text-muted-foreground">{member.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
