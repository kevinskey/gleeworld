// Canvas REST API client — used by the Canvas-backed Academy edge
// functions. All Canvas state lives in Canvas; we just talk to it.
//
// Auth model (Phase 1): a single Site-Admin access token per Canvas
// instance, stored in gw_canvas_instances.admin_token. Every API call
// is "masqueraded" as the right Canvas user when we need user-scoped
// data — Canvas supports `?as_user_id={id}` on most endpoints, which
// is the standard pattern for admin tokens.
//
// Phase 2+ we'll add per-user OAuth2 so users can revoke access and
// the audit log shows real actors instead of the integration admin.

export interface CanvasInstance {
  id: string;
  base_url: string;
  admin_token: string;
}

export class CanvasClient {
  constructor(private readonly inst: CanvasInstance) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.inst.admin_token}`,
      "Accept": "application/json",
      ...extra,
    };
  }

  private url(path: string, query: Record<string, string | number | undefined> = {}): string {
    const u = new URL(path.startsWith("/") ? path : `/${path}`, this.inst.base_url);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    }
    return u.toString();
  }

  async get<T = unknown>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    const res = await fetch(this.url(path, query), { headers: this.headers() });
    if (!res.ok) throw new Error(`Canvas GET ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json() as T;
  }

  async post<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.url(path), {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Canvas POST ${path} ${res.status}: ${(await res.text()).slice(0, 500)}`);
    return await res.json() as T;
  }

  async put<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.url(path), {
      method: "PUT",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Canvas PUT ${path} ${res.status}: ${(await res.text()).slice(0, 500)}`);
    return await res.json() as T;
  }

  // ── Domain methods ──────────────────────────────────────────────

  /** Create or find a sub-account under the root account. Used for tenant onboarding. */
  async ensureSubaccount(name: string, parentAccountId = 1): Promise<{ id: number; name: string }> {
    // Canvas's "search account" endpoint takes a name fragment.
    const matches = await this.get<Array<{ id: number; name: string }>>(
      `/api/v1/accounts/${parentAccountId}/sub_accounts`,
      { recursive: "true", per_page: 100 },
    );
    const hit = matches.find((a) => a.name === name);
    if (hit) return hit;
    return await this.post<{ id: number; name: string }>(
      `/api/v1/accounts/${parentAccountId}/sub_accounts`,
      { account: { name } },
    );
  }

  /** Create or find a Canvas user by email. Returns canvas user id. */
  async ensureUser(args: { email: string; name?: string; accountId: number }): Promise<{ id: number; created: boolean }> {
    // Search by login_id (Pseudonym.unique_id) in the given account.
    try {
      const found = await this.get<Array<{ id: number }>>(
        `/api/v1/accounts/${args.accountId}/users`,
        { search_term: args.email, per_page: 5 },
      );
      const hit = found.find(() => true); // first match — Canvas search is precise on email
      if (hit) return { id: hit.id, created: false };
    } catch { /* fall through to create */ }
    const u = await this.post<{ id: number }>(
      `/api/v1/accounts/${args.accountId}/users`,
      {
        user: { name: args.name ?? args.email, skip_registration: true },
        pseudonym: { unique_id: args.email, send_confirmation: false },
        communication_channel: { type: "email", address: args.email, skip_confirmation: true },
      },
    );
    return { id: u.id, created: true };
  }

  /** List courses a given user is enrolled in (any role). */
  async listUserCourses(userId: number): Promise<Array<{ id: number; name: string; course_code?: string; workflow_state: string }>> {
    return await this.get<Array<{ id: number; name: string; course_code?: string; workflow_state: string }>>(
      `/api/v1/users/${userId}/courses`,
      { per_page: 100, "state[]": "available", "include[]": "term" },
    );
  }

  /** Get a single course, scoped to the calling user. */
  async getCourse(courseId: number, asUserId: number): Promise<{
    id: number;
    name: string;
    course_code?: string;
    syllabus_body?: string;
    start_at?: string;
    end_at?: string;
    public_description?: string;
  }> {
    return await this.get(`/api/v1/courses/${courseId}`, {
      as_user_id: asUserId,
      "include[]": "syllabus_body",
    });
  }

  /** List modules in a course. */
  async listCourseModules(courseId: number, asUserId: number): Promise<Array<{
    id: number;
    name: string;
    position: number;
    state?: string;
    items_count?: number;
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/modules`, {
      as_user_id: asUserId,
      per_page: 100,
    });
  }

  /** List assignments in a course. */
  async listCourseAssignments(courseId: number, asUserId: number): Promise<Array<{
    id: number;
    name: string;
    description?: string;
    due_at?: string;
    points_possible?: number;
    submission_types?: string[];
    workflow_state?: string;
    has_submitted_submissions?: boolean;
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/assignments`, {
      as_user_id: asUserId,
      per_page: 100,
      "include[]": "submission",
      order_by: "due_at",
    });
  }

  /** Get one assignment with the user's submission attached. Also pulls
   * rubric + anonymous_grading flag so the grader UI can render correctly. */
  async getAssignment(courseId: number, assignmentId: number, asUserId: number): Promise<{
    id: number;
    name: string;
    description?: string;
    due_at?: string;
    points_possible?: number;
    submission_types?: string[];
    html_url?: string;
    anonymous_grading?: boolean;
    group_category_id?: number | null;
    rubric?: Array<{
      id: string; description: string; points: number;
      ratings: Array<{ id: string; description: string; long_description?: string; points: number }>;
    }>;
    rubric_settings?: {
      points_possible: number;
      free_form_criterion_comments?: boolean;
      hide_score_total?: boolean;
    };
    submission?: {
      id: number;
      score?: number | null;
      grade?: string | null;
      submitted_at?: string | null;
      late?: boolean;
      missing?: boolean;
      workflow_state?: string;
      submission_comments?: Array<{ comment: string; author_name: string; created_at: string }>;
    };
  }> {
    const u = new URL(`/api/v1/courses/${courseId}/assignments/${assignmentId}`, this.inst.base_url);
    u.searchParams.set("as_user_id", String(asUserId));
    u.searchParams.append("include[]", "submission");
    u.searchParams.append("include[]", "rubric_assessment");
    const res = await fetch(u.toString(), { headers: this.headers() });
    if (!res.ok) throw new Error(`Canvas GET assignment ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  }

  /** Create a course inside a sub-account. `offer` is a top-level param
   * per Canvas API — putting it inside `course` silently leaves the
   * course unpublished, then listUserCourses with state[]=available
   * returns empty. */
  async createCourse(args: {
    accountId: number;
    name: string;
    courseCode?: string;
    isPublic?: boolean;
  }): Promise<{ id: number; name: string; course_code?: string }> {
    return await this.post(`/api/v1/accounts/${args.accountId}/courses`, {
      course: {
        name: args.name,
        course_code: args.courseCode,
        is_public: args.isPublic ?? false,
      },
      offer: true,
    });
  }

  /** Enroll a Canvas user in a course. */
  async enrollUser(args: {
    courseId: number;
    userId: number;
    type?: "StudentEnrollment" | "TeacherEnrollment" | "TaEnrollment" | "ObserverEnrollment" | "DesignerEnrollment";
  }): Promise<{ id: number }> {
    return await this.post(`/api/v1/courses/${args.courseId}/enrollments`, {
      enrollment: {
        user_id: args.userId,
        type: args.type ?? "StudentEnrollment",
        enrollment_state: "active",
        notify: false,
      },
    });
  }

  /** List all courses in a sub-account (admin view). */
  async listAccountCourses(accountId: number): Promise<Array<{ id: number; name: string; course_code?: string; workflow_state: string }>> {
    return await this.get(`/api/v1/accounts/${accountId}/courses`, {
      per_page: 100,
      "include[]": "term",
    });
  }

  /** List quizzes in a course (classic Quizzes API). */
  async listCourseQuizzes(courseId: number, asUserId: number): Promise<Array<{
    id: number;
    title: string;
    due_at?: string | null;
    points_possible?: number | null;
    quiz_type?: string;
    question_count?: number;
    published?: boolean;
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/quizzes`, {
      as_user_id: asUserId,
      per_page: 100,
    });
  }

  /** List discussion topics in a course. */
  async listCourseDiscussions(courseId: number, asUserId: number): Promise<Array<{
    id: number;
    title: string;
    message?: string;
    posted_at?: string;
    last_reply_at?: string;
    discussion_subentry_count?: number;
    unread_count?: number;
    pinned?: boolean;
    locked?: boolean;
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/discussion_topics`, {
      as_user_id: asUserId,
      per_page: 100,
    });
  }

  /** List enrollments (people) in a course. */
  async listCourseEnrollments(courseId: number, asUserId: number): Promise<Array<{
    id: number;
    user_id: number;
    type: string;
    role: string;
    enrollment_state: string;
    user?: { name: string; sortable_name?: string; avatar_url?: string };
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/enrollments`, {
      as_user_id: asUserId,
      per_page: 100,
      "include[]": "avatar_url",
    });
  }

  /** List folders inside a course (flat — folders have parent_folder_id refs). */
  async listCourseFolders(courseId: number, asUserId: number): Promise<Array<{
    id: number; name: string; full_name: string; parent_folder_id: number | null;
    files_count?: number; folders_count?: number;
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/folders`, {
      as_user_id: asUserId, per_page: 100,
    });
  }

  /** List files in a specific folder. */
  async listFolderFiles(folderId: number, asUserId: number): Promise<Array<{
    id: number; display_name: string; filename: string; size: number;
    "content-type": string; url: string; created_at: string; updated_at: string;
  }>> {
    return await this.get(`/api/v1/folders/${folderId}/files`, {
      as_user_id: asUserId, per_page: 100,
    });
  }

  /** List calendar events (events + assignments) across context codes. */
  async listCalendarEvents(args: {
    asUserId: number;
    contextCodes: string[];
    startDate: string;
    endDate: string;
    type?: "event" | "assignment";
  }): Promise<Array<{
    id: string | number;
    title: string;
    type?: string;
    start_at?: string;
    end_at?: string;
    all_day?: boolean;
    description?: string;
    context_code?: string;
    html_url?: string;
    assignment?: {
      id: number;
      name: string;
      points_possible?: number;
      due_at?: string;
      course_id?: number;
    };
  }>> {
    const query: Record<string, string | number> = {
      as_user_id: args.asUserId,
      start_date: args.startDate,
      end_date: args.endDate,
      per_page: 100,
      type: args.type ?? "event",
    };
    const u = new URL("/api/v1/calendar_events", this.inst.base_url);
    for (const [k, v] of Object.entries(query)) u.searchParams.set(k, String(v));
    for (const c of args.contextCodes) u.searchParams.append("context_codes[]", c);
    const res = await fetch(u.toString(), { headers: this.headers() });
    if (!res.ok) throw new Error(`Canvas GET /calendar_events ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  }

  /** Toggle a course's blueprint status (must be admin). */
  async setCourseBlueprint(args: {
    courseId: number; asUserId: number; blueprint: boolean;
    restrictions?: { content?: boolean; points?: boolean; due_dates?: boolean; availability_dates?: boolean };
  }): Promise<unknown> {
    const course: Record<string, unknown> = { blueprint: args.blueprint };
    if (args.blueprint && args.restrictions) {
      course.blueprint_restrictions = args.restrictions;
      course.use_blueprint_restrictions_by_object_type = false;
    }
    return await this.put(
      `/api/v1/courses/${args.courseId}?as_user_id=${args.asUserId}`,
      { course },
    );
  }

  /** List courses associated with a blueprint course. */
  async listBlueprintAssociations(args: {
    courseId: number; asUserId: number;
  }): Promise<Array<{ id: number; name: string; course_code?: string }>> {
    return await this.get(
      `/api/v1/courses/${args.courseId}/blueprint_templates/default/associated_courses`,
      { as_user_id: args.asUserId, per_page: 100 },
    );
  }

  /** Add / remove associated courses from a blueprint. */
  async updateBlueprintAssociations(args: {
    courseId: number; asUserId: number;
    add?: number[]; remove?: number[];
  }): Promise<unknown> {
    const body: Record<string, unknown> = {};
    if (args.add?.length) body.course_ids_to_add = args.add;
    if (args.remove?.length) body.course_ids_to_remove = args.remove;
    return await this.put(
      `/api/v1/courses/${args.courseId}/blueprint_templates/default/update_associations?as_user_id=${args.asUserId}`,
      body,
    );
  }

  /** Trigger a sync from the blueprint to all associated courses. */
  async syncBlueprint(args: {
    courseId: number; asUserId: number;
    publish_after_initial_sync?: boolean; comment?: string;
  }): Promise<{ id: number; workflow_state: string }> {
    return await this.post(
      `/api/v1/courses/${args.courseId}/blueprint_templates/default/migrations?as_user_id=${args.asUserId}`,
      {
        publish_after_initial_sync: args.publish_after_initial_sync ?? false,
        comment: args.comment ?? "",
      },
    );
  }

  /** Get the latest blueprint migration status. */
  async getBlueprintMigrationStatus(args: {
    courseId: number; asUserId: number;
  }): Promise<Array<{ id: number; workflow_state: string; created_at: string; comment?: string }>> {
    return await this.get(
      `/api/v1/courses/${args.courseId}/blueprint_templates/default/migrations`,
      { as_user_id: args.asUserId, per_page: 10 },
    );
  }

  /** Get the root outcome group for a course. */
  async getRootOutcomeGroup(courseId: number, asUserId: number): Promise<{
    id: number; title: string; description?: string;
  }> {
    return await this.get(`/api/v1/courses/${courseId}/root_outcome_group`, {
      as_user_id: asUserId,
    });
  }

  /** List all outcome groups under a parent (recursive). */
  async listOutcomeGroups(courseId: number, asUserId: number): Promise<Array<{
    id: number; title: string; parent_outcome_group?: { id: number };
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/outcome_groups`, {
      as_user_id: asUserId, per_page: 100,
    });
  }

  /** List outcomes within a course's outcome group. */
  async listOutcomesInGroup(courseId: number, groupId: number, asUserId: number): Promise<Array<{
    outcome: {
      id: number; title: string; description?: string;
      points_possible: number; mastery_points: number;
      ratings?: Array<{ description: string; points: number }>;
    };
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/outcome_groups/${groupId}/outcomes`, {
      as_user_id: asUserId, per_page: 100, outcome_style: "full",
    });
  }

  /** Create an outcome inside a course's outcome group. Canvas's API
   * requires the course context — the bare /outcome_groups/:id/outcomes
   * endpoint 404s for course-scoped groups. */
  async createOutcome(args: {
    courseId: number; groupId: number; asUserId: number;
    title: string; description?: string;
    points_possible: number; mastery_points: number;
    ratings: Array<{ description: string; points: number }>;
  }): Promise<{ outcome: { id: number } }> {
    return await this.post(
      `/api/v1/courses/${args.courseId}/outcome_groups/${args.groupId}/outcomes?as_user_id=${args.asUserId}`,
      {
        title: args.title,
        description: args.description ?? "",
        mastery_points: args.mastery_points,
        ratings: args.ratings,
        calculation_method: "highest",
      },
    );
  }

  /** Learning Mastery rollups: aggregated outcome scores per student. */
  async getOutcomeRollups(courseId: number, asUserId: number): Promise<{
    rollups: Array<{
      links: { user: string }; // user id as string
      scores: Array<{ score: number | null; links: { outcome: string } }>;
    }>;
    linked?: {
      outcomes?: Array<{ id: number; title: string; mastery_points: number }>;
      users?: Array<{ id: number; name: string; sortable_name?: string }>;
    };
  }> {
    const u = new URL(`/api/v1/courses/${courseId}/outcome_rollups`, this.inst.base_url);
    u.searchParams.set("as_user_id", String(asUserId));
    u.searchParams.append("include[]", "outcomes");
    u.searchParams.append("include[]", "users");
    u.searchParams.set("per_page", "100");
    const res = await fetch(u.toString(), { headers: this.headers() });
    if (!res.ok) throw new Error(`Canvas GET outcome_rollups ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  }

  /** List rubrics defined at the course level. */
  async listCourseRubrics(courseId: number, asUserId: number): Promise<Array<{
    id: number; title: string; points_possible: number; free_form_criterion_comments: boolean;
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/rubrics`, {
      as_user_id: asUserId, per_page: 100,
    });
  }

  /** Get a single rubric with criteria. */
  async getRubric(courseId: number, rubricId: number, asUserId: number): Promise<{
    id: number; title: string; points_possible: number;
    free_form_criterion_comments: boolean;
    data: Array<{
      id: string; description: string; long_description?: string;
      points: number;
      ratings: Array<{ id: string; description: string; long_description?: string; points: number }>;
    }>;
  }> {
    return await this.get(`/api/v1/courses/${courseId}/rubrics/${rubricId}`, {
      as_user_id: asUserId,
    });
  }

  /** Create a rubric. Optionally attach to an assignment. Canvas API
   * expects criteria as a hash keyed by string indices. */
  async createRubric(args: {
    courseId: number; asUserId: number;
    title: string;
    criteria: Array<{
      description: string; long_description?: string; points: number;
      ratings: Array<{ description: string; long_description?: string; points: number }>;
    }>;
    free_form_criterion_comments?: boolean;
    assignment_id?: number;
  }): Promise<{ rubric: { id: number } }> {
    const criteriaHash: Record<string, unknown> = {};
    args.criteria.forEach((c, i) => {
      const ratingsHash: Record<string, unknown> = {};
      c.ratings.forEach((r, j) => {
        ratingsHash[String(j)] = {
          description: r.description,
          long_description: r.long_description ?? "",
          points: r.points,
        };
      });
      criteriaHash[String(i)] = {
        description: c.description,
        long_description: c.long_description ?? "",
        points: c.points,
        ratings: ratingsHash,
      };
    });
    const payload: Record<string, unknown> = {
      rubric: {
        title: args.title,
        free_form_criterion_comments: args.free_form_criterion_comments ?? false,
        criteria: criteriaHash,
      },
    };
    if (args.assignment_id) {
      payload.rubric_association = {
        association_id: args.assignment_id,
        association_type: "Assignment",
        use_for_grading: true,
        purpose: "grading",
      };
    }
    return await this.post(
      `/api/v1/courses/${args.courseId}/rubrics?as_user_id=${args.asUserId}`,
      payload,
    );
  }

  /** Update a rubric. */
  async updateRubric(args: {
    courseId: number; rubricId: number; asUserId: number;
    title: string;
    criteria: Array<{
      id?: string;
      description: string; long_description?: string; points: number;
      ratings: Array<{ description: string; long_description?: string; points: number }>;
    }>;
    free_form_criterion_comments?: boolean;
  }): Promise<unknown> {
    const criteriaHash: Record<string, unknown> = {};
    args.criteria.forEach((c, i) => {
      const ratingsHash: Record<string, unknown> = {};
      c.ratings.forEach((r, j) => {
        ratingsHash[String(j)] = {
          description: r.description,
          long_description: r.long_description ?? "",
          points: r.points,
        };
      });
      criteriaHash[String(i)] = {
        description: c.description,
        long_description: c.long_description ?? "",
        points: c.points,
        ratings: ratingsHash,
      };
    });
    return await this.put(
      `/api/v1/courses/${args.courseId}/rubrics/${args.rubricId}?as_user_id=${args.asUserId}`,
      {
        rubric: {
          title: args.title,
          free_form_criterion_comments: args.free_form_criterion_comments ?? false,
          criteria: criteriaHash,
        },
      },
    );
  }

  /** Delete a rubric. */
  async deleteRubric(courseId: number, rubricId: number, asUserId: number): Promise<unknown> {
    const u = new URL(`/api/v1/courses/${courseId}/rubrics/${rubricId}`, this.inst.base_url);
    u.searchParams.set("as_user_id", String(asUserId));
    const res = await fetch(u.toString(), { method: "DELETE", headers: this.headers() });
    if (!res.ok) throw new Error(`Canvas DELETE rubric ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  }

  /** Create a quiz in a course (classic Quizzes). */
  async createQuiz(args: {
    courseId: number; asUserId: number;
    title: string; description?: string; quiz_type?: string;
    time_limit?: number; points_possible?: number;
    published?: boolean; due_at?: string;
    allowed_attempts?: number; scoring_policy?: string;
  }): Promise<{ id: number; title: string }> {
    const quiz: Record<string, unknown> = { title: args.title };
    if (args.description !== undefined) quiz.description = args.description;
    if (args.quiz_type) quiz.quiz_type = args.quiz_type;
    if (args.time_limit !== undefined) quiz.time_limit = args.time_limit;
    if (args.points_possible !== undefined) quiz.points_possible = args.points_possible;
    if (args.published !== undefined) quiz.published = args.published;
    if (args.due_at !== undefined) quiz.due_at = args.due_at;
    if (args.allowed_attempts !== undefined) quiz.allowed_attempts = args.allowed_attempts;
    if (args.scoring_policy) quiz.scoring_policy = args.scoring_policy;
    return await this.post(`/api/v1/courses/${args.courseId}/quizzes?as_user_id=${args.asUserId}`, { quiz });
  }

  /** Update an existing quiz. */
  async updateQuiz(args: {
    courseId: number; quizId: number; asUserId: number; quiz: Record<string, unknown>;
  }): Promise<{ id: number; title: string }> {
    return await this.put(
      `/api/v1/courses/${args.courseId}/quizzes/${args.quizId}?as_user_id=${args.asUserId}`,
      { quiz: args.quiz },
    );
  }

  /** Get a single quiz. */
  async getQuiz(courseId: number, quizId: number, asUserId: number): Promise<{
    id: number; title: string; description?: string;
    quiz_type?: string; time_limit?: number | null;
    points_possible?: number; published?: boolean;
    due_at?: string | null; allowed_attempts?: number;
    scoring_policy?: string; question_count: number;
  }> {
    return await this.get(`/api/v1/courses/${courseId}/quizzes/${quizId}`, {
      as_user_id: asUserId,
    });
  }

  /** List questions for a quiz. */
  async listQuizQuestions(courseId: number, quizId: number, asUserId: number): Promise<Array<{
    id: number; quiz_id: number; position: number;
    question_name?: string; question_text?: string;
    question_type: string; points_possible?: number;
    answers?: Array<{ id: number | string; text: string; weight: number; comments?: string }>;
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/quizzes/${quizId}/questions`, {
      as_user_id: asUserId, per_page: 100,
    });
  }

  /** Add a question to a quiz. */
  async addQuizQuestion(args: {
    courseId: number; quizId: number; asUserId: number;
    question: {
      question_name?: string;
      question_text: string;
      question_type: string;
      points_possible?: number;
      answers?: Array<{ answer_text?: string; answer_weight: number; answer_comments?: string }>;
    };
  }): Promise<{ id: number }> {
    return await this.post(
      `/api/v1/courses/${args.courseId}/quizzes/${args.quizId}/questions?as_user_id=${args.asUserId}`,
      { question: args.question },
    );
  }

  /** Update a quiz question. */
  async updateQuizQuestion(args: {
    courseId: number; quizId: number; questionId: number; asUserId: number;
    question: Record<string, unknown>;
  }): Promise<{ id: number }> {
    return await this.put(
      `/api/v1/courses/${args.courseId}/quizzes/${args.quizId}/questions/${args.questionId}?as_user_id=${args.asUserId}`,
      { question: args.question },
    );
  }

  /** Delete a quiz question. */
  async deleteQuizQuestion(args: {
    courseId: number; quizId: number; questionId: number; asUserId: number;
  }): Promise<unknown> {
    const u = new URL(
      `/api/v1/courses/${args.courseId}/quizzes/${args.quizId}/questions/${args.questionId}`,
      this.inst.base_url,
    );
    u.searchParams.set("as_user_id", String(args.asUserId));
    const res = await fetch(u.toString(), { method: "DELETE", headers: this.headers() });
    if (!res.ok) throw new Error(`Canvas DELETE quiz question ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  }

  /** Course analytics: per-student summary (page_views, participations, tardiness). */
  async getCourseStudentSummaries(courseId: number, asUserId: number): Promise<Array<{
    id: number; page_views: number; max_page_view: number;
    participations: number; max_participations: number;
    tardiness_breakdown?: { total: number; on_time: number; late: number; missing: number; floating: number };
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/analytics/student_summaries`, {
      as_user_id: asUserId, per_page: 100,
    });
  }

  /** Course analytics: per-assignment distribution + submission stats. */
  async getCourseAssignmentAnalytics(courseId: number, asUserId: number): Promise<Array<{
    assignment_id: number; title: string; points_possible: number | null;
    due_at?: string | null; muted?: boolean;
    min_score?: number; max_score?: number; median?: number;
    first_quartile?: number; third_quartile?: number;
    tardiness_breakdown?: { total: number; on_time: number; late: number; missing: number };
    status?: { on_time: number; late: number; missing: number };
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/analytics/assignments`, {
      as_user_id: asUserId, per_page: 100,
    });
  }

  /** Course activity timeline (page views + participations bucketed by day). */
  async getCourseActivity(courseId: number, asUserId: number): Promise<{
    by_date: Array<{ date: string; views: number; participations: number }>;
    by_category: Array<{ category: string; views: number }>;
  }> {
    return await this.get(`/api/v1/courses/${courseId}/analytics/activity`, {
      as_user_id: asUserId,
    });
  }

  /** List user's groups (optionally filter by group_category_id). */
  async listUserGroups(userId: number, asUserId: number): Promise<Array<{
    id: number; name: string; group_category_id: number; members_count: number;
  }>> {
    return await this.get(`/api/v1/users/${userId}/groups`, {
      as_user_id: asUserId, per_page: 50,
    });
  }

  /** List members of a group. Returns User objects. */
  async listGroupMembers(groupId: number, asUserId: number): Promise<Array<{
    id: number; name: string; sortable_name?: string; avatar_url?: string;
  }>> {
    return await this.get(`/api/v1/groups/${groupId}/users`, {
      as_user_id: asUserId, per_page: 50, "include[]": "avatar_url",
    });
  }

  /** List peer reviews assigned for an assignment. With include[]=user
   * each entry also has user (the reviewee). With include[]=submission_comments
   * it shows whether the review has been completed. */
  async listPeerReviews(args: {
    courseId: number; assignmentId: number; asUserId: number;
  }): Promise<Array<{
    id: number;
    user_id: number;        // reviewee (who is being reviewed)
    assessor_id: number;    // reviewer
    asset_id: number;
    asset_type: string;
    workflow_state: "assigned" | "completed";
    user?: { id: number; name: string; avatar_url?: string };
  }>> {
    const u = new URL(
      `/api/v1/courses/${args.courseId}/assignments/${args.assignmentId}/peer_reviews`,
      this.inst.base_url,
    );
    u.searchParams.set("as_user_id", String(args.asUserId));
    u.searchParams.append("include[]", "user");
    u.searchParams.append("include[]", "submission_comments");
    u.searchParams.set("per_page", "100");
    const res = await fetch(u.toString(), { headers: this.headers() });
    if (!res.ok) throw new Error(`Canvas GET peer_reviews ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  }

  /** Manually assign a peer review (teacher action). */
  async assignPeerReview(args: {
    courseId: number; assignmentId: number; asUserId: number;
    reviewerSubmissionId: number; reviewerUserId: number;
  }): Promise<{ id: number }> {
    return await this.post(
      `/api/v1/courses/${args.courseId}/assignments/${args.assignmentId}/submissions/${args.reviewerSubmissionId}/peer_reviews?as_user_id=${args.asUserId}`,
      { user_id: args.reviewerUserId },
    );
  }

  /** List all submissions for a course assignment, with user info. */
  async listAssignmentSubmissions(args: {
    courseId: number; assignmentId: number; asUserId: number;
  }): Promise<Array<{
    id: number; user_id: number; score: number | null; grade: string | null;
    submitted_at: string | null; late: boolean; missing: boolean;
    workflow_state: string;
    user?: { id: number; name: string; sortable_name?: string; avatar_url?: string };
  }>> {
    return await this.get(
      `/api/v1/courses/${args.courseId}/assignments/${args.assignmentId}/submissions`,
      {
        as_user_id: args.asUserId,
        per_page: 100,
        "include[]": "user",
      },
    );
  }

  /** Update a single submission's grade and/or add an instructor comment.
   * Optionally include a rubric assessment keyed by criterion id. */
  async updateSubmission(args: {
    courseId: number; assignmentId: number; userId: number; asUserId: number;
    posted_grade?: string;
    comment?: string;
    rubric_assessment?: Record<string, { points?: number; rating_id?: string; comments?: string }>;
  }): Promise<unknown> {
    const submission: Record<string, unknown> = {};
    if (args.posted_grade !== undefined) submission.posted_grade = args.posted_grade;
    const comment: Record<string, unknown> = {};
    if (args.comment) comment.text_comment = args.comment;
    const payload: Record<string, unknown> = {};
    if (Object.keys(submission).length) payload.submission = submission;
    if (Object.keys(comment).length) payload.comment = comment;
    if (args.rubric_assessment) payload.rubric_assessment = args.rubric_assessment;
    return await this.put(
      `/api/v1/courses/${args.courseId}/assignments/${args.assignmentId}/submissions/${args.userId}?as_user_id=${args.asUserId}`,
      payload,
    );
  }

  /** Get one submission with comments and rubric assessment. Used by SpeedGrader-lite. */
  async getSubmission(args: {
    courseId: number; assignmentId: number; userId: number; asUserId: number;
  }): Promise<{
    id: number; user_id: number; score: number | null; grade: string | null;
    submitted_at: string | null; late: boolean; missing: boolean; workflow_state: string;
    body?: string | null; url?: string | null;
    submission_type?: string;
    attachments?: Array<{ id: number; display_name: string; url: string; "content-type": string; size: number }>;
    submission_comments?: Array<{ id: number; comment: string; author_name: string; created_at: string }>;
    rubric_assessment?: Record<string, { points?: number; rating_id?: string; comments?: string }>;
    user?: { name: string; avatar_url?: string };
  }> {
    const u = new URL(
      `/api/v1/courses/${args.courseId}/assignments/${args.assignmentId}/submissions/${args.userId}`,
      this.inst.base_url,
    );
    u.searchParams.set("as_user_id", String(args.asUserId));
    u.searchParams.append("include[]", "submission_comments");
    u.searchParams.append("include[]", "rubric_assessment");
    u.searchParams.append("include[]", "user");
    const res = await fetch(u.toString(), { headers: this.headers() });
    if (!res.ok) throw new Error(`Canvas GET submission ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  }

  /** List conversations in the user's inbox. */
  async listConversations(asUserId: number, scope: "inbox" | "sent" | "archived" | "unread" = "inbox"): Promise<Array<{
    id: number; subject?: string; workflow_state: string; last_message?: string;
    last_message_at?: string; message_count: number; subscribed?: boolean;
    starred?: boolean; participants: Array<{ id: number; name: string; avatar_url?: string }>;
  }>> {
    return await this.get(`/api/v1/conversations`, {
      as_user_id: asUserId, scope, per_page: 50, "include[]": "participant_avatars",
    });
  }

  /** Get one conversation with its full message thread. */
  async getConversation(conversationId: number, asUserId: number): Promise<{
    id: number; subject?: string;
    messages: Array<{ id: number; author_id: number; created_at: string; body: string }>;
    participants: Array<{ id: number; name: string; avatar_url?: string }>;
  }> {
    return await this.get(`/api/v1/conversations/${conversationId}`, {
      as_user_id: asUserId,
    });
  }

  /** Start a new conversation with one or more recipients. */
  async createConversation(args: {
    asUserId: number; recipientIds: number[]; body: string; subject?: string;
    contextCode?: string;
  }): Promise<unknown> {
    return await this.post(`/api/v1/conversations?as_user_id=${args.asUserId}`, {
      recipients: args.recipientIds.map(String),
      body: args.body,
      ...(args.subject ? { subject: args.subject } : {}),
      ...(args.contextCode ? { context_code: args.contextCode } : {}),
    });
  }

  /** Reply / add message to existing conversation. */
  async addConversationMessage(args: {
    conversationId: number; asUserId: number; body: string;
  }): Promise<unknown> {
    return await this.post(
      `/api/v1/conversations/${args.conversationId}/add_message?as_user_id=${args.asUserId}`,
      { body: args.body },
    );
  }

  /** Search for recipients (users, contexts) for new conversations. */
  async searchRecipients(args: {
    asUserId: number; search: string; contextCode?: string;
  }): Promise<Array<{ id: string | number; name: string; type?: string; avatar_url?: string }>> {
    return await this.get(`/api/v1/search/recipients`, {
      as_user_id: args.asUserId,
      search: args.search,
      per_page: 20,
      ...(args.contextCode ? { context: args.contextCode } : {}),
    });
  }

  /** List announcements for a course. Backed by discussion_topics?only_announcements=true. */
  async listCourseAnnouncements(courseId: number, asUserId: number): Promise<Array<{
    id: number; title: string; message?: string;
    posted_at?: string; delayed_post_at?: string;
    author?: { display_name?: string; avatar_image_url?: string };
  }>> {
    return await this.get(`/api/v1/courses/${courseId}/discussion_topics`, {
      as_user_id: asUserId,
      per_page: 50,
      only_announcements: "true",
    });
  }

  /** Post a new announcement to a course. */
  async postAnnouncement(args: {
    courseId: number; asUserId: number; title: string; message: string;
  }): Promise<{ id: number; title: string }> {
    return await this.post(
      `/api/v1/courses/${args.courseId}/discussion_topics?as_user_id=${args.asUserId}`,
      {
        title: args.title,
        message: args.message,
        is_announcement: true,
        published: true,
      },
    );
  }

  /** Create a new discussion topic (not an announcement). */
  async createDiscussionTopic(args: {
    courseId: number; asUserId: number; title: string; message: string;
  }): Promise<{ id: number; title: string }> {
    return await this.post(
      `/api/v1/courses/${args.courseId}/discussion_topics?as_user_id=${args.asUserId}`,
      {
        title: args.title,
        message: args.message,
        published: true,
      },
    );
  }

  /** List entries (top-level posts) for a discussion topic. */
  async listDiscussionEntries(args: {
    courseId: number; topicId: number; asUserId: number;
  }): Promise<Array<{
    id: number; user_id: number; user_name?: string; message: string;
    created_at: string; recent_replies?: Array<{ id: number; user_id: number; user_name?: string; message: string; created_at: string }>;
  }>> {
    return await this.get(
      `/api/v1/courses/${args.courseId}/discussion_topics/${args.topicId}/entries`,
      { as_user_id: args.asUserId, per_page: 100 },
    );
  }

  /** Post a top-level entry on a discussion topic. */
  async postDiscussionEntry(args: {
    courseId: number; topicId: number; asUserId: number; message: string;
  }): Promise<{ id: number }> {
    return await this.post(
      `/api/v1/courses/${args.courseId}/discussion_topics/${args.topicId}/entries?as_user_id=${args.asUserId}`,
      { message: args.message },
    );
  }

  /** Reply to a specific entry inside a discussion topic. */
  async replyToDiscussionEntry(args: {
    courseId: number; topicId: number; entryId: number; asUserId: number; message: string;
  }): Promise<{ id: number }> {
    return await this.post(
      `/api/v1/courses/${args.courseId}/discussion_topics/${args.topicId}/entries/${args.entryId}/replies?as_user_id=${args.asUserId}`,
      { message: args.message },
    );
  }

  /** Step 1 of file submission upload: request a signed upload URL from Canvas. */
  async requestSubmissionUpload(args: {
    courseId: number;
    assignmentId: number;
    asUserId: number;
    name: string;
    size: number;
    contentType?: string;
  }): Promise<{
    upload_url: string;
    upload_params: Record<string, string>;
    file_param?: string;
  }> {
    return await this.post(
      `/api/v1/courses/${args.courseId}/assignments/${args.assignmentId}/submissions/self/files?as_user_id=${args.asUserId}`,
      {
        name: args.name,
        size: args.size,
        content_type: args.contentType ?? "application/octet-stream",
        on_duplicate: "rename",
      },
    );
  }

  /** Submit an assignment. submission_type drives which fields matter. */
  async submitAssignment(args: {
    courseId: number;
    assignmentId: number;
    asUserId: number;
    submission_type: "online_text_entry" | "online_url" | "online_upload" | "media_recording";
    body?: string;
    url?: string;
    file_ids?: number[];
    comment?: string;
  }): Promise<{ id: number; workflow_state: string; submitted_at: string }> {
    const submission: Record<string, unknown> = { submission_type: args.submission_type };
    if (args.body !== undefined) submission.body = args.body;
    if (args.url !== undefined) submission.url = args.url;
    if (args.file_ids?.length) submission.file_ids = args.file_ids;
    const payload: Record<string, unknown> = { submission };
    if (args.comment) payload.comment = { text_comment: args.comment };
    return await this.post(
      `/api/v1/courses/${args.courseId}/assignments/${args.assignmentId}/submissions?as_user_id=${args.asUserId}`,
      payload,
    );
  }

  /** Get the user's overall enrollment + grade for a course. */
  async getCourseGradesForUser(courseId: number, userId: number): Promise<{
    enrollments: Array<{
      type: string;
      role: string;
      grades?: {
        current_score?: number | null;
        final_score?: number | null;
        current_grade?: string | null;
        final_grade?: string | null;
      };
    }>;
  }> {
    const enrollments = await this.get<Array<{ type: string; role: string; grades?: Record<string, unknown> }>>(
      `/api/v1/courses/${courseId}/enrollments`,
      { user_id: userId, "include[]": "current_points" },
    );
    return { enrollments: enrollments as never };
  }
}

export async function getCanvasClientForTenant(
  admin: any,
  tenantId: string,
): Promise<{ client: CanvasClient; accountId: number } | null> {
  const { data: binding } = await admin
    .from("gw_tenant_canvas_accounts")
    .select("canvas_account_id, gw_canvas_instances!inner(id, base_url, admin_token)")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .maybeSingle();
  if (!binding) return null;
  return {
    client: new CanvasClient({
      id: binding.gw_canvas_instances.id,
      base_url: binding.gw_canvas_instances.base_url,
      admin_token: binding.gw_canvas_instances.admin_token,
    }),
    accountId: Number(binding.canvas_account_id),
  };
}
