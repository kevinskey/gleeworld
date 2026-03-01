import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ── Tool Definitions ──
const tools = [
  {
    type: "function",
    function: {
      name: "get_upcoming_events",
      description: "Get upcoming events from the GleeWorld calendar. Can filter by calendar name or event type.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "How many days ahead to look. Default 14." },
          calendar_name: { type: "string", description: "Filter by calendar name like 'MUS 070', 'Main Calendar', 'Appointments', etc." },
          event_type: { type: "string", description: "Filter by event type: performance, rehearsal, meeting, class, etc." },
          limit: { type: "number", description: "Max events to return. Default 10." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a new event on the GleeWorld calendar.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title" },
          description: { type: "string", description: "Event description" },
          start_date: { type: "string", description: "Start date/time in ISO format (e.g. 2026-03-15T14:00:00-05:00)" },
          end_date: { type: "string", description: "End date/time in ISO format" },
          location: { type: "string", description: "Event location" },
          calendar_name: { type: "string", description: "Which calendar: 'Main Calendar', 'MUS 070', 'Exec Board', etc. Default 'Main Calendar'." },
          event_type: { type: "string", description: "Event type: performance, rehearsal, meeting, class, other. Default 'meeting'." },
          is_public: { type: "boolean", description: "Whether event is public. Default true." },
          attendance_required: { type: "boolean", description: "Whether attendance is required. Default false." },
        },
        required: ["title", "start_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_assignment_due_dates",
      description: "Get upcoming assignment due dates across all courses or a specific course.",
      parameters: {
        type: "object",
        properties: {
          course_name: { type: "string", description: "Course name filter like 'MUS 240', 'MUS 070', 'MUS 210', 'LH 100'" },
          days_ahead: { type: "number", description: "How many days ahead to look. Default 14." },
          include_past_due: { type: "boolean", description: "Include overdue assignments. Default false." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_attendance",
      description: "Check attendance records — summary for a course session, or a specific student's attendance history.",
      parameters: {
        type: "object",
        properties: {
          course_name: { type: "string", description: "Course name like 'MUS 070', 'MUS 240'" },
          student_name: { type: "string", description: "Student name to look up (partial match supported)" },
          date: { type: "string", description: "Specific date to check in YYYY-MM-DD format" },
          summary_only: { type: "boolean", description: "Just return totals, not individual records. Default true." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_performance_schedule",
      description: "Get upcoming performances, concerts, and shows for the Glee Club.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "How many days ahead. Default 30." },
          include_past: { type: "boolean", description: "Include recent past performances. Default false." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_appointment",
      description: "Create a new office hours appointment.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Appointment title/reason" },
          client_name: { type: "string", description: "Name of the person requesting the appointment" },
          client_email: { type: "string", description: "Email of the person" },
          client_phone: { type: "string", description: "Phone number" },
          appointment_date: { type: "string", description: "Date/time in ISO format" },
          duration_minutes: { type: "number", description: "Duration in minutes. Default 15." },
          appointment_type: { type: "string", description: "Type: general, academic, advising, audition. Default 'general'." },
          notes: { type: "string", description: "Additional notes" },
        },
        required: ["title", "client_name", "appointment_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_google_calendar_sync_status",
      description: "Check the status of Google Calendar synchronization and recent synced events.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ── Tool Execution ──
async function executeTool(name: string, args: any, userId: string): Promise<string> {
  try {
    switch (name) {
      case "get_upcoming_events": {
        const daysAhead = args.days_ahead || 14;
        const limit = args.limit || 10;
        const now = new Date().toISOString();
        const future = new Date(Date.now() + daysAhead * 86400000).toISOString();

        let query = supabase
          .from("gw_events")
          .select("title, description, event_type, start_date, end_date, location, venue_name, status, attendance_required, calendar_id")
          .gte("start_date", now)
          .lte("start_date", future)
          .order("start_date", { ascending: true })
          .limit(limit);

        if (args.event_type) query = query.eq("event_type", args.event_type);

        const { data: events, error } = await query;
        if (error) return `Error fetching events: ${error.message}`;

        if (args.calendar_name) {
          // Get calendar ID by name
          const { data: cal } = await supabase
            .from("gw_calendars")
            .select("id")
            .ilike("name", `%${args.calendar_name}%`)
            .limit(1)
            .single();
          if (cal) {
            const filtered = (events || []).filter((e: any) => e.calendar_id === cal.id);
            return filtered.length ? JSON.stringify(filtered) : "No events found for that calendar in the specified time range.";
          }
        }

        return events?.length ? JSON.stringify(events) : "No upcoming events found.";
      }

      case "create_calendar_event": {
        // Resolve calendar ID
        const calName = args.calendar_name || "Main Calendar";
        const { data: cal } = await supabase
          .from("gw_calendars")
          .select("id")
          .ilike("name", `%${calName}%`)
          .limit(1)
          .single();

        const calendarId = cal?.id || "d0241f76-a1fa-4950-a696-d64920a350a8"; // Main Calendar fallback

        // Only set created_by if userId is a real user (not the fallback zero UUID)
        const isRealUser = userId && userId !== "00000000-0000-0000-0000-000000000000";

        const { data, error } = await supabase.from("gw_events").insert({
          title: args.title,
          description: args.description || null,
          start_date: args.start_date,
          end_date: args.end_date || null,
          location: args.location || null,
          event_type: args.event_type || "meeting",
          calendar_id: calendarId,
          is_public: args.is_public ?? true,
          attendance_required: args.attendance_required ?? false,
          created_by: isRealUser ? userId : null,
          status: "scheduled",
        }).select().single();

        if (error) {
          console.error("create_calendar_event error:", error.message);
          return `Failed to create event: ${error.message}`;
        }
        return `Event "${args.title}" created successfully for ${new Date(args.start_date).toLocaleString("en-US", { timeZone: "America/New_York" })}.`;
      }

      case "get_assignment_due_dates": {
        const daysAhead = args.days_ahead || 14;
        const now = new Date();
        const future = new Date(Date.now() + daysAhead * 86400000);

        let query = supabase
          .from("gw_course_assignments")
          .select("title, assignment_type, points, due_date, is_published, course_id")
          .eq("is_published", true)
          .order("due_date", { ascending: true })
          .limit(20);

        if (args.include_past_due) {
          query = query.lte("due_date", future.toISOString());
        } else {
          query = query.gte("due_date", now.toISOString()).lte("due_date", future.toISOString());
        }

        const { data: assignments, error } = await query;
        if (error) return `Error fetching assignments: ${error.message}`;

        if (args.course_name) {
          // Look up course ID
          const { data: course } = await supabase
            .from("gw_courses")
            .select("id, course_code, title")
            .ilike("course_code", `%${args.course_name.replace(/\s+/g, "%")}%`)
            .limit(1)
            .single();

          if (course) {
            const filtered = (assignments || []).filter((a: any) => a.course_id === course.id);
            return filtered.length
              ? `Assignments for ${course.title}:\n${JSON.stringify(filtered)}`
              : `No upcoming assignments for ${course.title}.`;
          }
        }

        return assignments?.length ? JSON.stringify(assignments) : "No upcoming assignments found.";
      }

      case "check_attendance": {
        // First resolve the course
        let courseId: string | null = null;
        if (args.course_name) {
          const { data: course } = await supabase
            .from("gw_courses")
            .select("id")
            .ilike("course_code", `%${args.course_name.replace(/\s+/g, "%")}%`)
            .limit(1)
            .single();
          courseId = course?.id || null;
        }

        // If looking for a specific student
        if (args.student_name) {
          const { data: students } = await supabase
            .from("gw_profiles")
            .select("id, first_name, last_name, user_id")
            .or(`first_name.ilike.%${args.student_name}%,last_name.ilike.%${args.student_name}%`)
            .limit(5);

          if (!students?.length) return `No student found matching "${args.student_name}".`;

          const studentIds = students.map((s: any) => s.id);
          let recordQuery = supabase
            .from("gw_attendance_records")
            .select("status, marked_at, attendance_session_id")
            .in("student_profile_id", studentIds)
            .order("marked_at", { ascending: false })
            .limit(30);

          const { data: records } = await recordQuery;

          if (args.summary_only !== false) {
            const present = records?.filter((r: any) => r.status === "present").length || 0;
            const absent = records?.filter((r: any) => r.status === "absent").length || 0;
            const late = records?.filter((r: any) => r.status === "late").length || 0;
            const excused = records?.filter((r: any) => r.status === "excused").length || 0;
            const total = present + absent + late + excused;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;

            return `Attendance for ${students[0].first_name} ${students[0].last_name}: ${present} present, ${absent} absent, ${late} late, ${excused} excused out of ${total} sessions. Attendance rate: ${rate}%.`;
          }

          return JSON.stringify({ student: `${students[0].first_name} ${students[0].last_name}`, records });
        }

        // Session summary for a date
        if (args.date && courseId) {
          const dayStart = `${args.date}T00:00:00`;
          const dayEnd = `${args.date}T23:59:59`;

          const { data: sessions } = await supabase
            .from("gw_attendance_sessions")
            .select("id, title, status")
            .eq("course_id", courseId)
            .gte("opens_at", dayStart)
            .lte("opens_at", dayEnd);

          if (!sessions?.length) return `No attendance session found for ${args.course_name} on ${args.date}.`;

          const sessionIds = sessions.map((s: any) => s.id);
          const { data: records } = await supabase
            .from("gw_attendance_records")
            .select("status")
            .in("attendance_session_id", sessionIds);

          const present = records?.filter((r: any) => r.status === "present").length || 0;
          const absent = records?.filter((r: any) => r.status === "absent").length || 0;
          const late = records?.filter((r: any) => r.status === "late").length || 0;
          const total = present + absent + late;

          return `${args.course_name} attendance on ${args.date}: ${present} present, ${absent} absent, ${late} late out of ${total} total.`;
        }

        return "Please specify a course name, student name, or date to check attendance.";
      }

      case "get_performance_schedule": {
        const daysAhead = args.days_ahead || 30;
        const now = args.include_past
          ? new Date(Date.now() - 14 * 86400000).toISOString()
          : new Date().toISOString();
        const future = new Date(Date.now() + daysAhead * 86400000).toISOString();

        const { data: performances, error } = await supabase
          .from("gw_events")
          .select("title, description, start_date, end_date, location, venue_name, status")
          .eq("event_type", "performance")
          .gte("start_date", now)
          .lte("start_date", future)
          .order("start_date", { ascending: true })
          .limit(15);

        if (error) return `Error: ${error.message}`;
        return performances?.length ? JSON.stringify(performances) : "No upcoming performances scheduled.";
      }

      case "create_appointment": {
        const { data, error } = await supabase.from("gw_appointments").insert({
          title: args.title,
          client_name: args.client_name,
          client_email: args.client_email || null,
          client_phone: args.client_phone || null,
          appointment_date: args.appointment_date,
          duration_minutes: args.duration_minutes || 15,
          appointment_type: args.appointment_type || "general",
          notes: args.notes || null,
          status: "pending_approval",
          created_by: userId,
        }).select().single();

        if (error) return `Failed to create appointment: ${error.message}`;
        return `Appointment "${args.title}" for ${args.client_name} created and pending approval for ${new Date(args.appointment_date).toLocaleString("en-US", { timeZone: "America/New_York" })}.`;
      }

      case "get_google_calendar_sync_status": {
        const { data: googleEvents } = await supabase
          .from("gw_events")
          .select("title, start_date, external_source, external_id")
          .eq("external_source", "google_calendar")
          .order("start_date", { ascending: false })
          .limit(5);

        if (!googleEvents?.length) return "No Google Calendar synced events found. The sync may not be active right now.";
        return `Google Calendar sync is active. Last ${googleEvents.length} synced events: ${JSON.stringify(googleEvents)}`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: any) {
    console.error(`Tool ${name} error:`, err);
    return `Tool error: ${err.message}`;
  }
}

// ── Main System Prompt ──
function buildSystemPrompt(currentDate: string, appointments: any[]) {
  return `You are Aria, Dr. Johnson's personal AI executive assistant for GleeWorld — the official digital platform of the Spelman College Glee Club. You know every aspect of this platform and can take real actions.

CURRENT DATE/TIME: ${currentDate}

═══════════════════════════════════════
GLEEWORLD PLATFORM KNOWLEDGE
═══════════════════════════════════════

MISSION: "To Amaze and Inspire." 100+ years of musical excellence. GleeWorld.org is the digital home for students, alumnae, fans, and administrators.

LEADERSHIP: Dr. Kevin P. Johnson ("Doc Johnson") — Director and Music Department Chair. Executive Board — student leaders (President, VP, Secretary, Treasurer, Student Conductor, Chaplain, Historian, Social Chair).

ROLES: Guest, Fan, Member, Alumna, Executive Board, Admin, Super Admin — each with tailored dashboards.

SPRING 2026 SEMESTER: January 14 – April 29. Timezone: America/New_York.
Course meeting patterns:
- MUS 070 (Glee Club): Mon/Wed/Fri 5:00-6:15 PM
- MUS 240 (Music in Society): Mon/Wed/Fri 1:00-1:50 PM
- MUS 210 (Choral Conducting): Mon/Wed 2:00-2:50 PM
- Faith Formation: Thursdays 7:00 PM
- LH 100 (Bowman Scholars): Thursdays 7:00-9:00 PM, Sundays 10:00 AM-1:00 PM
Holidays: MLK Day (Jan 19), Spring Break (Mar 9-13), Good Friday (Apr 3), Founders Day (Apr 9), Research Day (Apr 17).

AVAILABLE CALENDARS: Main Calendar, MUS 070, MUS 240, MUS 210, LH 100 Bowman Scholars, Exec Board, Appointments, Office Hours, Alumnae, Fans, Section Leaders, Holidays, Potential Performances, and more.

GLEE ACADEMY: Full LMS with universal course infrastructure. MUS-070 uses attendance-only grading (starts at 100%, drops for unexcused absences). MUS-240/MUS-210 use full coursework. Features: assignments, polls, class notes, rubrics, QR attendance, grading grid, class journals, SightReadingFactory integration.

OFFICE HOURS: Students book via mobile form (phone required for SMS). Admins manage via dashboard with approve/deny/cancel/reschedule, Twilio SMS, availability management, reminders, and Google Calendar sync.

CURRENT APPOINTMENTS: ${appointments?.length ? JSON.stringify(appointments) : "None loaded."}

AUDITION SYSTEM: Sessions with evaluations (intonation, rhythm, tone, musicality, sight-reading, stage presence). Time block scheduling. Automated confirmation emails.

ALUMNAE PORTAL: Memory wall, mentor matching, reunion RSVP, newsletters, spotlights, interviews, bulletin board.

E-COMMERCE: Merch shop with Stripe/Square, inventory management, free shipping over $150, Amazon affiliates.

ADMINISTRATION: Budget management with dual-approval, contracts with digital signatures, finance tracking, activity logging.

TOURING: Hotel search with Google Maps, itinerary planning, tour budgets.

COMMUNICATIONS: Twilio SMS, Resend email, internal messaging, newsletters.

═══════════════════════════════════════
YOUR ACTIVE CAPABILITIES (TOOLS)
═══════════════════════════════════════
You can TAKE REAL ACTIONS by calling tools:
1. get_upcoming_events — Query the calendar for upcoming events, filtered by calendar or type
2. create_calendar_event — Create new events on any GleeWorld calendar
3. get_assignment_due_dates — Check upcoming assignment deadlines across courses
4. check_attendance — Look up attendance for a student or session
5. get_performance_schedule — View upcoming concerts and performances
6. create_appointment — Schedule new office hours appointments
7. get_google_calendar_sync_status — Check Google Calendar sync

When asked about events, assignments, attendance, or scheduling, USE YOUR TOOLS to get real data. Don't guess.

STYLE RULES (CRITICAL):
- NEVER start with greetings. Jump straight to the answer.
- Keep responses to one to three sentences unless asked to elaborate.
- Sound like a trusted colleague, not a customer service rep.
- When you use a tool, summarize the results naturally in speech.
- Numbers spoken out (e.g., "three" not "3").

RESPONSE FORMAT:
- Conversational, suitable for text-to-speech
- No markdown, bullet points, or special characters
- Natural speech patterns`;
}

// ── Main Handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { messages, appointments, currentDate, userId } = payload;
  const systemPrompt = buildSystemPrompt(currentDate || new Date().toISOString(), appointments || []);
  const activeUserId = userId || "00000000-0000-0000-0000-000000000000";

  try {
    // Initial AI call with tools
    let aiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || [{ role: "user", content: "Hello" }]),
    ];

    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools,
        max_tokens: 800,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    let data = await response.json();
    let choice = data.choices?.[0];

    // Tool-calling loop (max 3 iterations to prevent runaway)
    let iterations = 0;
    while (choice?.finish_reason === "tool_calls" && choice?.message?.tool_calls?.length && iterations < 3) {
      iterations++;
      const toolCalls = choice.message.tool_calls;

      // Add the assistant message with tool calls
      aiMessages.push(choice.message);

      // Execute each tool call
      for (const tc of toolCalls) {
        const fnName = tc.function.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(tc.function.arguments || "{}");
        } catch { /* empty args */ }

        console.log(`Executing tool: ${fnName}`, fnArgs);
        const result = await executeTool(fnName, fnArgs, activeUserId);
        console.log(`Tool result for ${fnName}:`, result.substring(0, 200));

        aiMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        } as any);
      }

      // Call AI again with tool results
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools,
          max_tokens: 800,
          temperature: 0.6,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("AI follow-up error:", response.status, errText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      data = await response.json();
      choice = data.choices?.[0];
    }

    const content = choice?.message?.content || "I couldn't process that request.";

    return new Response(JSON.stringify({ reply: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Office hours assistant error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
