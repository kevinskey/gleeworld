
import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface JournalGrade {
  id: string;
  student_id: string;
  assignment_id: string;
  overall_score: number;
  letter_grade: string;
  rubric: any;
  feedback: string;
  ai_model?: string;
  graded_by?: string;
  graded_at: string;
}

export type GradeBreakdown = Record<string, number>;

export type GradeResponse = {
  success: boolean;
  grade: {
    id: string;
    assignment_id: string;
    student_id: string;
    journal_id: string;
    overall_score: number;
    letter_grade: string;
    rubric_scores: Array<{
      criterion: string;
      score: number;
      max_score: number;
      feedback: string;
    }>;
    overall_feedback: string;
    overall_points_without_peer: number;
    max_points_overall: number;
    overall_score_percent_without_peer: number;
    metadata: {
      word_count: number;
      word_range_ok: boolean;
    };
    created_at?: string;
  };
  trace?: string;
  error?: string;
};

export type PeerCommentResponse = {
  success: boolean;
  valid_count: number;
  points_awarded: number;
  qualifying_comment_ids: string[];
  error?: string;
};

export async function getPeerCommentPoints(
  supabaseClient: any,
  assignment_id: string,
  student_id: string
): Promise<PeerCommentResponse> {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData?.session?.access_token ?? "";
  
  try {
    const { data, error } = await supabaseClient.functions.invoke("peer-comment-points", {
      body: {
        assignment_id,
        student_id
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (error) {
      throw new Error(error.message || 'Peer comment calculation error');
    }

    return data as PeerCommentResponse;
  } catch (e: any) {
    let msg = e?.message || "Peer comment calculation failed";
    if (e?.context?.response && typeof e.context.response.json === "function") {
      try {
        const detail = await e.context.response.json();
        const status = e.context.response.status;
        msg = `${detail?.error || msg}${status ? ` [${status}]` : ""}`;
      } catch {}
    }
    throw new Error(msg);
  }
}

// Raw fetch utility with timeout and cache-buster
async function callEdgeRaw(path: string, body: unknown, token?: string, ms = 15000) {
  const url = `https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/${path}?v=${Date.now()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort("timeout"), ms);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  }).catch(e => { clearTimeout(t); throw new Error(`fetch_failed: ${e?.message||e}`); });
  clearTimeout(t);
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (!res.ok) throw new Error(`edge_${res.status}: ${json.error||json.message||text}`);
    return json;
  } catch {
    if (!res.ok) throw new Error(`edge_${res.status}: ${text||"no_body"}`);
    return text as any;
  }
}

// Probe functions for diagnostics
export async function probeGrade() {
  const health = await fetch(`https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/grade-journal?health=1&v=${Date.now()}`)
    .then(r=>r.status+" "+r.statusText).catch(e=>"health_failed:"+e);
  const { data: s } = await supabase.auth.getSession();
  const token = s?.session?.access_token;
  let dry;
  try {
    dry = await callEdgeRaw("grade-journal", {
      mode: "dry",
      student_id: "probe",
      assignment_id: "probe",
      journal_text: "probe"
    }, token);
  } catch(e:any) { dry = e.message; }
  console.log({ health, dry });
  return { health, dry };
}

export async function gradeJournalWithAI(
  supabaseClient: SupabaseClient,
  journal: { id: string; assignment_id: string; student_id: string; content: string }
): Promise<GradeResponse> {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData?.session?.access_token ?? "";

  try {
    return await callEdgeRaw("grade-journal", {
      assignment_id: journal.assignment_id,
      journal_text: journal.content,
      student_id: journal.student_id,
      journal_id: journal.id,
    }, token);
  } catch (rawErr:any) {
    console.error("raw edge fail:", rawErr?.message);
    try {
      const { data, error } = await supabaseClient.functions.invoke("grade-journal", {
        body: {
          assignment_id: journal.assignment_id,
          journal_text: journal.content,
          student_id: journal.student_id,
          journal_id: journal.id,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (error) throw error;
      return data as GradeResponse;
    } catch (invErr:any) {
      // Extract Supabase error body if present
      const resp = invErr?.context?.response;
      if (resp && typeof resp.text === "function") {
        const txt = await resp.text().catch(()=>null);
        console.error("invoke status:", resp.status, "body:", txt);
        throw new Error(`edge_${resp.status}: ${txt || invErr.message || "unknown"}`);
      }
      throw new Error(invErr?.message || rawErr?.message || "grading_failed");
    }
  }
}

export const useJournalGrading = () => {
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState<JournalGrade[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const gradeJournalWithAI_legacy = async (
    assignmentId: string,
    journalContent: string,
    studentId: string,
    journalId?: string
  ) => {
    setLoading(true);
    try {
      const journal = {
        id: journalId || '',
        assignment_id: assignmentId,
        student_id: studentId,
        content: journalContent
      };

      // Step 1: Get AI grading (4 criteria, excluding peer comments)
      const aiResult = await gradeJournalWithAI(supabase, journal);

      // Fixed: Don't reject valid responses that lack a success field
      if (!aiResult || typeof aiResult !== 'object') {
        throw new Error('Empty response from grader');
      }
      if ((aiResult as any).error) {
        throw new Error((aiResult as any).error);
      }

      // Step 2: Get peer comment points
      const peerResult = await getPeerCommentPoints(supabase, assignmentId, studentId);

      if (!peerResult.success) {
        console.warn('Peer comment calculation failed, proceeding without peer points:', peerResult.error);
      }

      // Step 3: Merge results
      const peerPoints = peerResult.success ? peerResult.points_awarded : 0;
      const totalPoints = aiResult.grade.overall_points_without_peer + peerPoints;
      const finalPercent = (totalPoints / aiResult.grade.max_points_overall) * 100;
      const finalLetterGrade = getLetterGrade(finalPercent);

      // Add peer comments to rubric scores
      const finalRubricScores = [
        ...aiResult.grade.rubric_scores,
        {
          criterion: 'Peer Comments',
          score: peerPoints,
          max_score: 3,
          feedback: peerResult.success 
            ? `Earned ${peerPoints} points for ${peerResult.valid_count} qualifying comment${peerResult.valid_count !== 1 ? 's' : ''} (≥50 words each).`
            : 'Peer comment calculation failed - please contact instructor.'
        }
      ];

      // Update the overall feedback
      const finalFeedback = aiResult.grade.overall_feedback + 
        (peerResult.success 
          ? ` Peer Comments: ${peerResult.valid_count}/2 qualifying comments for ${peerPoints} points.`
          : ' Peer comment points could not be calculated automatically.');

      // Update the grade in database with final scores
      const { error: updateError } = await supabase
        .from('mus240_journal_grades')
        .update({
          overall_score: finalPercent,
          letter_grade: finalLetterGrade,
          rubric: {
            criteria: [
              ...aiResult.grade.rubric_scores.map(score => ({
                name: score.criterion,
                max_points: score.max_score
              })),
              { name: 'Peer Comments', max_points: 3 }
            ],
            scores: finalRubricScores,
            metadata: {
              ...aiResult.grade.metadata,
              peer_comments: {
                count: peerResult.success ? peerResult.valid_count : 0,
                points: peerPoints,
                qualifying_comment_ids: peerResult.success ? peerResult.qualifying_comment_ids : []
              }
            }
          },
          feedback: finalFeedback
        })
        .eq('id', aiResult.grade.id);

      if (updateError) {
        console.error('Failed to update grade with peer points:', updateError);
      }

      const finalGrade = {
        ...aiResult.grade,
        overall_score: finalPercent,
        letter_grade: finalLetterGrade,
        rubric_scores: finalRubricScores,
        overall_feedback: finalFeedback,
        total_points: totalPoints,
        peer_comment_points: peerPoints
      };

      toast({
        title: "Journal Graded Successfully",
        description: `Final Grade: ${Math.round(finalPercent)}% (${finalLetterGrade}) - ${totalPoints}/${aiResult.grade.max_points_overall} points`,
      });

      return finalGrade;
    } catch (error: any) {
      console.error('Error grading journal:', error);
      
      // Improved error handling - extract server response if available
      const resp = error?.context?.response;
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      if (resp) {
        const txt = await resp.text().catch(()=>null);
        console.error("edge status:", resp.status, "body:", txt);
        errorMessage = `edge_${resp.status}: ${txt || error.message}`;
      }
      
      toast({
        title: "Grading Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const recheckPeerComments = async (assignmentId: string, studentId: string, gradeId: string) => {
    try {
      const peerResult = await getPeerCommentPoints(supabase, assignmentId, studentId);
      
      // Fixed: Don't reject valid responses that lack a success field
      if (!peerResult || typeof peerResult !== 'object') {
        console.warn('Empty peer result, proceeding without peer points');
      } else if ((peerResult as any).error) {
        console.warn('Peer comment calculation failed, proceeding without peer points:', (peerResult as any).error);
      }

      // Get current grade to update
      const { data: currentGrade, error: fetchError } = await supabase
        .from('mus240_journal_grades')
        .select('*')
        .eq('id', gradeId)
        .single();

      if (fetchError || !currentGrade) {
        throw new Error('Failed to fetch current grade');
      }

      // Recalculate final grade - handle JSON typing
      const rubricData = currentGrade.rubric as any;
      const aiPoints = rubricData?.scores?.slice(0, 4)?.reduce((sum: number, score: any) => sum + score.score, 0) || 0;
      const totalPoints = aiPoints + peerResult.points_awarded;
      const finalPercent = (totalPoints / 20) * 100;

      // Update rubric scores
      const updatedScores = [
        ...(rubricData?.scores?.slice(0, 4) || []),
        {
          criterion: 'Peer Comments',
          score: peerResult.points_awarded,
          max_score: 3,
          feedback: `Updated: ${peerResult.valid_count} qualifying comment${peerResult.valid_count !== 1 ? 's' : ''} for ${peerResult.points_awarded} points.`
        }
      ];

      const { error: updateError } = await supabase
        .from('mus240_journal_grades')
        .update({
          overall_score: finalPercent,
          letter_grade: getLetterGrade(finalPercent),
          rubric: {
            ...rubricData,
            scores: updatedScores,
            metadata: {
              ...(rubricData?.metadata || {}),
              peer_comments: {
                count: peerResult.valid_count,
                points: peerResult.points_awarded,
                qualifying_comment_ids: peerResult.qualifying_comment_ids,
                last_updated: new Date().toISOString()
              }
            }
          }
        })
        .eq('id', gradeId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast({
        title: "Peer Comments Rechecked",
        description: `Updated to ${peerResult.valid_count} qualifying comments (${peerResult.points_awarded} points)`,
      });

      return {
        valid_count: peerResult.valid_count,
        points_awarded: peerResult.points_awarded,
        final_score: finalPercent
      };
      
    } catch (error: any) {
      console.error('Error rechecking peer comments:', error);
      toast({
        title: "Recheck Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const fetchStudentGrade = async (assignmentId: string, studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('mus240_journal_grades')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching grade:', error);
      return null;
    }
  };

  const fetchAllGradesForAssignment = async (assignmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('mus240_journal_grades')
        .select(`
          *,
          gw_profiles!student_id (
            full_name,
            email
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('graded_at', { ascending: false });

      if (error) throw error;
      setGrades(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching assignment grades:', error);
      return [];
    }
  };

  return {
    loading,
    grades,
    gradeJournalWithAI: gradeJournalWithAI_legacy,
    fetchStudentGrade,
    fetchAllGradesForAssignment,
    recheckPeerComments,
    getPeerCommentPoints: (assignmentId: string, studentId: string) => getPeerCommentPoints(supabase, assignmentId, studentId)
  };
};

function getLetterGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};
