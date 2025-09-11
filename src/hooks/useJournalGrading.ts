
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

// Raw fetch invoker with timeout and cache-buster
async function callEdgeRaw(
  path: string,
  body: unknown,
  token?: string,
  timeoutMs = 15000
) {
  const url = `https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/${path}?v=${Date.now()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort("timeout"), timeoutMs);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  }).catch((e) => {
    clearTimeout(t);
    throw new Error(`fetch_failed: ${e?.message || e}`);
  });
  clearTimeout(t);

  const text = await res.text(); // always read
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }

  if (!res.ok) {
    const status = res.status;
    const msg = json?.error || json?.message || text || `status_${status}`;
    throw new Error(`edge_${status}: ${msg}`);
  }
  return json ?? text;
}

// Health and dry probes
export async function probeGradeFunction(token?: string) {
  // Health: proves route + CORS + SW bypass
  const healthUrl = `https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/grade-journal?health=1&v=${Date.now()}`;
  const health = await fetch(healthUrl, { method: "GET" }).then(r => r.text()).catch(e => `health_failed:${e}`);

  // Dry: proves JSON parse + return path (no OpenAI, no DB)
  const dry = await callEdgeRaw("grade-journal", {
    mode: "dry",
    student_id: "probe",
    assignment_id: "probe",
    journal_text: "probe"
  }, token).catch(e => e.message);

  return { health, dry };
}

export async function gradeJournalWithAI(
  supabaseClient: SupabaseClient,
  journal: { id: string; assignment_id: string; student_id: string; content: string }
): Promise<GradeResponse> {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData?.session?.access_token ?? "";

  // 1) Quick health check if you keep seeing 502s
  // const probe = await probeGradeFunction(token);
  // console.log("grade-journal probe:", probe);

  // 2) Prefer raw fetch so 4xx/5xx bodies are visible
  try {
    const data = await callEdgeRaw("grade-journal", {
      assignment_id: journal.assignment_id,
      journal_text: journal.content,
      student_id: journal.student_id,
      journal_id: journal.id,
      stub_test: false
    }, token);

    return data as GradeResponse;
  } catch (e: any) {
    // 3) Fallback to supabase.invoke once, for parity
    try {
      const { data, error } = await supabaseClient.functions.invoke("grade-journal", {
        body: {
          assignment_id: journal.assignment_id,
          journal_text: journal.content,
          student_id: journal.student_id,
          journal_id: journal.id,
          stub_test: false
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (error) throw new Error(error.message || "invoke_failed");
      return data as GradeResponse;
    } catch (e2: any) {
      // Normalize with whatever we learned from raw fetch
      const msg = e?.message || e2?.message || "grading_failed";
      throw new Error(msg);
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

      if (!aiResult.success) {
        throw new Error(aiResult.error || 'AI grading failed');
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
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
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
      
      if (!peerResult.success) {
        throw new Error(peerResult.error || 'Failed to recheck peer comments');
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
