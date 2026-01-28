import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ==========================================
// COMPREHENSIVE GLEEWORLD KNOWLEDGE BASE
// ==========================================
const GLEEWORLD_KNOWLEDGE = `
## COMPLETE GLEEWORLD SITE KNOWLEDGE

### About the Glee Club
The Spelman College Glee Club is a historic ensemble celebrating over 100 years of musical excellence. 
Motto: "To Amaze and Inspire"
Director: Dr. Kevin P. Johnson ("Doc Johnson")
The Glee Club performs nationally and internationally, representing Spelman College.

### Courses & Academy
**MUS-240 (Glee Club)**
- Primary ensemble course for active members
- Rehearsals: MWF 5:00-6:15 PM
- Required for all performing members
- Students must submit class schedules to check for conflicts

**MUS-070**
- Introductory course for new members
- Covers fundamentals of choral singing

### Attendance Policy
- Attendance is MANDATORY for all rehearsals and performances
- Must notify the Attendance Chair (Secretary) IN ADVANCE if unable to attend
- Three unexcused absences = probation
- Additional absences may result in removal from performances
- Excused absences require documentation or prior approval

### Executive Board Positions
1. **President** - Leads the organization, represents the club
2. **Vice President** - Assists President, manages special projects
3. **Secretary** - Records minutes, manages attendance, communications
4. **Treasurer** - Manages finances, dues collection
5. **Chaplain** - Spiritual leadership, devotions
6. **Parliamentarian** - Enforces bylaws and procedures
7. **Historian** - Documents club activities, maintains archives
8. **Public Relations Chair** - External communications, media
9. **Social Chair** - Plans social events and bonding activities
10. **Tour Manager** - Coordinates travel logistics

### Dress Code & Performance Attire
- Official Glee Club dress (stored in wardrobe)
- Appropriate undergarments (nude/skin-tone)
- Nude hosiery
- Closed-toe black heels (2-3 inches)
- Hair styled neatly away from face
- Minimal jewelry (small studs only)
- No visible tattoos during performances

### Tours
- Domestic and international tours annually
- Tour participation requires:
  - Good academic standing (2.5+ GPA)
  - All dues paid in full
  - Clean attendance record
  - Signed participation agreement
- Tour absence requests must be submitted in advance via the Tour Absence Form

### Dues & Payments
- Membership dues cover music, uniforms, and operational costs
- Payment plans available through the Treasurer
- All dues must be paid before tour participation
- Late fees may apply for missed deadlines

### Forms Available on GleeWorld
1. **Class Schedule Form** - Submit weekly class schedule to check conflicts
2. **Tour Absence Request** - Request excusal from tour activities
3. **Exit Interview** - Complete before leaving the organization
4. **Wardrobe Checkout** - Check out performance attire
5. **Concert Ticket Request** - Request tickets for family/guests
6. **Booking Request** - External groups can request performances

### Key Dates & Academic Calendar
- Rehearsals: MWF during academic semesters
- Major concerts: Fall (Founder's Day), Spring (Annual Concert), Commencement
- Tours typically during spring break or summer

### Navigation Guide
- Dashboard: Main hub, overview of activities
- Music Library: Sheet music, PDFs, audio companions
- Calendar: Events, rehearsals, deadlines
- Glee Academy: Courses, assignments, grades
- Messages: Group messaging, polls
- Glee Lounge: Social hub, radio
- Handbook: Official policies
- Wardrobe: Costume management
- Profile: Personal settings
- Admin Dashboard: For administrators only

### Sight Reading Resources
- SightReadingFactory.com integration
- Levels 1-8 available for practice
- Required for course assessments
- Accessible via Member Sight Reading Studio

### Radio & Lounge
- Glee World Radio: 24/7 streaming
- Playlists: Gospel, Classical, Jazz, Christmas, Contemporary
- Members can request songs from specific playlists
- Live streaming capabilities in the Lounge
`;

// ==========================================
// TOOL DEFINITIONS
// ==========================================
const tools = [
  // === EXISTING TOOLS ===
  {
    type: "function",
    function: {
      name: "get_assignments_due_today",
      description: "Get all assignments due today for the current user from Glee Academy courses",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_events",
      description: "Get upcoming events, rehearsals, and concerts from the calendar",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Number of days ahead to look (default 7)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_music_library",
      description: "Search the sheet music library for scores by title, composer, or voicing",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for music title or composer" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_score",
      description: "Open a specific score/PDF from the music library by its UUID or title. First search the music library to find the score, then use the UUID from the search results to open it.",
      parameters: {
        type: "object",
        properties: {
          score_id: { type: "string", description: "The UUID of the score from search results, OR the exact title if UUID is not available" },
        },
        required: ["score_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description: "Open or navigate to any page in GleeWorld. Use this when users want to go to, open, access, or view a specific feature, section, or page.",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: [
              "dashboard", "home", "music-library", "sheet-music", "calendar", "events", "schedule",
              "glee-academy", "academy", "courses", "classes", "email-composer", "compose", "email",
              "messages", "messaging", "chat", "glee-lounge", "lounge", "radio", "handbook", "policies",
              "first-year-resources", "freshman-resources", "exec-board-workshop", "executive-board",
              "wardrobe", "costumes", "uniforms", "alumnae", "alumni", "profile", "my-profile", "account", "settings",
              "admin-dashboard", "admin", "attendance", "check-in", "payments", "dues", "finances",
              "announcements", "news", "notifications", "shop", "store", "merchandise", "merch",
              "booking-request", "booking", "book-us", "sight-reading", "sight-reading-studio", "karaoke",
              "student-schedules", "class-schedules"
            ],
            description: "The page to navigate to",
          },
        },
        required: ["page"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "close_current_page",
      description: "Close, exit, or leave the current page and return to the dashboard.",
      parameters: {
        type: "object",
        properties: {
          destination: { type: "string", enum: ["dashboard", "previous", "home"], description: "Where to go after closing. Default is dashboard." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_class_schedule",
      description: "Get the class/course schedule and important dates like last day of class",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_message",
      description: "Prepare to send a message (SMS or email) to a member",
      parameters: {
        type: "object",
        properties: {
          recipient_name: { type: "string", description: "Name of the person to message" },
          message_type: { type: "string", enum: ["sms", "email"], description: "Type of message to send" },
        },
        required: ["recipient_name", "message_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_members",
      description: "Search for Glee Club members by name to get their contact info or profile",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the member to search for" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_announcements",
      description: "Get the latest announcements from the Glee Club",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of announcements to fetch (default 5)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_polls",
      description: "Get active polls that need voting or recent poll results",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_handbook_info",
      description: "Get information from the Glee Club handbook about policies, procedures, or positions",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic to search for in the handbook (e.g., 'attendance policy', 'exec board positions', 'dress code')" },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "control_radio",
      description: "Control the Glee World Radio - turn it on (play), off (pause/stop), toggle, skip to next song, or adjust volume.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            enum: ["play", "pause", "toggle", "skip", "volume_up", "volume_down", "mute", "unmute"],
            description: "The radio command",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_radio_playlists",
      description: "Get a list of available radio playlists/channels that can be requested.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "request_playlist",
      description: "Request a song from a specific playlist to play on the radio.",
      parameters: {
        type: "object",
        properties: {
          playlist_name: { type: "string", description: "Name of the playlist to request from (e.g., 'Gospel', 'Christmas', 'Classical', 'Jazz')" },
        },
        required: ["playlist_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_now_playing",
      description: "Get information about what's currently playing on Glee World Radio.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  // === ADMIN TOOLS (existing) ===
  {
    type: "function",
    function: {
      name: "admin_reset_user_password",
      description: "Reset a user's password (ADMIN ONLY). Search for the user first to get their email.",
      parameters: {
        type: "object",
        properties: {
          user_email: { type: "string", description: "The email of the user whose password should be reset" },
          new_password: { type: "string", description: "The new password to set (minimum 8 characters). If not provided, a secure random password will be generated." },
        },
        required: ["user_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "admin_get_user_login_info",
      description: "Get user login information and activity (ADMIN ONLY).",
      parameters: {
        type: "object",
        properties: {
          user_email: { type: "string", description: "The email of the user to look up" },
        },
        required: ["user_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "admin_list_users",
      description: "List users with optional filters (ADMIN ONLY).",
      parameters: {
        type: "object",
        properties: {
          role: { type: "string", enum: ["member", "fan", "alumna", "auditioner", "student", "admin", "super-admin"], description: "Filter by user role" },
          verified_only: { type: "boolean", description: "Only show verified users" },
          search_name: { type: "string", description: "Search users by name" },
          limit: { type: "number", description: "Maximum number of users to return (default 10)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "admin_update_user_role",
      description: "Update a user's role (ADMIN ONLY).",
      parameters: {
        type: "object",
        properties: {
          user_email: { type: "string", description: "The email of the user to update" },
          new_role: { type: "string", enum: ["member", "fan", "alumna", "auditioner", "student"], description: "The new role to assign" },
        },
        required: ["user_email", "new_role"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "admin_verify_user",
      description: "Verify or unverify a user account (ADMIN ONLY).",
      parameters: {
        type: "object",
        properties: {
          user_email: { type: "string", description: "The email of the user to verify/unverify" },
          verified: { type: "boolean", description: "Set to true to verify, false to unverify" },
        },
        required: ["user_email", "verified"],
      },
    },
  },
  // ==========================================
  // NEW ENROLLMENT MANAGEMENT TOOLS
  // ==========================================
  {
    type: "function",
    function: {
      name: "check_schedule_submissions",
      description: "Check which students have or haven't submitted their class schedules for the current semester. Returns a list of students with their submission status and any conflicts with rehearsal times.",
      parameters: {
        type: "object",
        properties: {
          course_code: { type: "string", description: "Course code to check (e.g., 'MUS-240', 'MUS-070'). Defaults to MUS-070 (Glee Club)." },
          status_filter: { type: "string", enum: ["submitted", "not_submitted", "has_conflicts", "all"], description: "Filter by submission status. Defaults to 'all'." },
          semester: { type: "string", description: "Semester to check (e.g., 'Spring 2026'). Defaults to current semester." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_enrollment_stats",
      description: "Get enrollment statistics for any Glee Academy course including enrolled count, completion rates, and voice part breakdown.",
      parameters: {
        type: "object",
        properties: {
          course_code: { type: "string", description: "Course code to check (e.g., 'MUS-240', 'MUS-070')." },
          semester: { type: "string", description: "Semester (e.g., 'Spring 2026'). Defaults to current semester." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_report_email",
      description: "Send a formatted email report to any GleeWorld member. Use this to email grade reports, schedule status reports, enrollment summaries, or any custom report content.",
      parameters: {
        type: "object",
        properties: {
          recipient_email: { type: "string", description: "Email address of the recipient. Can also provide a name to search for." },
          recipient_name: { type: "string", description: "Name of the recipient (used if email not provided)." },
          subject: { type: "string", description: "Email subject line." },
          report_content: { type: "string", description: "The main content of the report (markdown supported)." },
          report_type: { type: "string", enum: ["schedule_status", "grade_report", "enrollment_summary", "custom"], description: "Type of report for formatting." },
        },
        required: ["subject", "report_content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_quick_poll",
      description: "Create a poll from a natural language description. Saves to the academy polls table.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The poll question." },
          options: { type: "array", items: { type: "string" }, description: "Array of answer options." },
          course_id: { type: "string", description: "Optional course ID to associate the poll with." },
          expires_in_days: { type: "number", description: "Number of days until poll expires (default 7)." },
          allow_multiple: { type: "boolean", description: "Allow multiple selections (default false)." },
        },
        required: ["question", "options"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_test",
      description: "Generate a test or quiz with AI-created questions on a given topic. Creates a draft test that can be reviewed and published.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "The topic for the test (e.g., 'The Great Migration', 'Gospel music history', 'Music theory basics')." },
          num_questions: { type: "number", description: "Number of questions to generate (default 10)." },
          question_types: { type: "array", items: { type: "string", enum: ["multiple_choice", "true_false", "short_answer"] }, description: "Types of questions to include." },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"], description: "Difficulty level (default 'medium')." },
          course_id: { type: "string", description: "Optional course ID to associate the test with." },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_student_grades",
      description: "Retrieve grade information for students in a course. Can get individual student grades or class-wide grade reports.",
      parameters: {
        type: "object",
        properties: {
          course_code: { type: "string", description: "Course code (e.g., 'MUS-240')." },
          student_email: { type: "string", description: "Optional: specific student's email to get individual grades." },
          student_name: { type: "string", description: "Optional: student name to search for." },
          semester: { type: "string", description: "Semester (defaults to current)." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_site_help",
      description: "Answer questions about GleeWorld features, how to use the site, policies, or any site-related information using the comprehensive knowledge base. Use this for general 'how do I...' or 'what is...' questions about GleeWorld.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The user's question about GleeWorld features or policies." },
        },
        required: ["question"],
      },
    },
  },
  // ==========================================
  // ATTENDANCE TOOL
  // ==========================================
  {
    type: "function",
    function: {
      name: "take_attendance",
      description: "Start taking attendance for a course by displaying the QR code for the current or next class session. Use when the user says 'take attendance' for any course like MUS-240, Glee Club, Bowman Scholars, etc.",
      parameters: {
        type: "object",
        properties: {
          course_name: { 
            type: "string", 
            description: "The course name or code. Examples: 'MUS-240', 'MUS 240', 'Survey of African American Music', 'Glee Club', 'MUS-070', 'Bowman Scholars', 'LH-100', 'GLEE-000', 'Sight Singing'. The system will match natural language to the correct course code."
          },
        },
        required: ["course_name"],
      },
    },
  },
];

// ==========================================
// TOOL EXECUTION
// ==========================================
async function executeTool(toolName: string, args: any, userId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentSemester = currentMonth >= 1 && currentMonth <= 5 ? `Spring ${currentYear}` : `Fall ${currentYear}`;

  switch (toolName) {
    // ==========================================
    // NEW ENROLLMENT MANAGEMENT TOOLS
    // ==========================================
    
    case "check_schedule_submissions": {
      // Verify admin/instructor/exec permissions
      const { data: profile } = await supabase
        .from("gw_profiles")
        .select("is_admin, is_super_admin, is_exec_board, exec_board_role")
        .eq("user_id", userId)
        .single();

      const isSecretary = profile?.exec_board_role?.toLowerCase().includes('secretary');
      if (!profile?.is_admin && !profile?.is_super_admin && !isSecretary) {
        return { success: false, message: "Access denied. Only admins, instructors, or the Secretary can view schedule submissions." };
      }

      const courseCode = args.course_code || "MUS-070";
      const semester = args.semester || currentSemester;
      const statusFilter = args.status_filter || "all";

      // Get enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from("gw_course_enrollments")
        .select(`
          id,
          user_id,
          enrollment_status,
          gw_profiles!inner(user_id, full_name, email, voice_part),
          gw_courses!inner(id, course_code, title)
        `)
        .eq("gw_courses.course_code", courseCode)
        .eq("semester", semester)
        .eq("enrollment_status", "active");

      if (enrollError) {
        console.error("Error fetching enrollments:", enrollError);
        return { success: false, message: "Could not fetch enrollment data." };
      }

      // Get schedule submissions for these students
      const userIds = enrollments?.map(e => e.user_id) || [];
      
      const { data: schedules, error: schedError } = await supabase
        .from("student_class_schedules")
        .select("user_id, has_conflict, conflict_details, created_at, schedule_data")
        .in("user_id", userIds);

      if (schedError) {
        console.error("Error fetching schedules:", schedError);
      }

      const scheduleMap = new Map(schedules?.map(s => [s.user_id, s]) || []);

      // Build the report
      const students = enrollments?.map(e => {
        const schedule = scheduleMap.get(e.user_id);
        return {
          name: e.gw_profiles?.full_name || "Unknown",
          email: e.gw_profiles?.email || "",
          voice_part: e.gw_profiles?.voice_part || "",
          has_submitted: !!schedule,
          has_conflict: schedule?.has_conflict || false,
          conflict_details: schedule?.conflict_details || null,
          submitted_at: schedule?.created_at || null,
        };
      }) || [];

      // Apply filter
      let filtered = students;
      if (statusFilter === "submitted") {
        filtered = students.filter(s => s.has_submitted);
      } else if (statusFilter === "not_submitted") {
        filtered = students.filter(s => !s.has_submitted);
      } else if (statusFilter === "has_conflicts") {
        filtered = students.filter(s => s.has_conflict);
      }

      const submitted = students.filter(s => s.has_submitted).length;
      const notSubmitted = students.filter(s => !s.has_submitted).length;
      const withConflicts = students.filter(s => s.has_conflict).length;

      return {
        success: true,
        course: courseCode,
        semester: semester,
        total_enrolled: students.length,
        submitted_count: submitted,
        not_submitted_count: notSubmitted,
        conflict_count: withConflicts,
        students: filtered,
        message: `${courseCode} Schedule Status (${semester}): ${submitted}/${students.length} submitted. ${notSubmitted} pending. ${withConflicts} with conflicts.`,
        action: "show_schedule_report",
      };
    }

    case "get_enrollment_stats": {
      const courseCode = args.course_code || "MUS-070";
      const semester = args.semester || currentSemester;

      // Get course info
      const { data: course } = await supabase
        .from("gw_courses")
        .select("id, title, course_code, instructor_name")
        .eq("course_code", courseCode)
        .single();

      if (!course) {
        return { success: false, message: `Course ${courseCode} not found.` };
      }

      // Get enrollments with profiles
      const { data: enrollments } = await supabase
        .from("gw_course_enrollments")
        .select(`
          id, enrollment_status,
          gw_profiles!inner(voice_part)
        `)
        .eq("course_id", course.id)
        .eq("semester", semester);

      const activeEnrollments = enrollments?.filter(e => e.enrollment_status === "active") || [];
      
      // Voice part breakdown
      const voiceParts: Record<string, number> = {};
      activeEnrollments.forEach(e => {
        const part = e.gw_profiles?.voice_part || "Unknown";
        voiceParts[part] = (voiceParts[part] || 0) + 1;
      });

      // Get assignment completion rates
      const { data: assignments } = await supabase
        .from("gw_course_assignments")
        .select("id")
        .eq("course_id", course.id)
        .eq("is_published", true);

      const { data: submissions } = await supabase
        .from("assignment_submissions")
        .select("id, student_id, status")
        .in("assignment_id", assignments?.map(a => a.id) || []);

      const completedSubmissions = submissions?.filter(s => s.status === "graded" || s.status === "submitted").length || 0;
      const totalPossible = (assignments?.length || 0) * activeEnrollments.length;
      const completionRate = totalPossible > 0 ? Math.round((completedSubmissions / totalPossible) * 100) : 0;

      return {
        success: true,
        course_code: courseCode,
        course_title: course.title,
        semester: semester,
        instructor: course.instructor_name,
        enrolled_count: activeEnrollments.length,
        voice_part_breakdown: voiceParts,
        assignments_count: assignments?.length || 0,
        completion_rate: completionRate,
        message: `${courseCode} (${semester}): ${activeEnrollments.length} enrolled. ${completionRate}% assignment completion.`,
      };
    }

    case "send_report_email": {
      // Verify permissions
      const { data: senderProfile } = await supabase
        .from("gw_profiles")
        .select("is_admin, is_super_admin, is_exec_board, full_name, email")
        .eq("user_id", userId)
        .single();

      if (!senderProfile?.is_admin && !senderProfile?.is_super_admin && !senderProfile?.is_exec_board) {
        return { success: false, message: "Access denied. Only admins or exec board members can send report emails." };
      }

      // Find recipient email
      let recipientEmail = args.recipient_email;
      let recipientName = args.recipient_name;

      if (!recipientEmail && recipientName) {
        const { data: recipient } = await supabase
          .from("gw_profiles")
          .select("email, full_name")
          .ilike("full_name", `%${recipientName}%`)
          .limit(1)
          .single();

        if (recipient) {
          recipientEmail = recipient.email;
          recipientName = recipient.full_name;
        }
      }

      if (!recipientEmail) {
        return { success: false, message: `Could not find email for "${recipientName || 'unknown recipient'}".` };
      }

      // Format the report as HTML
      const reportType = args.report_type || "custom";
      const reportTitle = {
        schedule_status: "Class Schedule Status Report",
        grade_report: "Grade Report",
        enrollment_summary: "Enrollment Summary",
        custom: "Report from GleeWorld",
      }[reportType] || "Report";

      const htmlContent = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Spelman College Glee Club</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-style: italic;">"To Amaze and Inspire"</p>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0;">
            <h2 style="color: #1a1a2e; margin-top: 0;">${args.subject}</h2>
            <div style="line-height: 1.8; color: #333; white-space: pre-wrap;">${args.report_content.replace(/\n/g, '<br>')}</div>
          </div>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Sent by ${senderProfile.full_name} via GleeWorld
            </p>
          </div>
        </div>
      `;

      // Call send-branded-email function
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-branded-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            to: recipientEmail,
            subject: args.subject,
            html: htmlContent,
            senderName: senderProfile.full_name || "Glee Club",
            replyTo: senderProfile.email,
            senderId: userId,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          return { success: false, message: `Failed to send email: ${result.error || 'Unknown error'}` };
        }

        return {
          success: true,
          action: "email_sent",
          recipient: recipientEmail,
          message: `Report emailed to ${recipientName || recipientEmail} successfully!`,
        };
      } catch (error: any) {
        console.error("Email send error:", error);
        return { success: false, message: `Email failed: ${error.message}` };
      }
    }

    case "create_quick_poll": {
      // Verify permissions
      const { data: profile } = await supabase
        .from("gw_profiles")
        .select("is_admin, is_super_admin, is_exec_board, full_name")
        .eq("user_id", userId)
        .single();

      if (!profile?.is_admin && !profile?.is_super_admin && !profile?.is_exec_board) {
        return { success: false, message: "Access denied. Only admins or exec board members can create polls." };
      }

      const expiresInDays = args.expires_in_days || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Try academy polls first, fall back to general polls
      let pollId: string | null = null;
      
      if (args.course_id) {
        const { data: poll, error } = await supabase
          .from("gw_academy_polls")
          .insert({
            question: args.question,
            options: args.options,
            course_id: args.course_id,
            created_by: userId,
            expires_at: expiresAt.toISOString(),
            allow_multiple_answers: args.allow_multiple || false,
            is_active: true,
          })
          .select("id")
          .single();

        if (error) {
          console.error("Academy poll creation error:", error);
        } else {
          pollId = poll?.id;
        }
      }

      if (!pollId) {
        // Create in general polls table
        const { data: poll, error } = await supabase
          .from("gw_polls")
          .insert({
            question: args.question,
            options: args.options,
            created_by: userId,
            expires_at: expiresAt.toISOString(),
          })
          .select("id")
          .single();

        if (error) {
          console.error("General poll creation error:", error);
          return { success: false, message: `Failed to create poll: ${error.message}` };
        }
        pollId = poll?.id;
      }

      return {
        success: true,
        poll_id: pollId,
        action: "poll_created",
        message: `Poll created: "${args.question}" with ${args.options.length} options. Expires in ${expiresInDays} days.`,
      };
    }

    case "generate_test": {
      // Verify permissions
      const { data: profile } = await supabase
        .from("gw_profiles")
        .select("is_admin, is_super_admin, full_name")
        .eq("user_id", userId)
        .single();

      if (!profile?.is_admin && !profile?.is_super_admin) {
        return { success: false, message: "Access denied. Only admins can generate tests." };
      }

      const topic = args.topic;
      const numQuestions = args.num_questions || 10;
      const questionTypes = args.question_types || ["multiple_choice", "true_false"];
      const difficulty = args.difficulty || "medium";

      // Generate questions using AI
      const questionsPrompt = `Generate ${numQuestions} ${difficulty}-level quiz questions about: "${topic}"

Include these question types: ${questionTypes.join(", ")}

For each question, provide:
1. The question text
2. The question type (multiple_choice, true_false, or short_answer)
3. For multiple_choice: 4 options labeled A, B, C, D with the correct answer marked
4. For true_false: the correct answer (true or false)
5. For short_answer: the expected answer

Format as JSON array:
[
  {
    "question": "Question text here?",
    "type": "multiple_choice",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correct_answer": "A",
    "explanation": "Brief explanation"
  }
]`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a quiz generator. Return ONLY valid JSON with no markdown formatting." },
              { role: "user", content: questionsPrompt },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error("AI generation failed");
        }

        const aiData = await response.json();
        let questionsText = aiData.choices[0].message.content;
        
        // Clean up potential markdown formatting
        questionsText = questionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const questions = JSON.parse(questionsText);

        // Save to test_drafts
        const { data: draft, error: draftError } = await supabase
          .from("test_drafts")
          .insert({
            title: `Quiz: ${topic}`,
            description: `${numQuestions} ${difficulty} questions about ${topic}`,
            created_by: userId,
            course_id: args.course_id || null,
            questions: questions,
            status: "draft",
          })
          .select("id")
          .single();

        if (draftError) {
          console.error("Draft save error:", draftError);
          return { 
            success: true, 
            questions: questions,
            message: `Generated ${questions.length} questions about "${topic}". (Could not save draft: ${draftError.message})`,
          };
        }

        return {
          success: true,
          draft_id: draft?.id,
          question_count: questions.length,
          action: "test_generated",
          message: `Generated ${questions.length} ${difficulty} questions about "${topic}". Draft saved - review and publish when ready.`,
        };
      } catch (error: any) {
        console.error("Test generation error:", error);
        return { success: false, message: `Test generation failed: ${error.message}` };
      }
    }

    case "get_student_grades": {
      // Verify permissions
      const { data: profile } = await supabase
        .from("gw_profiles")
        .select("is_admin, is_super_admin")
        .eq("user_id", userId)
        .single();

      if (!profile?.is_admin && !profile?.is_super_admin) {
        return { success: false, message: "Access denied. Only admins can view student grades." };
      }

      const courseCode = args.course_code || "MUS-240";
      const semester = args.semester || currentSemester;

      // Get course
      const { data: course } = await supabase
        .from("gw_courses")
        .select("id, title")
        .eq("course_code", courseCode)
        .single();

      if (!course) {
        return { success: false, message: `Course ${courseCode} not found.` };
      }

      // If specific student requested
      if (args.student_email || args.student_name) {
        let studentQuery = supabase.from("gw_profiles").select("user_id, full_name, email");
        
        if (args.student_email) {
          studentQuery = studentQuery.eq("email", args.student_email);
        } else if (args.student_name) {
          studentQuery = studentQuery.ilike("full_name", `%${args.student_name}%`);
        }

        const { data: student } = await studentQuery.single();

        if (!student) {
          return { success: false, message: `Student not found.` };
        }

        // Get grades for this student
        const { data: submissions } = await supabase
          .from("assignment_submissions")
          .select(`
            id, grade, status, submitted_at,
            gw_course_assignments!inner(id, title, points_possible, due_date)
          `)
          .eq("student_id", student.user_id)
          .eq("gw_course_assignments.course_id", course.id);

        const grades = submissions?.map(s => ({
          assignment: s.gw_course_assignments?.title,
          grade: s.grade,
          points_possible: s.gw_course_assignments?.points_possible,
          status: s.status,
          due_date: s.gw_course_assignments?.due_date,
        })) || [];

        const totalPoints = grades.reduce((sum, g) => sum + (g.grade || 0), 0);
        const maxPoints = grades.reduce((sum, g) => sum + (g.points_possible || 0), 0);
        const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

        return {
          success: true,
          student_name: student.full_name,
          student_email: student.email,
          course: courseCode,
          grades: grades,
          total_points: totalPoints,
          max_points: maxPoints,
          percentage: percentage,
          message: `${student.full_name} - ${courseCode}: ${percentage}% (${totalPoints}/${maxPoints} points)`,
        };
      }

      // Class-wide grades summary
      const { data: enrollments } = await supabase
        .from("gw_course_enrollments")
        .select(`
          user_id,
          gw_profiles!inner(full_name, email)
        `)
        .eq("course_id", course.id)
        .eq("semester", semester)
        .eq("enrollment_status", "active");

      const gradeSummary: any[] = [];
      
      for (const enrollment of enrollments || []) {
        const { data: submissions } = await supabase
          .from("assignment_submissions")
          .select("grade, gw_course_assignments!inner(points_possible)")
          .eq("student_id", enrollment.user_id)
          .eq("gw_course_assignments.course_id", course.id);

        const totalPoints = submissions?.reduce((sum, s) => sum + (s.grade || 0), 0) || 0;
        const maxPoints = submissions?.reduce((sum, s) => sum + (s.gw_course_assignments?.points_possible || 0), 0) || 0;
        const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

        gradeSummary.push({
          name: enrollment.gw_profiles?.full_name,
          email: enrollment.gw_profiles?.email,
          percentage: percentage,
          total: totalPoints,
          max: maxPoints,
        });
      }

      // Sort by percentage
      gradeSummary.sort((a, b) => b.percentage - a.percentage);

      const avgGrade = gradeSummary.length > 0 
        ? Math.round(gradeSummary.reduce((sum, s) => sum + s.percentage, 0) / gradeSummary.length)
        : 0;

      return {
        success: true,
        course: courseCode,
        semester: semester,
        student_count: gradeSummary.length,
        class_average: avgGrade,
        grades: gradeSummary,
        message: `${courseCode} Class Grades (${semester}): ${gradeSummary.length} students, ${avgGrade}% average.`,
      };
    }

    case "search_site_help": {
      // This tool uses the knowledge base to answer questions
      // The actual response will be generated by the AI using the knowledge in the system prompt
      return {
        success: true,
        knowledge_base: GLEEWORLD_KNOWLEDGE,
        message: "Searching GleeWorld knowledge base...",
      };
    }

    // ==========================================
    // EXISTING TOOLS (unchanged logic)
    // ==========================================
    
    case "get_assignments_due_today": {
      const { data: assignments, error } = await supabase
        .from("gw_course_assignments")
        .select("id, title, description, due_date, course_id")
        .eq("due_date", today)
        .eq("is_published", true);
      
      if (error) {
        console.error("Error fetching assignments:", error);
        return { assignments: [], message: "Could not fetch assignments" };
      }
      
      return {
        assignments: assignments || [],
        count: assignments?.length || 0,
        message: assignments?.length 
          ? `You have ${assignments.length} assignment(s) due today.`
          : "No assignments due today!"
      };
    }

    case "get_upcoming_events": {
      const daysAhead = args.days_ahead || 7;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      const { data: events, error } = await supabase
        .from("events")
        .select("id, title, event_name, description, start_date, event_date_start, end_date, location, event_type")
        .or(`start_date.gte.${today},event_date_start.gte.${today}`)
        .order("start_date", { ascending: true })
        .limit(10);

      if (error) {
        console.error("Error fetching events:", error);
        return { events: [], message: "Could not fetch events" };
      }

      const formattedEvents = (events || []).map(e => ({
        id: e.id,
        title: e.title || e.event_name,
        description: e.description,
        date: e.start_date || e.event_date_start,
        location: e.location,
        type: e.event_type
      }));

      return {
        events: formattedEvents,
        count: formattedEvents.length,
        message: formattedEvents.length 
          ? `Found ${formattedEvents.length} upcoming event(s) in the next ${daysAhead} days.`
          : `No events scheduled in the next ${daysAhead} days.`
      };
    }

    case "search_music_library": {
      const rawQuery = args.query || "";
      let query = rawQuery.replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();

      let titleQuery = query;
      let composerQuery = query;
      
      const byMatch = query.match(/^(.+?)\s+by\s+(.+)$/i);
      if (byMatch) {
        titleQuery = byMatch[1].trim();
        composerQuery = byMatch[2].trim();
      }
      
      const { data: titleMatches } = await supabase
        .from("gw_sheet_music")
        .select("id, title, composer, voicing, pdf_url")
        .ilike("title", `%${titleQuery}%`)
        .limit(10);

      const { data: composerMatches } = await supabase
        .from("gw_sheet_music")
        .select("id, title, composer, voicing, pdf_url")
        .ilike("composer", `%${composerQuery}%`)
        .limit(10);

      let allScores = [...(titleMatches || []), ...(composerMatches || [])];
      
      if (byMatch) {
        const exactMatches = allScores.filter(s => 
          s.title?.toLowerCase().includes(titleQuery.toLowerCase()) &&
          s.composer?.toLowerCase().includes(composerQuery.toLowerCase())
        );
        if (exactMatches.length > 0) {
          allScores = [...exactMatches, ...allScores.filter(s => !exactMatches.includes(s))];
        }
      }
      
      const uniqueScores = allScores.filter((score, index, self) => 
        index === self.findIndex(s => s.id === score.id)
      ).slice(0, 5);

      const formattedScores = uniqueScores.map(s => ({
        uuid: s.id,
        title: s.title,
        composer: s.composer,
        voicing: s.voicing,
        has_pdf: !!s.pdf_url
      }));

      return {
        scores: formattedScores,
        count: formattedScores.length,
        message: formattedScores.length
          ? `Found ${formattedScores.length} score(s) matching "${args.query}".`
          : `No scores found matching "${args.query}".`
      };
    }

    case "open_score": {
      let { data: score } = await supabase
        .from("gw_sheet_music")
        .select("id, title, pdf_url")
        .eq("id", args.score_id)
        .maybeSingle();

      if (!score) {
        const { data: titleMatch } = await supabase
          .from("gw_sheet_music")
          .select("id, title, pdf_url")
          .ilike("title", `%${args.score_id}%`)
          .not("pdf_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (titleMatch) score = titleMatch;
      }

      if (!score) {
        return { success: false, message: `Score "${args.score_id}" not found.` };
      }

      if (!score.pdf_url) {
        return { success: false, message: `Found "${score.title}" but it doesn't have a PDF file.` };
      }

      return {
        success: true,
        action: "open_score",
        score_id: score.id,
        title: score.title,
        url: score.pdf_url,
        message: `Opening "${score.title}".`
      };
    }

    case "navigate_to_page": {
      const pageRoutes: Record<string, string> = {
        "dashboard": "/dashboard", "home": "/dashboard",
        "music-library": "/music-library", "sheet-music": "/music-library",
        "calendar": "/calendar", "events": "/calendar", "schedule": "/calendar",
        "glee-academy": "/glee-academy", "academy": "/glee-academy", "courses": "/glee-academy", "classes": "/glee-academy",
        "email-composer": "/compose", "compose": "/compose", "email": "/compose",
        "messages": "/messages", "messaging": "/messages", "chat": "/messages",
        "glee-lounge": "/glee-lounge", "lounge": "/glee-lounge", "radio": "/glee-lounge",
        "handbook": "/handbook", "policies": "/handbook",
        "first-year-resources": "/first-year-resources", "freshman-resources": "/first-year-resources",
        "exec-board-workshop": "/exec-board-workshop", "executive-board": "/exec-board-workshop",
        "wardrobe": "/wardrobe", "costumes": "/wardrobe", "uniforms": "/wardrobe",
        "alumnae": "/alumnae", "alumni": "/alumnae",
        "profile": "/profile", "my-profile": "/profile", "account": "/profile", "settings": "/profile",
        "admin-dashboard": "/admin-dashboard", "admin": "/admin-dashboard",
        "attendance": "/attendance", "check-in": "/attendance",
        "payments": "/payments", "dues": "/payments", "finances": "/payments",
        "announcements": "/announcements", "news": "/announcements",
        "notifications": "/notifications",
        "shop": "/shop", "store": "/shop", "merchandise": "/shop", "merch": "/shop",
        "booking-request": "/booking-request", "booking": "/booking-request", "book-us": "/booking-request",
        "sight-reading": "/member-sight-reading-studio", "sight-reading-studio": "/member-sight-reading-studio",
        "karaoke": "/dashboard?module=karaoke",
        "student-schedules": "/admin/student-schedules", "class-schedules": "/admin/student-schedules",
      };

      const route = pageRoutes[args.page] || "/dashboard";
      const pageName = args.page.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());

      return { action: "navigate", route: route, message: `Opening ${pageName}.` };
    }

    case "close_current_page": {
      const routes: Record<string, string> = {
        "dashboard": "/dashboard", "home": "/dashboard", "previous": "/dashboard",
      };
      return { action: "navigate", route: routes[args.destination || "dashboard"] || "/dashboard", message: "Returning to dashboard." };
    }

    case "get_class_schedule": {
      const { data: courses } = await supabase
        .from("gw_courses")
        .select("id, title, description, start_date, end_date")
        .eq("is_active", true);

      let lastDayOfClass = null;
      if (courses && courses.length > 0) {
        const endDates = courses.map(c => c.end_date).filter(Boolean).sort();
        lastDayOfClass = endDates[endDates.length - 1];
      }

      return {
        courses: courses || [],
        lastDayOfClass,
        message: lastDayOfClass 
          ? `The last day of class is ${new Date(lastDayOfClass).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`
          : "No class end dates found."
      };
    }

    case "prepare_message": {
      const { data: profiles } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, email, phone")
        .ilike("full_name", `%${args.recipient_name}%`)
        .limit(3);

      if (!profiles?.length) {
        return { success: false, message: `Could not find member "${args.recipient_name}".` };
      }

      return {
        action: args.message_type === "sms" ? "prepare_sms" : "prepare_email",
        recipients: profiles,
        message: `Found ${profiles.length} member(s) matching "${args.recipient_name}".`
      };
    }

    case "search_members": {
      const { data: profiles } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, email, phone, role, voice_part, is_exec_board, exec_board_role")
        .ilike("full_name", `%${args.name}%`)
        .limit(5);

      return {
        members: profiles || [],
        count: profiles?.length || 0,
        message: profiles?.length ? `Found ${profiles.length} member(s) matching "${args.name}".` : `No members found matching "${args.name}".`
      };
    }

    case "get_announcements": {
      const { data: announcements } = await supabase
        .from("gw_announcements")
        .select("id, title, content, created_at, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(args.limit || 5);

      return {
        announcements: announcements || [],
        count: announcements?.length || 0,
        message: announcements?.length ? `Here are the latest ${announcements.length} announcement(s).` : "No active announcements."
      };
    }

    case "get_polls": {
      const { data: polls } = await supabase
        .from("gw_polls")
        .select("id, question, options, created_at, expires_at")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        polls: polls || [],
        count: polls?.length || 0,
        message: polls?.length ? `Found ${polls.length} active poll(s).` : "No active polls."
      };
    }

    case "get_handbook_info": {
      const handbookInfo: Record<string, string> = {
        "attendance": "Attendance is mandatory for all rehearsals and performances. Members must notify the Attendance Chair in advance if unable to attend. Excessive absences may result in probation or removal from performances.",
        "dress code": "Performance attire includes the official Glee Club dress (stored in wardrobe), appropriate undergarments, nude hosiery, and closed-toe black heels (2-3 inches). Hair must be styled neatly away from face.",
        "exec board": "Executive Board positions include: President, Vice President, Secretary, Treasurer, Chaplain, Parliamentarian, Historian, Public Relations Chair, Social Chair, and various committee chairs. Elections are held each spring semester.",
        "rehearsal": "Rehearsals are held weekly during the academic year. Members should arrive 10 minutes early, bring their music and pencil, and be prepared to sing. Cell phones must be silenced.",
        "tour": "The Glee Club tours domestically and internationally. Tour participation requires good academic standing and payment of all dues. Tour dates are announced at the start of each academic year.",
        "dues": "Membership dues cover music, uniforms, and operational costs. Payment plans are available. Contact the Treasurer for more information.",
      };

      const topic = args.topic.toLowerCase();
      let info = null;
      
      for (const [key, value] of Object.entries(handbookInfo)) {
        if (topic.includes(key) || key.includes(topic)) {
          info = value;
          break;
        }
      }

      return {
        topic: args.topic,
        info: info,
        message: info ? `Here's information about ${args.topic}: ${info}` : `I don't have specific handbook information about "${args.topic}". You can view the full handbook at the Handbook page.`,
        action: info ? null : "navigate",
        route: info ? null : "/handbook"
      };
    }

    case "control_radio": {
      const messages: Record<string, string> = {
        play: "Turning on Glee World Radio!",
        pause: "Stopping the radio.",
        toggle: "Toggling the radio.",
        skip: "Skipping to the next track!",
        volume_up: "Turning up the volume.",
        volume_down: "Turning down the volume.",
        mute: "Muting the radio.",
        unmute: "Unmuting the radio.",
      };
      return { action: "control_radio", command: args.command || "play", message: messages[args.command] || "Radio command received." };
    }

    case "get_radio_playlists": {
      try {
        const AZURACAST_API_KEY = Deno.env.get("AZURACAST_API_KEY");
        const response = await fetch("https://radio.gleeworld.org/api/station/glee_world_radio/playlists", {
          headers: { "X-API-Key": AZURACAST_API_KEY || "" },
        });
        
        if (response.ok) {
          const playlists = await response.json();
          const enabled = playlists.filter((p: any) => p.is_enabled !== false).map((p: any) => ({ id: p.id, name: p.name, type: p.type }));
          return { playlists: enabled, count: enabled.length, message: enabled.length > 0 ? `Available playlists: ${enabled.map((p: any) => p.name).join(', ')}` : "No playlists available." };
        }
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
      return { action: "get_radio_playlists", message: "Fetching available radio playlists..." };
    }

    case "request_playlist": {
      try {
        const AZURACAST_API_KEY = Deno.env.get("AZURACAST_API_KEY");
        const response = await fetch("https://radio.gleeworld.org/api/station/glee_world_radio/playlists", {
          headers: { "X-API-Key": AZURACAST_API_KEY || "" },
        });
        
        if (response.ok) {
          const playlists = await response.json();
          const matched = playlists.find((p: any) => p.name.toLowerCase().includes(args.playlist_name.toLowerCase()));
          
          if (matched) {
            return { action: "request_playlist", playlist_id: matched.id, playlist_name: matched.name, message: `Requesting a song from "${matched.name}" playlist!` };
          } else {
            return { success: false, message: `Couldn't find playlist matching "${args.playlist_name}".` };
          }
        }
      } catch (error) {
        console.error("Error requesting playlist:", error);
      }
      return { action: "request_playlist", playlist_name: args.playlist_name, message: `Requesting from "${args.playlist_name}"...` };
    }

    case "get_now_playing": {
      try {
        const response = await fetch("https://radio.gleeworld.org/api/nowplaying/glee_world_radio");
        if (response.ok) {
          const data = await response.json();
          const nowPlaying = data.now_playing?.song;
          const playingNext = data.playing_next?.song;
          return {
            now_playing: nowPlaying,
            playing_next: playingNext,
            message: nowPlaying ? `Now playing: "${nowPlaying.title}" by ${nowPlaying.artist || 'Unknown'}${playingNext ? `. Up next: "${playingNext.title}"` : ''}` : "No track info available."
          };
        }
      } catch (error) {
        console.error("Error fetching now playing:", error);
      }
      return { action: "get_now_playing", message: "Fetching current track..." };
    }

    // ==========================================
    // ADMIN TOOLS
    // ==========================================
    
    case "admin_reset_user_password": {
      const { data: adminProfile } = await supabase
        .from("gw_profiles")
        .select("is_admin, is_super_admin")
        .eq("user_id", userId)
        .single();

      if (!adminProfile?.is_admin && !adminProfile?.is_super_admin) {
        return { success: false, message: "Access denied. Admin privileges required." };
      }

      const { data: targetUser } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, email")
        .eq("email", args.user_email)
        .single();

      if (!targetUser) {
        return { success: false, message: `User "${args.user_email}" not found.` };
      }

      const newPassword = args.new_password || generateSecurePassword();
      const { error: resetError } = await supabase.auth.admin.updateUserById(targetUser.user_id, { password: newPassword });

      if (resetError) {
        return { success: false, message: `Failed to reset password: ${resetError.message}` };
      }

      await supabase.from("gw_security_audit_log").insert({
        user_id: userId,
        action: "admin_password_reset",
        target_user_id: targetUser.user_id,
        details: { target_email: args.user_email, method: "assistant" }
      });

      return {
        success: true,
        message: `Password for ${targetUser.full_name || args.user_email} has been reset.`,
        new_password: args.new_password ? "[provided by admin]" : newPassword,
        important: "Please securely share this temporary password with the user."
      };
    }

    case "admin_get_user_login_info": {
      const { data: adminCheck } = await supabase.from("gw_profiles").select("is_admin, is_super_admin").eq("user_id", userId).single();
      if (!adminCheck?.is_admin && !adminCheck?.is_super_admin) return { success: false, message: "Access denied." };

      const { data: userProfile } = await supabase.from("gw_profiles").select("*").eq("email", args.user_email).single();
      if (!userProfile) return { success: false, message: `User "${args.user_email}" not found.` };

      const { data: authUser } = await supabase.auth.admin.getUserById(userProfile.user_id);
      const { data: recentActivity } = await supabase.from("activity_logs").select("action_type, created_at, resource_type").eq("user_id", userProfile.user_id).order("created_at", { ascending: false }).limit(5);

      return {
        success: true,
        user: {
          name: userProfile.full_name, email: userProfile.email, role: userProfile.role, voice_part: userProfile.voice_part,
          verified: userProfile.verified, is_admin: userProfile.is_admin, is_super_admin: userProfile.is_super_admin,
          is_exec_board: userProfile.is_exec_board, exec_board_role: userProfile.exec_board_role,
          last_sign_in: authUser?.user?.last_sign_in_at,
        },
        recent_activity: recentActivity || [],
        message: `User info for ${userProfile.full_name || args.user_email}`
      };
    }

    case "admin_list_users": {
      const { data: adminCheck } = await supabase.from("gw_profiles").select("is_admin, is_super_admin").eq("user_id", userId).single();
      if (!adminCheck?.is_admin && !adminCheck?.is_super_admin) return { success: false, message: "Access denied." };

      let query = supabase.from("gw_profiles").select("user_id, full_name, email, role, verified, is_admin, is_super_admin, is_exec_board, voice_part, created_at");
      if (args.role) query = query.eq("role", args.role);
      if (args.verified_only) query = query.eq("verified", true);
      if (args.search_name) query = query.ilike("full_name", `%${args.search_name}%`);
      query = query.order("created_at", { ascending: false }).limit(args.limit || 10);

      const { data: users } = await query;
      return { success: true, users: users || [], count: users?.length || 0, message: `Found ${users?.length || 0} user(s).` };
    }

    case "admin_update_user_role": {
      const { data: adminCheck } = await supabase.from("gw_profiles").select("is_admin, is_super_admin").eq("user_id", userId).single();
      if (!adminCheck?.is_admin && !adminCheck?.is_super_admin) return { success: false, message: "Access denied." };

      const { data: targetUser } = await supabase.from("gw_profiles").select("user_id, full_name, role").eq("email", args.user_email).single();
      if (!targetUser) return { success: false, message: `User "${args.user_email}" not found.` };

      const oldRole = targetUser.role;
      const { error: updateError } = await supabase.from("gw_profiles").update({ role: args.new_role }).eq("user_id", targetUser.user_id);
      if (updateError) return { success: false, message: `Failed: ${updateError.message}` };

      await supabase.from("user_role_transitions").insert({
        user_id: targetUser.user_id, from_role: oldRole, to_role: args.new_role, transition_reason: "Updated via Glee Assistant", changed_by: userId
      });

      return { success: true, message: `Role changed from '${oldRole}' to '${args.new_role}' for ${targetUser.full_name}.` };
    }

    case "admin_verify_user": {
      const { data: adminCheck } = await supabase.from("gw_profiles").select("is_admin, is_super_admin").eq("user_id", userId).single();
      if (!adminCheck?.is_admin && !adminCheck?.is_super_admin) return { success: false, message: "Access denied." };

      const { data: targetUser } = await supabase.from("gw_profiles").select("user_id, full_name").eq("email", args.user_email).single();
      if (!targetUser) return { success: false, message: `User "${args.user_email}" not found.` };

      const { error } = await supabase.from("gw_profiles").update({ verified: args.verified }).eq("user_id", targetUser.user_id);
      if (error) return { success: false, message: `Failed: ${error.message}` };

      return { success: true, message: args.verified ? `${targetUser.full_name} has been verified.` : `${targetUser.full_name} has been unverified.` };
    }

    // ==========================================
    // TAKE ATTENDANCE TOOL
    // ==========================================
    case "take_attendance": {
      // Verify admin/instructor/exec permissions
      const { data: profile } = await supabase
        .from("gw_profiles")
        .select("is_admin, is_super_admin, is_exec_board, exec_board_role")
        .eq("user_id", userId)
        .single();

      if (!profile?.is_admin && !profile?.is_super_admin && !profile?.is_exec_board) {
        return { success: false, message: "Access denied. Only admins, instructors, or exec board members can take attendance." };
      }

      // Map natural language course names to course codes
      const courseName = (args.course_name || "").toLowerCase().trim();
      let courseCode = "";
      
      // Mapping logic
      if (courseName.includes("240") || courseName.includes("survey") || courseName.includes("african american music") || courseName.includes("african-american music")) {
        courseCode = "MUS 240";
      } else if (courseName.includes("070") || courseName.includes("glee club") || courseName.includes("glee") && !courseName.includes("101") && !courseName.includes("000")) {
        courseCode = "MUS 070";
      } else if (courseName.includes("210") || courseName.includes("conducting") || courseName.includes("choral conducting")) {
        courseCode = "MUS 210";
      } else if (courseName.includes("001") || courseName.includes("private") || courseName.includes("applied lessons")) {
        courseCode = "MUS 001";
      } else if (courseName.includes("101") || courseName.includes("leadership")) {
        courseCode = "GLEE 101";
      } else if (courseName.includes("000") || courseName.includes("sight") || courseName.includes("singing") || courseName.includes("sight reading") || courseName.includes("sight-reading")) {
        courseCode = "GLEE 000";
      } else if (courseName.includes("100") || courseName.includes("bowman") || courseName.includes("scholar") || courseName.includes("lh")) {
        courseCode = "LH 100";
      } else if (courseName.includes("mus-") || courseName.includes("mus ") || courseName.includes("glee-") || courseName.includes("glee ") || courseName.includes("lh-") || courseName.includes("lh ")) {
        // Try to extract course code directly
        courseCode = courseName.replace(/-/g, " ").toUpperCase();
      } else {
        return { success: false, message: `Could not identify course "${args.course_name}". Try saying the course code like "MUS-240" or "Glee Club".` };
      }

      console.log(`Looking for course: ${courseCode}`);

      // Find the course
      const { data: course, error: courseError } = await supabase
        .from("gw_courses")
        .select("id, course_code, title")
        .or(`course_code.ilike.%${courseCode}%,title.ilike.%${courseCode}%`)
        .limit(1)
        .single();

      if (courseError || !course) {
        console.error("Course lookup error:", courseError);
        return { success: false, message: `Course "${courseCode}" not found. Available courses: MUS-070 (Glee Club), MUS-240, MUS-210, MUS-001, GLEE-101, GLEE-000, LH-100.` };
      }

      console.log(`Found course: ${course.course_code} - ${course.title}`);

      // Find current or upcoming session
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTimeStr = now.toTimeString().slice(0, 8); // HH:MM:SS

      // Priority 1: Current session (happening right now)
      let { data: currentSession } = await supabase
        .from("gw_course_class_sessions")
        .select("id, session_date, start_time, end_time, title, location")
        .eq("course_id", course.id)
        .eq("session_date", todayStr)
        .lte("start_time", currentTimeStr)
        .gte("end_time", currentTimeStr)
        .limit(1)
        .single();

      // Priority 2: Today's upcoming session
      if (!currentSession) {
        const { data: upcomingToday } = await supabase
          .from("gw_course_class_sessions")
          .select("id, session_date, start_time, end_time, title, location")
          .eq("course_id", course.id)
          .eq("session_date", todayStr)
          .gt("start_time", currentTimeStr)
          .order("start_time", { ascending: true })
          .limit(1)
          .single();
        
        if (upcomingToday) currentSession = upcomingToday;
      }

      // Priority 3: Next upcoming session (future date)
      if (!currentSession) {
        const { data: nextSession } = await supabase
          .from("gw_course_class_sessions")
          .select("id, session_date, start_time, end_time, title, location")
          .eq("course_id", course.id)
          .gt("session_date", todayStr)
          .order("session_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(1)
          .single();
        
        if (nextSession) currentSession = nextSession;
      }

      if (!currentSession) {
        return { 
          success: false, 
          message: `No class sessions found for ${course.course_code}. You may need to create a class session first in the Academy calendar.`,
          action: "navigate",
          route: `/academy/${course.course_code.toLowerCase().replace(" ", "-")}?tab=attendance`
        };
      }

      console.log(`Found session: ${currentSession.title} on ${currentSession.session_date}`);

      // Generate QR code for this session
      const { data: qrResult, error: qrError } = await supabase.rpc("generate_session_qr_code", {
        p_session_id: currentSession.id,
        p_generated_by: userId,
        p_expires_in_minutes: 5,
      });

      if (qrError) {
        console.error("QR generation error:", qrError);
        return { success: false, message: `Failed to generate QR code: ${qrError.message}` };
      }

      const qrData = qrResult as { success: boolean; qr_token?: string; expires_at?: string; error?: string };

      if (!qrData?.success || !qrData.qr_token) {
        return { success: false, message: qrData?.error || "Failed to generate QR code." };
      }

      // Get enrollment count for stats
      const { count: enrolledCount } = await supabase
        .from("gw_course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", course.id)
        .eq("enrollment_status", "active");

      // Get checked-in count for this session
      const { count: checkedInCount } = await supabase
        .from("gw_attendance_records")
        .select("id", { count: "exact", head: true })
        .eq("attendance_session_id", currentSession.id)
        .in("status", ["present", "late"]);

      return {
        success: true,
        action: "open_attendance_qr",
        course_code: course.course_code,
        course_title: course.title,
        session_id: currentSession.id,
        session_title: currentSession.title || course.title,
        session_date: currentSession.session_date,
        start_time: currentSession.start_time,
        end_time: currentSession.end_time,
        location: currentSession.location,
        qr_token: qrData.qr_token,
        expires_at: qrData.expires_at,
        enrolled_count: enrolledCount || 0,
        checked_in_count: checkedInCount || 0,
        message: `Opening attendance QR for ${course.course_code} - ${currentSession.title || course.title}. ${checkedInCount || 0}/${enrolledCount || 0} checked in.`,
      };
    }

    default:
      return { message: "Unknown tool" };
  }
}

function generateSecurePassword(): string {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
}

// ==========================================
// MAIN HANDLER
// ==========================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Glee Assistant, a powerful AI assistant for GleeWorld - the official digital platform of the Spelman College Glee Club, celebrating over 100 years of musical excellence. The Glee Club's motto is "To Amaze and Inspire."

${GLEEWORLD_KNOWLEDGE}

## Your Capabilities:

### STANDARD FEATURES (All Users):
- Search and open sheet music from the library
- Get upcoming events, rehearsals, and concerts
- Check assignment due dates and class schedules
- Search for member contact information
- Navigate to any page in GleeWorld
- Control Glee World Radio (play, pause, volume, request playlists)
- Get announcements and active polls
- Answer questions about policies using the handbook
- Answer general questions about GleeWorld features and how to use the site

### ENROLLMENT MANAGEMENT (Admin/Exec Only):
- **check_schedule_submissions**: Get list of students who have/haven't submitted class schedules, with conflict detection
- **get_enrollment_stats**: Get enrollment statistics and voice part breakdown for any course
- **get_student_grades**: Retrieve individual or class-wide grade reports
- **send_report_email**: Send formatted email reports to any member

### CONTENT CREATION (Admin/Exec Only):
- **create_quick_poll**: Create polls from natural language descriptions
- **generate_test**: Generate AI-created quizzes and tests on any topic

### ADMIN TOOLS (Admin Only):
- Reset user passwords
- View user login info and account details
- List and search users
- Update user roles
- Verify/unverify accounts

## Guidelines:
- Be warm, friendly, and helpful - embody the spirit of sisterhood
- Use tools to provide accurate, real-time information
- When users ask to do something, use the appropriate tool
- For admin/exec actions, verify permissions before executing
- If asked about something not in your tools, explain what the user can do manually
- Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Current semester: ${new Date().getMonth() >= 0 && new Date().getMonth() <= 4 ? 'Spring' : 'Fall'} ${new Date().getFullYear()}
- Keep responses concise but helpful
- When sending reports, format them clearly with relevant data`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        
        console.log(`Executing tool: ${toolName}`, toolArgs);
        const result = await executeTool(toolName, toolArgs, userId);
        console.log(`Tool result:`, result);

        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result),
        });
      }

      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: systemPrompt }, ...messages, assistantMessage, ...toolResults],
        }),
      });

      if (!followUpResponse.ok) throw new Error("Follow-up AI call failed");

      const followUpData = await followUpResponse.json();
      const finalMessage = followUpData.choices[0].message.content;

      const actions = toolResults.map(r => JSON.parse(r.content)).filter(r => r.action);

      return new Response(JSON.stringify({ message: finalMessage, actions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: assistantMessage.content, actions: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Glee Assistant error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
