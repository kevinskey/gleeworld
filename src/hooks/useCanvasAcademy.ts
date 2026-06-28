// Canvas-backed Academy data hooks. Talks to GleeWorld's canvas-*
// edge functions which proxy to whatever Canvas instance the tenant
// is bound to. UI never sees Canvas directly.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CanvasCourse {
  id: number;
  name: string;
  code: string | null;
}

interface ListCoursesResponse {
  ok: true;
  canvas_user_id: number;
  courses: CanvasCourse[];
}

interface ErrResponse {
  error: string;
  detail?: string;
}

export function useCanvasCourses() {
  return useQuery({
    queryKey: ['canvas-courses'],
    queryFn: async (): Promise<ListCoursesResponse | ErrResponse> => {
      const { data, error } = await supabase.functions.invoke('canvas-list-courses', { body: {} });
      if (error) throw error;
      return data as ListCoursesResponse | ErrResponse;
    },
    // Refetch when the tab regains focus so a teacher who just created
    // a course in Canvas sees it without a hard refresh.
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export interface CanvasModule {
  id: number;
  name: string;
  position: number;
  items_count: number;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
  points_possible: number | null;
  submission_types: string[];
  has_submission?: boolean;
}

export interface CanvasCourseDetail {
  ok: true;
  course: {
    id: number;
    name: string;
    code: string | null;
    syllabus_body: string | null;
    start_at: string | null;
    end_at: string | null;
  };
  modules: CanvasModule[];
  assignments: CanvasAssignment[];
}

export function useCanvasCourse(courseId: number | null) {
  return useQuery({
    queryKey: ['canvas-course', courseId],
    enabled: courseId !== null,
    queryFn: async (): Promise<CanvasCourseDetail | ErrResponse> => {
      const { data, error } = await supabase.functions.invoke('canvas-get-course', { body: { course_id: courseId } });
      if (error) throw error;
      return data as CanvasCourseDetail | ErrResponse;
    },
    staleTime: 30_000,
  });
}

export interface CanvasRubricCriterion {
  id: string;
  description: string;
  points: number;
  ratings: Array<{ id: string; description: string; long_description?: string; points: number }>;
}

export interface CanvasAssignmentDetail {
  ok: true;
  assignment: {
    id: number;
    name: string;
    description: string | null;
    due_at: string | null;
    points_possible: number | null;
    submission_types: string[];
    html_url: string | null;
    anonymous_grading: boolean;
    group_category_id: number | null;
    rubric: CanvasRubricCriterion[] | null;
    rubric_settings: { points_possible: number; free_form_criterion_comments?: boolean; hide_score_total?: boolean } | null;
    submission: null | {
      id: number;
      score: number | null;
      grade: string | null;
      submitted_at: string | null;
      late: boolean;
      missing: boolean;
      state: string | null;
      comments: Array<{ author: string; body: string; at: string }>;
    };
  };
}

export function useCanvasAssignment(courseId: number | null, assignmentId: number | null) {
  return useQuery({
    queryKey: ['canvas-assignment', courseId, assignmentId],
    enabled: courseId !== null && assignmentId !== null,
    queryFn: async (): Promise<CanvasAssignmentDetail | ErrResponse> => {
      const { data, error } = await supabase.functions.invoke('canvas-get-assignment', {
        body: { course_id: courseId, assignment_id: assignmentId },
      });
      if (error) throw error;
      return data as CanvasAssignmentDetail | ErrResponse;
    },
    staleTime: 30_000,
  });
}

export interface CanvasCourseGrades {
  ok: true;
  overall: {
    current_score: number | null;
    final_score: number | null;
    current_grade: string | null;
    final_grade: string | null;
  };
  assignments: Array<{
    id: number;
    name: string;
    due_at: string | null;
    points_possible: number | null;
  }>;
}

export function useCanvasCourseGrades(courseId: number | null) {
  return useQuery({
    queryKey: ['canvas-course-grades', courseId],
    enabled: courseId !== null,
    queryFn: async (): Promise<CanvasCourseGrades | ErrResponse> => {
      const { data, error } = await supabase.functions.invoke('canvas-course-grades', { body: { course_id: courseId } });
      if (error) throw error;
      return data as CanvasCourseGrades | ErrResponse;
    },
    staleTime: 30_000,
  });
}

export function useBootstrapCanvas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-bootstrap-tenant', { body: {} });
      if (error) throw error;
      return data as { ok: true; canvas_account_id: number; already_bound: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-courses'] });
    },
  });
}

export interface CanvasQuiz {
  id: number;
  title: string;
  due_at: string | null;
  points_possible: number | null;
  question_count: number;
  published: boolean;
}
export interface CanvasDiscussion {
  id: number;
  title: string;
  posted_at: string | null;
  last_reply_at: string | null;
  replies: number;
  unread: number;
  pinned: boolean;
  locked: boolean;
}
export interface CanvasPerson {
  enrollment_id: number;
  user_id: number;
  name: string;
  sortable_name: string | null;
  avatar_url: string | null;
  type: string;
  role: string;
  state: string;
}

export function useCanvasCourseTab<T extends 'quizzes' | 'discussions' | 'people'>(
  courseId: number | null,
  tab: T,
  enabled = true,
) {
  return useQuery({
    queryKey: ['canvas-course-tab', courseId, tab],
    enabled: enabled && courseId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-course-tab', {
        body: { course_id: courseId, tab },
      });
      if (error) throw error;
      return data as
        (T extends 'quizzes' ? { ok: true; quizzes: CanvasQuiz[] } : never)
        | (T extends 'discussions' ? { ok: true; discussions: CanvasDiscussion[] } : never)
        | (T extends 'people' ? { ok: true; people: CanvasPerson[] } : never)
        | ErrResponse;
    },
    staleTime: 30_000,
  });
}

export interface CanvasAnnouncement {
  id: number;
  title: string;
  message: string | null;
  posted_at: string | null;
  author_name: string | null;
  author_avatar: string | null;
}

export function useCanvasAnnouncements(courseId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['canvas-announcements', courseId],
    enabled: enabled && courseId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-course-announcements', {
        body: { action: 'list', course_id: courseId },
      });
      if (error) throw error;
      return data as { ok: true; announcements: CanvasAnnouncement[] } | ErrResponse;
    },
    staleTime: 30_000,
  });
}

export function usePostAnnouncement(courseId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { title: string; message: string }) => {
      const { data, error } = await supabase.functions.invoke('canvas-course-announcements', {
        body: { action: 'create', course_id: courseId, ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-announcements', courseId] });
    },
  });
}

export interface CanvasFile {
  id: number;
  name: string;
  size: number;
  content_type: string;
  url: string;
  updated_at: string;
}
export interface CanvasFolder {
  id: number;
  name: string;
  files_count: number;
  folders_count: number;
}

export function useCanvasCourseFiles(courseId: number | null, folderId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['canvas-course-files', courseId, folderId],
    enabled: enabled && courseId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-course-files', {
        body: { course_id: courseId, ...(folderId !== null ? { folder_id: folderId } : {}) },
      });
      if (error) throw error;
      return data as {
        ok: true;
        folder: { id: number; name: string } | null;
        folders: CanvasFolder[];
        files: CanvasFile[];
        breadcrumb: Array<{ id: number; name: string }>;
      } | ErrResponse;
    },
    staleTime: 30_000,
  });
}

export interface CanvasCalendarEvent {
  id: string;
  title: string;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  context_code: string | null;
  course_name: string | null;
  html_url: string | null;
}
export interface CanvasCalendarAssignment {
  id: string;
  assignment_id: number | null;
  title: string;
  due_at: string | null;
  points_possible: number | null;
  course_id: number | null;
  course_name: string | null;
  html_url: string | null;
}

export function useCanvasCalendar(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['canvas-calendar', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-calendar', {
        body: { start_date: startDate, end_date: endDate },
      });
      if (error) throw error;
      return data as {
        ok: true;
        events: CanvasCalendarEvent[];
        assignments: CanvasCalendarAssignment[];
        courses: Array<{ id: number; name: string }>;
      } | ErrResponse;
    },
    staleTime: 60_000,
  });
}

export interface CanvasAssignmentSubmission {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar: string | null;
  sortable_name: string | null;
  score: number | null;
  grade: string | null;
  submitted_at: string | null;
  late: boolean;
  missing: boolean;
  workflow_state: string;
}

export function useAssignmentSubmissions(courseId: number | null, assignmentId: number | null) {
  return useQuery({
    queryKey: ['canvas-submissions', courseId, assignmentId],
    enabled: courseId !== null && assignmentId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-gradebook', {
        body: { action: 'list', course_id: courseId, assignment_id: assignmentId },
      });
      if (error) throw error;
      return data as { ok: true; submissions: CanvasAssignmentSubmission[] } | ErrResponse;
    },
    staleTime: 15_000,
  });
}

export function useUpdateSubmission(courseId: number | null, assignmentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      user_id: number;
      posted_grade?: string;
      comment?: string;
      rubric_assessment?: Record<string, { points?: number; rating_id?: string; comments?: string }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('canvas-gradebook', {
        body: { action: 'update', course_id: courseId, assignment_id: assignmentId, ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['canvas-submissions', courseId, assignmentId] });
      qc.invalidateQueries({ queryKey: ['canvas-submission', courseId, assignmentId, vars.user_id] });
    },
  });
}

export interface CanvasBlueprintStatus {
  ok: true;
  is_blueprint: boolean;
  associated_courses: Array<{ id: number; name: string; course_code?: string }>;
  recent_migrations: Array<{ id: number; workflow_state: string; created_at: string; comment?: string }>;
}

export function useBlueprintStatus(courseId: number | null) {
  return useQuery({
    queryKey: ['canvas-blueprint-status', courseId],
    enabled: courseId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-blueprint', {
        body: { action: 'status', course_id: courseId },
      });
      if (error) throw error;
      return data as CanvasBlueprintStatus | ErrResponse;
    },
    staleTime: 30_000,
  });
}

export function useSetBlueprint(courseId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      blueprint: boolean;
      restrictions?: { content?: boolean; points?: boolean; due_dates?: boolean; availability_dates?: boolean };
    }) => {
      const { data, error } = await supabase.functions.invoke('canvas-blueprint', {
        body: { action: 'set', course_id: courseId, ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-blueprint-status', courseId] });
      qc.invalidateQueries({ queryKey: ['canvas-course', courseId] });
    },
  });
}

export function useAssociateBlueprint(courseId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { add?: number[]; remove?: number[] }) => {
      const { data, error } = await supabase.functions.invoke('canvas-blueprint', {
        body: { action: 'associate', course_id: courseId, ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-blueprint-status', courseId] });
    },
  });
}

export function useSyncBlueprint(courseId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { comment?: string; publish_after_initial_sync?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('canvas-blueprint', {
        body: { action: 'sync', course_id: courseId, ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-blueprint-status', courseId] });
    },
  });
}

export interface CanvasOutcome {
  id: number; title: string; description: string | null;
  points_possible: number; mastery_points: number;
  ratings: Array<{ description: string; points: number }>;
}
export interface CanvasOutcomeRollups {
  ok: true;
  outcomes: Array<{ id: number; title: string; mastery_points: number }>;
  users: Array<{ id: number; name: string }>;
  rollups: Array<{ user_id: number; scores: Array<{ outcome_id: number; score: number | null }> }>;
}

export function useCanvasOutcomes(courseId: number | null) {
  return useQuery({
    queryKey: ['canvas-outcomes', courseId],
    enabled: courseId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-outcomes', {
        body: { action: 'list', course_id: courseId },
      });
      if (error) throw error;
      return data as { ok: true; root_group: { id: number; title: string }; outcomes: CanvasOutcome[] } | ErrResponse;
    },
    staleTime: 60_000,
  });
}

export function useCreateOutcome(courseId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      title: string; description?: string;
      points_possible?: number; mastery_points: number;
      ratings: Array<{ description: string; points: number }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('canvas-outcomes', {
        body: { action: 'create', course_id: courseId, ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-outcomes', courseId] });
    },
  });
}

export function useOutcomeRollups(courseId: number | null) {
  return useQuery({
    queryKey: ['canvas-outcome-rollups', courseId],
    enabled: courseId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-outcomes', {
        body: { action: 'rollups', course_id: courseId },
      });
      if (error) throw error;
      return data as CanvasOutcomeRollups | ErrResponse;
    },
    staleTime: 60_000,
  });
}

export interface CanvasRubricSummary {
  id: number; title: string; points_possible: number; free_form_criterion_comments: boolean;
}
export interface CanvasRubricFull {
  id: number; title: string; points_possible: number; free_form_criterion_comments: boolean;
  data: Array<{
    id: string; description: string; long_description?: string; points: number;
    ratings: Array<{ id: string; description: string; long_description?: string; points: number }>;
  }>;
}

export function useCanvasRubrics(courseId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['canvas-rubrics', courseId],
    enabled: enabled && courseId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-rubric', {
        body: { action: 'list', course_id: courseId },
      });
      if (error) throw error;
      return data as { ok: true; rubrics: CanvasRubricSummary[] } | ErrResponse;
    },
    staleTime: 30_000,
  });
}

export function useCanvasRubric(courseId: number | null, rubricId: number | null) {
  return useQuery({
    queryKey: ['canvas-rubric', courseId, rubricId],
    enabled: courseId !== null && rubricId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-rubric', {
        body: { action: 'get', course_id: courseId, rubric_id: rubricId },
      });
      if (error) throw error;
      return data as { ok: true; rubric: CanvasRubricFull } | ErrResponse;
    },
    staleTime: 30_000,
  });
}

export function useSaveRubric(courseId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      rubric_id?: number;
      title: string;
      criteria: Array<{
        description: string; long_description?: string; points: number;
        ratings: Array<{ description: string; long_description?: string; points: number }>;
      }>;
      free_form_criterion_comments?: boolean;
      assignment_id?: number;
    }) => {
      const action = args.rubric_id ? 'update' : 'create';
      const { data, error } = await supabase.functions.invoke('canvas-rubric', {
        body: { action, course_id: courseId, ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['canvas-rubrics', courseId] });
      if (vars.rubric_id) qc.invalidateQueries({ queryKey: ['canvas-rubric', courseId, vars.rubric_id] });
    },
  });
}

export function useDeleteRubric(courseId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rubric_id: number) => {
      const { data, error } = await supabase.functions.invoke('canvas-rubric', {
        body: { action: 'delete', course_id: courseId, rubric_id },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-rubrics', courseId] });
    },
  });
}

export interface CanvasQuizDetail {
  id: number; title: string; description?: string;
  quiz_type?: string; time_limit?: number | null;
  points_possible?: number; published?: boolean;
  due_at?: string | null; allowed_attempts?: number;
  scoring_policy?: string; question_count: number;
}
export interface CanvasQuizQuestion {
  id: number; quiz_id: number; position: number;
  question_name?: string; question_text?: string;
  question_type: string; points_possible?: number;
  answers?: Array<{ id: number | string; text: string; weight: number; comments?: string }>;
}

export function useCanvasQuizDetail(courseId: number | null, quizId: number | null) {
  return useQuery({
    queryKey: ['canvas-quiz', courseId, quizId],
    enabled: courseId !== null && quizId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-quiz', {
        body: { action: 'get_quiz', course_id: courseId, quiz_id: quizId },
      });
      if (error) throw error;
      return data as { ok: true; quiz: CanvasQuizDetail; questions: CanvasQuizQuestion[] } | ErrResponse;
    },
    staleTime: 15_000,
  });
}

export function useCreateQuiz(courseId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quiz: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke('canvas-quiz', {
        body: { action: 'create_quiz', course_id: courseId, quiz },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data as { ok: true; quiz: { id: number; title: string } };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-course-tab', courseId, 'quizzes'] });
    },
  });
}

export function useUpdateQuiz(courseId: number | null, quizId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quiz: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke('canvas-quiz', {
        body: { action: 'update_quiz', course_id: courseId, quiz_id: quizId, quiz },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-quiz', courseId, quizId] });
    },
  });
}

export function useAddQuizQuestion(courseId: number | null, quizId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (question: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke('canvas-quiz', {
        body: { action: 'add_question', course_id: courseId, quiz_id: quizId, question },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-quiz', courseId, quizId] });
    },
  });
}

export function useUpdateQuizQuestion(courseId: number | null, quizId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { question_id: number; question: Record<string, unknown> }) => {
      const { data, error } = await supabase.functions.invoke('canvas-quiz', {
        body: { action: 'update_question', course_id: courseId, quiz_id: quizId, ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-quiz', courseId, quizId] });
    },
  });
}

export function useDeleteQuizQuestion(courseId: number | null, quizId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (question_id: number) => {
      const { data, error } = await supabase.functions.invoke('canvas-quiz', {
        body: { action: 'delete_question', course_id: courseId, quiz_id: quizId, question_id },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-quiz', courseId, quizId] });
    },
  });
}

export interface CanvasCourseAnalytics {
  ok: true;
  student_summaries: Array<{
    user_id: number; name: string;
    page_views: number; participations: number;
    on_time: number; late: number; missing: number;
  }>;
  assignments: Array<{
    assignment_id: number; title: string;
    points_possible: number | null;
    due_at: string | null; muted: boolean;
    min_score: number | null; max_score: number | null; median: number | null;
    on_time: number; late: number; missing: number;
  }>;
  activity: { by_date: Array<{ date: string; views: number; participations: number }>; by_category: Array<{ category: string; views: number }> };
  total_students: number;
  analytics_disabled: boolean;
}

export function useCanvasCourseAnalytics(courseId: number | null) {
  return useQuery({
    queryKey: ['canvas-course-analytics', courseId],
    enabled: courseId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-course-analytics', {
        body: { course_id: courseId },
      });
      if (error) throw error;
      return data as CanvasCourseAnalytics | ErrResponse;
    },
    staleTime: 60_000,
  });
}

export interface CanvasGroup {
  id: number; name: string; members_count: number;
}
export interface CanvasGroupMember {
  id: number; name: string; sortable_name: string | null;
  avatar_url: string | null; is_self: boolean;
}

export function useMyGroup(groupCategoryId: number | null) {
  return useQuery({
    queryKey: ['canvas-my-group', groupCategoryId],
    enabled: groupCategoryId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-my-group', {
        body: { group_category_id: groupCategoryId },
      });
      if (error) throw error;
      return data as { ok: true; group: CanvasGroup | null; members: CanvasGroupMember[] } | ErrResponse;
    },
    staleTime: 60_000,
  });
}

export interface CanvasPeerReview {
  id: number;
  user_id: number;
  assessor_id: number;
  workflow_state: 'assigned' | 'completed';
  reviewee_name: string;
  reviewee_avatar: string | null;
}

export function useMyPeerReviews(courseId: number | null, assignmentId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['canvas-peer-reviews', 'mine', courseId, assignmentId],
    enabled: enabled && courseId !== null && assignmentId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-peer-reviews', {
        body: { action: 'mine', course_id: courseId, assignment_id: assignmentId },
      });
      if (error) throw error;
      return data as { ok: true; reviews: CanvasPeerReview[] } | ErrResponse;
    },
    staleTime: 30_000,
  });
}

export interface CanvasSubmissionDetail {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar: string | null;
  score: number | null;
  grade: string | null;
  submitted_at: string | null;
  late: boolean;
  missing: boolean;
  workflow_state: string;
  submission_type: string | null;
  body: string | null;
  url: string | null;
  attachments: Array<{ id: number; name: string; url: string; content_type: string; size: number }>;
  comments: Array<{ id: number; body: string; author: string; at: string }>;
  rubric_assessment: Record<string, { points?: number; rating_id?: string; comments?: string }> | null;
}

export function useCanvasSubmission(courseId: number | null, assignmentId: number | null, userId: number | null) {
  return useQuery({
    queryKey: ['canvas-submission', courseId, assignmentId, userId],
    enabled: courseId !== null && assignmentId !== null && userId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-get-submission', {
        body: { course_id: courseId, assignment_id: assignmentId, user_id: userId },
      });
      if (error) throw error;
      return data as { ok: true; submission: CanvasSubmissionDetail } | ErrResponse;
    },
    staleTime: 10_000,
  });
}

export interface CanvasConversation {
  id: number;
  subject: string | null;
  last_message: string | null;
  last_message_at: string | null;
  message_count: number;
  workflow_state: string;
  starred: boolean;
  participants: Array<{ id: number; name: string; avatar_url: string | null }>;
}
export interface CanvasConversationDetail {
  id: number;
  subject: string | null;
  messages: Array<{ id: number; author_id: number; created_at: string; body: string }>;
  participants: Array<{ id: number; name: string; avatar_url: string | null }>;
}
export interface CanvasRecipient {
  id: number | string;
  name: string;
  type: string | null;
  avatar_url: string | null;
}

export function useCanvasInbox(scope: 'inbox' | 'sent' | 'archived' | 'unread' = 'inbox') {
  return useQuery({
    queryKey: ['canvas-inbox', scope],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-inbox', {
        body: { action: 'list', scope },
      });
      if (error) throw error;
      return data as { ok: true; conversations: CanvasConversation[] } | ErrResponse;
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useCanvasConversation(conversationId: number | null) {
  return useQuery({
    queryKey: ['canvas-conversation', conversationId],
    enabled: conversationId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-inbox', {
        body: { action: 'get', conversation_id: conversationId },
      });
      if (error) throw error;
      return data as { ok: true; conversation: CanvasConversationDetail } | ErrResponse;
    },
    staleTime: 10_000,
  });
}

export function useReplyToConversation(conversationId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data, error } = await supabase.functions.invoke('canvas-inbox', {
        body: { action: 'reply', conversation_id: conversationId, body },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-conversation', conversationId] });
      qc.invalidateQueries({ queryKey: ['canvas-inbox'] });
    },
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      recipient_ids: number[]; body: string; subject?: string; context_code?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('canvas-inbox', {
        body: { action: 'create', ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-inbox'] });
    },
  });
}

export function useSearchRecipients() {
  return useMutation({
    mutationFn: async (args: { q: string; context_code?: string }) => {
      const { data, error } = await supabase.functions.invoke('canvas-inbox', {
        body: { action: 'search', ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return (data as { ok: true; recipients: CanvasRecipient[] }).recipients;
    },
  });
}

export interface CanvasDiscussionEntry {
  id: number;
  user_id: number;
  user_name: string;
  message: string;
  created_at: string;
  replies: Array<{ id: number; user_id: number; user_name: string; message: string; created_at: string }>;
}

export function useDiscussionEntries(courseId: number | null, topicId: number | null) {
  return useQuery({
    queryKey: ['canvas-discussion-entries', courseId, topicId],
    enabled: courseId !== null && topicId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('canvas-discussion-topic', {
        body: { action: 'list_entries', course_id: courseId, topic_id: topicId },
      });
      if (error) throw error;
      return data as { ok: true; entries: CanvasDiscussionEntry[] } | ErrResponse;
    },
    staleTime: 15_000,
  });
}

export function usePostDiscussionEntry(courseId: number | null, topicId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      const { data, error } = await supabase.functions.invoke('canvas-discussion-topic', {
        body: { action: 'post_entry', course_id: courseId, topic_id: topicId, message },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-discussion-entries', courseId, topicId] });
    },
  });
}

export function useReplyToEntry(courseId: number | null, topicId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { entry_id: number; message: string }) => {
      const { data, error } = await supabase.functions.invoke('canvas-discussion-topic', {
        body: { action: 'reply', course_id: courseId, topic_id: topicId, ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-discussion-entries', courseId, topicId] });
    },
  });
}

export function useCreateDiscussionTopic(courseId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { title: string; message: string }) => {
      const { data, error } = await supabase.functions.invoke('canvas-discussion-topic', {
        body: { action: 'create_topic', course_id: courseId, ...args },
      });
      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.detail || data.error);
      return data as { ok: true; topic: { id: number; title: string } };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-course-tab', courseId, 'discussions'] });
    },
  });
}

type SubmitArgs =
  | { course_id: number; assignment_id: number; type: 'text'; body: string; comment?: string }
  | { course_id: number; assignment_id: number; type: 'url'; url: string; comment?: string }
  | { course_id: number; assignment_id: number; type: 'file'; files: File[]; comment?: string };

export function useSubmitAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: SubmitArgs) => {
      const callSubmit = async (extra: Record<string, unknown>) => {
        const { data, error } = await supabase.functions.invoke('canvas-submit-assignment', {
          body: {
            course_id: args.course_id,
            assignment_id: args.assignment_id,
            comment: args.comment,
            ...extra,
          },
        });
        if (error) throw error;
        if (data && 'error' in data) throw new Error(data.detail || data.error);
        return data;
      };

      if (args.type === 'text') {
        return await callSubmit({ submission_type: 'online_text_entry', body: args.body });
      }
      if (args.type === 'url') {
        return await callSubmit({ submission_type: 'online_url', url: args.url });
      }

      // File flow: 3 steps per file (init → direct upload → collect file_id),
      // then a single submit call with all file_ids.
      const fileIds: number[] = [];
      for (const f of args.files) {
        const { data: init, error: initErr } = await supabase.functions.invoke('canvas-submission-upload-init', {
          body: {
            course_id: args.course_id,
            assignment_id: args.assignment_id,
            name: f.name,
            size: f.size,
            content_type: f.type || 'application/octet-stream',
          },
        });
        if (initErr) throw initErr;
        if (init && 'error' in init) throw new Error(init.detail || init.error);
        const { upload_url, upload_params } = init as { upload_url: string; upload_params: Record<string, string> };

        const fd = new FormData();
        for (const [k, v] of Object.entries(upload_params)) fd.append(k, v);
        fd.append('file', f);
        const uploadRes = await fetch(upload_url, { method: 'POST', body: fd });
        if (!uploadRes.ok) {
          throw new Error(`Upload to Canvas failed (${uploadRes.status}): ${await uploadRes.text()}`);
        }
        // Canvas returns the file metadata directly (or a 3xx that fetch follows).
        const fileResp = await uploadRes.json() as { id: number };
        fileIds.push(fileResp.id);
      }
      return await callSubmit({ submission_type: 'online_upload', file_ids: fileIds });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['canvas-assignment', vars.course_id, vars.assignment_id] });
      qc.invalidateQueries({ queryKey: ['canvas-course', vars.course_id] });
      qc.invalidateQueries({ queryKey: ['canvas-course-grades', vars.course_id] });
    },
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { name: string; course_code?: string }) => {
      const { data, error } = await supabase.functions.invoke('canvas-create-course', { body: args });
      if (error) throw error;
      return data as { ok: true; course: { id: number; name: string; code: string | null } };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas-courses'] });
    },
  });
}
