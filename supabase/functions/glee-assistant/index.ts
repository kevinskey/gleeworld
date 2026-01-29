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
- Major concerts:
  - Fall: Founder's Day Concert
  - Winter: Spelman-Morehouse Christmas Carol (December) - The signature annual tradition, one of the largest collegiate choral concerts in the nation
  - Spring: Annual Concert
  - Commencement Concert
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
      description: "Get upcoming events, rehearsals, and concerts from the calendar. For concerts specifically, use event_type='concert' or 'performance' and set days_ahead to 365 to find annual concerts.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Number of days ahead to look (default 7, use 365 for concerts)" },
          event_type: { type: "string", description: "Filter by event type: 'concert', 'performance', 'class', 'meeting', 'rehearsal', 'other'" },
          search_term: { type: "string", description: "Search term to filter events by title (e.g., 'Christmas Carol', 'Annual')" },
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
      name: "get_student_record",
      description: "Retrieve comprehensive student grade information including journals, midterm, assignments, attendance, and participation. Provides transcript-like reports. Use for queries like 'What grade is Kevin getting?' or 'List Maya's transcripts'.",
      parameters: {
        type: "object",
        properties: {
          student_name: { type: "string", description: "Student name to search for (fuzzy matching supported). Required for individual lookups." },
          student_email: { type: "string", description: "Specific student's email (alternative to name)." },
          course_code: { type: "string", description: "Course code (e.g., 'MUS-240'). Defaults to MUS-240." },
          format: { 
            type: "string", 
            enum: ["summary", "detailed", "transcript"],
            description: "Output format. 'summary' for quick grade overview, 'detailed' for breakdown, 'transcript' for full record with all assignments."
          },
          include_journals: { type: "boolean", description: "Include journal grades with feedback (default true for detailed/transcript)." },
          include_midterm: { type: "boolean", description: "Include midterm exam scores (default true for detailed/transcript)." },
          include_attendance: { type: "boolean", description: "Include attendance records (default true)." },
          include_participation: { type: "boolean", description: "Include participation grades (default true for detailed/transcript)." },
          semester: { type: "string", description: "Semester (defaults to current)." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_student_email",
      description: "Send an email to one or more students. Can email individual students by name, groups (like 'all students', 'students missing journals'), or filter by grade status. Optionally include current grade summary.",
      parameters: {
        type: "object",
        properties: {
          student_name: { 
            type: "string", 
            description: "Student name OR group: 'Kevin Johnson', 'all', 'class', 'students below C', 'students missing journals', 'students who haven't submitted'." 
          },
          subject: { type: "string", description: "Email subject line." },
          message: { type: "string", description: "Email body message. Can include grade placeholders like {grade}, {percentage}, {name}." },
          include_grade: { type: "boolean", description: "Auto-include current grade summary in the email (default false)." },
          course_code: { type: "string", description: "Course code for context (defaults to MUS-240)." },
        },
        required: ["subject", "message"],
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
  // ==========================================
  // STUDENT SELF-SERVICE TOOLS
  // ==========================================
  {
    type: "function",
    function: {
      name: "get_my_grade",
      description: "Get the current user's own grade in a specific course. Use when a student asks 'What is my grade?' or 'How am I doing in MUS-240?'",
      parameters: {
        type: "object",
        properties: {
          course_code: { 
            type: "string", 
            description: "Course code (e.g., 'MUS-240', 'Survey of African American Music', 'Glee Club'). Defaults to MUS-240." 
          },
          format: {
            type: "string",
            enum: ["summary", "detailed"],
            description: "Output format. 'summary' for quick grade overview, 'detailed' for full breakdown."
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_attendance",
      description: "Get the current user's attendance record. Use when a student asks 'How many classes have I missed?' or 'What is my attendance?'",
      parameters: {
        type: "object",
        properties: {
          course_code: { 
            type: "string", 
            description: "Course code to check attendance for. Defaults to all enrolled courses." 
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "file_absence_excuse",
      description: "File an excuse for missing a class or request to be excused from an upcoming class. Use when student says 'I need to file an excuse' or 'I missed class because...'",
      parameters: {
        type: "object",
        properties: {
          course_code: { 
            type: "string", 
            description: "Course code (e.g., 'MUS-240', 'Glee Club'). Required." 
          },
          absence_date: { 
            type: "string", 
            description: "Date of the absence in natural language (e.g., 'today', 'yesterday', 'January 15', 'last Monday'). Required." 
          },
          reason: { 
            type: "string", 
            description: "Reason for the absence. Required." 
          },
          documentation_type: {
            type: "string",
            enum: ["medical", "family_emergency", "academic_conflict", "approved_activity", "other"],
            description: "Type of documentation/reason category."
          },
        },
        required: ["course_code", "absence_date", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_assignments",
      description: "Get the student's upcoming assignments, due dates, and submission status. Use for questions like 'What assignment is due next?' or 'Am I up-to-date on my assignments?'",
      parameters: {
        type: "object",
        properties: {
          course_code: { 
            type: "string", 
            description: "Course code or name (e.g., 'MUS-240', 'Survey of African American Music', 'Glee Academy'). If not specified, shows all enrolled courses." 
          },
          filter: {
            type: "string",
            enum: ["all", "upcoming", "overdue", "submitted", "not_submitted"],
            description: "Filter assignments by status. Defaults to 'upcoming'."
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_next_rehearsal",
      description: "Get the next Glee Club rehearsal or class session. Use for questions like 'When is the next rehearsal?' or 'Where does the Glee Club rehearse?'",
      parameters: {
        type: "object",
        properties: {
          course_code: { 
            type: "string", 
            description: "Course code (defaults to 'MUS-070' for Glee Club)." 
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_message_to_instructor",
      description: "Send an email or SMS to an instructor, Dr. Johnson, or an executive board member. Use when student says 'Send Dr. Johnson an email' or 'Text the Glee Club president'",
      parameters: {
        type: "object",
        properties: {
          recipient_role: { 
            type: "string", 
            description: "Who to message: 'instructor', 'dr. johnson', 'doc johnson', 'president', 'vice president', 'secretary', 'treasurer', 'chaplain', or a specific name." 
          },
          message_type: { 
            type: "string", 
            enum: ["email", "sms"],
            description: "Type of message to send. Defaults to email." 
          },
          subject: { 
            type: "string", 
            description: "Email subject line (required for emails)." 
          },
          message: { 
            type: "string", 
            description: "The message content. Required." 
          },
        },
        required: ["recipient_role", "message"],
      },
    },
  },
  // ==========================================
  // CALENDAR EVENT CREATION TOOL
  // ==========================================
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a new calendar event with specified details. Can include recurring events, public/private visibility, attendance requirements, and generate an AI event image if requested.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The event title (required)." },
          description: { type: "string", description: "Event description." },
          start_date: { type: "string", description: "Start date and time in ISO format or natural language like 'tomorrow at 5pm', 'March 15 at 2:00 PM', 'next Monday at 7pm'." },
          end_date: { type: "string", description: "End date and time. If not provided, defaults to 1 hour after start." },
          location: { type: "string", description: "Event location or venue name." },
          event_type: { 
            type: "string", 
            enum: ["rehearsal", "performance", "concert", "meeting", "workshop", "tour", "social", "academic", "other"],
            description: "Type of event."
          },
          is_public: { type: "boolean", description: "Whether the event is publicly visible (default false for internal events)." },
          attendance_required: { type: "boolean", description: "Whether attendance is mandatory (default false)." },
          max_attendees: { type: "number", description: "Maximum number of attendees allowed." },
          calendar_name: { 
            type: "string", 
            description: "Which calendar to add the event to. Options include: 'Glee Club', 'MUS 240', 'MUS 070', 'Bowman Scholars', 'LH 100', 'General'. Defaults to 'Glee Club'."
          },
          is_recurring: { type: "boolean", description: "Whether this is a recurring event." },
          recurrence_type: { 
            type: "string", 
            enum: ["daily", "weekly", "monthly"],
            description: "Type of recurrence if recurring."
          },
          recurrence_interval: { type: "number", description: "Interval for recurrence (e.g., every 2 weeks). Defaults to 1." },
          recurrence_days_of_week: { 
            type: "array", 
            items: { type: "number" },
            description: "Days of week for weekly recurrence (0=Sunday, 1=Monday, etc.)."
          },
          recurrence_end_date: { type: "string", description: "When the recurring events should stop." },
          generate_image: { type: "boolean", description: "Whether to generate an AI image for this event." },
          image_prompt: { type: "string", description: "Custom prompt for AI image generation. If not provided, one will be generated from the event details." },
        },
        required: ["title", "start_date"],
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

    case "get_student_record": {
      // Verify instructor/admin permissions
      const { data: profile } = await supabase
        .from("gw_profiles")
        .select("is_admin, is_super_admin, full_name")
        .eq("user_id", userId)
        .single();

      if (!profile?.is_admin && !profile?.is_super_admin) {
        return { success: false, message: "Access denied. Only instructors and admins can view student records." };
      }

      const courseCode = args.course_code || "MUS-240";
      const semester = args.semester || currentSemester;
      const format = args.format || "summary";
      const includeJournals = args.include_journals ?? (format !== "summary");
      const includeMidterm = args.include_midterm ?? (format !== "summary");
      const includeAttendance = args.include_attendance ?? true;
      const includeParticipation = args.include_participation ?? (format !== "summary");

      // Get course
      const { data: course } = await supabase
        .from("gw_courses")
        .select("id, title, course_code")
        .ilike("course_code", `%${courseCode.replace("-", " ")}%`)
        .single();

      if (!course) {
        return { success: false, message: `Course ${courseCode} not found.` };
      }

      // If specific student requested, do fuzzy name matching
      if (args.student_email || args.student_name) {
        let studentQuery = supabase.from("gw_profiles").select("user_id, full_name, email, voice_part");
        
        if (args.student_email) {
          studentQuery = studentQuery.eq("email", args.student_email);
        } else if (args.student_name) {
          // Fuzzy name matching - split the name and match any part
          const nameParts = args.student_name.trim().split(/\s+/);
          const orConditions = nameParts.map((part: string) => `full_name.ilike.%${part}%`).join(",");
          studentQuery = studentQuery.or(orConditions);
        }

        const { data: students } = await studentQuery.limit(5);

        if (!students?.length) {
          return { success: false, message: `No students found matching "${args.student_name || args.student_email}".` };
        }

        // If multiple matches, return them for clarification
        if (students.length > 1 && !args.student_email) {
          return {
            success: true,
            multiple_matches: true,
            students: students.map(s => ({ name: s.full_name, email: s.email, voice_part: s.voice_part })),
            message: `Found ${students.length} students matching "${args.student_name}". Please specify which one: ${students.map(s => s.full_name).join(", ")}`,
          };
        }

        const student = students[0];

        // Get comprehensive record for this student
        const record: any = {
          student_name: student.full_name,
          student_email: student.email,
          voice_part: student.voice_part,
          course: course.course_code,
          semester: semester,
        };

        // 1. Get Journal Grades
        if (includeJournals) {
          const { data: journals } = await supabase
            .from("mus240_journal_grades")
            .select("journal_number, grade, feedback, graded_at, assignment_id")
            .eq("student_id", student.user_id)
            .order("journal_number", { ascending: true });

          const journalGrades = journals || [];
          const journalTotal = journalGrades.reduce((sum, j) => sum + (j.grade || 0), 0);
          const journalMax = journalGrades.length * 20; // Assuming 20 pts per journal
          
          record.journals = {
            grades: journalGrades.map(j => ({
              number: j.journal_number,
              grade: j.grade,
              max: 20,
              percentage: j.grade ? Math.round((j.grade / 20) * 100) : 0,
              feedback: j.feedback,
              graded_at: j.graded_at,
            })),
            total_earned: journalTotal,
            total_possible: journalMax,
            percentage: journalMax > 0 ? Math.round((journalTotal / journalMax) * 100) : 0,
            count_graded: journalGrades.filter(j => j.grade !== null).length,
          };
        }

        // 2. Get Midterm Score
        if (includeMidterm) {
          const { data: midterm } = await supabase
            .from("mus240_midterm_submissions")
            .select("grade, feedback, graded_at, comprehensive_feedback, selected_essay_question")
            .eq("user_id", student.user_id)
            .single();

          if (midterm) {
            record.midterm = {
              grade: midterm.grade,
              max: 90, // Standard midterm max
              percentage: midterm.grade ? Math.round((midterm.grade / 90) * 100) : 0,
              feedback: midterm.feedback || midterm.comprehensive_feedback,
              graded_at: midterm.graded_at,
              essay_question: midterm.selected_essay_question,
            };
          } else {
            record.midterm = { grade: null, submitted: false, message: "Not yet submitted" };
          }
        }

        // 3. Get Participation
        if (includeParticipation) {
          const { data: participation } = await supabase
            .from("mus240_participation_grades")
            .select("grade, feedback, graded_at")
            .eq("student_id", student.user_id)
            .single();

          if (participation) {
            record.participation = {
              grade: participation.grade,
              max: 50, // Standard participation max
              percentage: participation.grade ? Math.round((participation.grade / 50) * 100) : 0,
              feedback: participation.feedback,
            };
          } else {
            record.participation = { grade: null, not_graded: true };
          }
        }

        // 4. Get Attendance
        if (includeAttendance) {
          const { data: attendance } = await supabase
            .from("gw_attendance_records")
            .select("status, check_in_time, attendance_session_id")
            .eq("student_id", student.user_id);

          const records = attendance || [];
          const present = records.filter(a => a.status === "present").length;
          const late = records.filter(a => a.status === "late").length;
          const absent = records.filter(a => a.status === "absent").length;
          const excused = records.filter(a => a.status === "excused").length;
          const total = records.length;

          record.attendance = {
            present: present,
            late: late,
            absent_unexcused: absent,
            excused: excused,
            total_sessions: total,
            attendance_rate: total > 0 ? Math.round(((present + late + excused) / total) * 100) : 100,
          };
        }

        // 5. Get other assignment submissions (non-journal)
        const { data: submissions } = await supabase
          .from("assignment_submissions")
          .select(`
            id, grade, status, submitted_at, feedback,
            gw_course_assignments!inner(id, title, points, due_date)
          `)
          .eq("student_id", student.user_id)
          .eq("gw_course_assignments.course_id", course.id);

        // Filter out journals (they have their own table)
        const { data: journalAssignmentIds } = await supabase
          .from("mus240_journal_grades")
          .select("assignment_id")
          .eq("student_id", student.user_id);

        const journalIds = new Set((journalAssignmentIds || []).map(j => j.assignment_id));
        const otherSubmissions = (submissions || []).filter(s => !journalIds.has(s.gw_course_assignments?.id));

        if (otherSubmissions.length > 0) {
          record.other_assignments = otherSubmissions.map(s => ({
            title: s.gw_course_assignments?.title,
            grade: s.grade,
            max: s.gw_course_assignments?.points,
            percentage: s.grade && s.gw_course_assignments?.points ? Math.round((s.grade / s.gw_course_assignments.points) * 100) : 0,
            status: s.status,
            due_date: s.gw_course_assignments?.due_date,
            feedback: s.feedback,
          }));
        }

        // 6. Calculate Overall Grade
        let totalEarned = 0;
        let totalPossible = 0;

        // Journals (if graded)
        if (record.journals) {
          totalEarned += record.journals.total_earned;
          totalPossible += record.journals.total_possible;
        }

        // Midterm
        if (record.midterm?.grade) {
          totalEarned += record.midterm.grade;
          totalPossible += 90;
        }

        // Participation
        if (record.participation?.grade) {
          totalEarned += record.participation.grade;
          totalPossible += 50;
        }

        // Other assignments
        if (record.other_assignments) {
          record.other_assignments.forEach((a: any) => {
            if (a.grade !== null) {
              totalEarned += a.grade;
              totalPossible += a.max || 0;
            }
          });
        }

        // Apply attendance deduction (2 pts per unexcused absence)
        const attendanceDeduction = (record.attendance?.absent_unexcused || 0) * 2;
        
        const rawPercentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 100;
        const finalPercentage = Math.max(0, Math.round(rawPercentage - attendanceDeduction));
        
        // Letter grade
        const getLetterGrade = (pct: number) => {
          if (pct >= 95) return "A";
          if (pct >= 90) return "A-";
          if (pct >= 87) return "B+";
          if (pct >= 83) return "B";
          if (pct >= 80) return "B-";
          if (pct >= 77) return "C+";
          if (pct >= 73) return "C";
          if (pct >= 70) return "C-";
          if (pct >= 65) return "D+";
          if (pct >= 60) return "D";
          return "F";
        };

        record.overall_grade = {
          percentage: finalPercentage,
          letter_grade: getLetterGrade(finalPercentage),
          total_earned: totalEarned,
          total_possible: totalPossible,
          attendance_deduction: attendanceDeduction,
        };

        // Generate human-readable message
        let message = `**${student.full_name}** - ${course.course_code}: **${finalPercentage}% (${getLetterGrade(finalPercentage)})**\n`;
        
        if (format !== "summary") {
          if (record.journals) {
            message += `\n📚 **Journals:** ${record.journals.total_earned}/${record.journals.total_possible} pts (${record.journals.count_graded} graded)`;
          }
          if (record.midterm?.grade) {
            message += `\n📝 **Midterm:** ${record.midterm.grade}/${record.midterm.max} pts (${record.midterm.percentage}%)`;
          }
          if (record.participation?.grade) {
            message += `\n💬 **Participation:** ${record.participation.grade}/${record.participation.max} pts`;
          }
          if (record.attendance) {
            message += `\n📅 **Attendance:** ${record.attendance.present + record.attendance.late}/${record.attendance.total_sessions} (${record.attendance.attendance_rate}%)`;
            if (record.attendance.absent_unexcused > 0) {
              message += ` - ${record.attendance.absent_unexcused} unexcused absence(s), -${attendanceDeduction} pts`;
            }
          }
        }

        return {
          success: true,
          record: record,
          message: message,
          action: "show_student_record",
        };
      }

      // No specific student - return class-wide summary
      const { data: enrollments } = await supabase
        .from("gw_course_enrollments")
        .select(`
          user_id,
          gw_profiles!inner(full_name, email, voice_part)
        `)
        .eq("course_id", course.id)
        .eq("semester", semester)
        .eq("enrollment_status", "active");

      if (!enrollments?.length) {
        return { success: false, message: `No students enrolled in ${courseCode} for ${semester}.` };
      }

      // Get grade summaries for all students (simplified for class view)
      const classSummary: any[] = [];

      for (const enrollment of enrollments) {
        // Quick grade calculation for each student
        const { data: journals } = await supabase
          .from("mus240_journal_grades")
          .select("grade")
          .eq("student_id", enrollment.user_id);
        
        const { data: midterm } = await supabase
          .from("mus240_midterm_submissions")
          .select("grade")
          .eq("user_id", enrollment.user_id)
          .single();

        const { data: participation } = await supabase
          .from("mus240_participation_grades")
          .select("grade")
          .eq("student_id", enrollment.user_id)
          .single();

        const journalTotal = (journals || []).reduce((sum, j) => sum + (j.grade || 0), 0);
        const journalMax = (journals || []).length * 20;
        const midtermGrade = midterm?.grade || 0;
        const participationGrade = participation?.grade || 0;

        const totalEarned = journalTotal + midtermGrade + participationGrade;
        const totalPossible = journalMax + 90 + 50; // journals + midterm + participation
        const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

        const getLetterGrade = (pct: number) => {
          if (pct >= 95) return "A";
          if (pct >= 90) return "A-";
          if (pct >= 87) return "B+";
          if (pct >= 83) return "B";
          if (pct >= 80) return "B-";
          if (pct >= 77) return "C+";
          if (pct >= 73) return "C";
          if (pct >= 70) return "C-";
          if (pct >= 65) return "D+";
          if (pct >= 60) return "D";
          return "F";
        };

        classSummary.push({
          name: enrollment.gw_profiles?.full_name,
          email: enrollment.gw_profiles?.email,
          voice_part: enrollment.gw_profiles?.voice_part,
          percentage: percentage,
          letter_grade: getLetterGrade(percentage),
          journals_graded: (journals || []).filter(j => j.grade !== null).length,
          has_midterm: !!midterm?.grade,
        });
      }

      // Sort by percentage descending
      classSummary.sort((a, b) => b.percentage - a.percentage);

      const avgGrade = classSummary.length > 0
        ? Math.round(classSummary.reduce((sum, s) => sum + s.percentage, 0) / classSummary.length)
        : 0;

      // Grade distribution
      const distribution = {
        A: classSummary.filter(s => s.percentage >= 90).length,
        B: classSummary.filter(s => s.percentage >= 80 && s.percentage < 90).length,
        C: classSummary.filter(s => s.percentage >= 70 && s.percentage < 80).length,
        D: classSummary.filter(s => s.percentage >= 60 && s.percentage < 70).length,
        F: classSummary.filter(s => s.percentage < 60).length,
      };

      return {
        success: true,
        course: course.course_code,
        semester: semester,
        student_count: classSummary.length,
        class_average: avgGrade,
        distribution: distribution,
        students: classSummary,
        message: `**${course.course_code} Class Grades** (${semester})\n${classSummary.length} students, ${avgGrade}% average\n\nGrade Distribution: A=${distribution.A}, B=${distribution.B}, C=${distribution.C}, D=${distribution.D}, F=${distribution.F}`,
        action: "show_class_grades",
      };
    }

    case "send_student_email": {
      // Verify instructor/admin permissions
      const { data: senderProfile } = await supabase
        .from("gw_profiles")
        .select("is_admin, is_super_admin, full_name, email")
        .eq("user_id", userId)
        .single();

      if (!senderProfile?.is_admin && !senderProfile?.is_super_admin) {
        return { success: false, message: "Access denied. Only instructors and admins can send emails to students." };
      }

      const courseCode = args.course_code || "MUS-240";
      const studentNameOrGroup = (args.student_name || "").toLowerCase().trim();
      const includeGrade = args.include_grade ?? false;

      // Get course
      const { data: course } = await supabase
        .from("gw_courses")
        .select("id, title, course_code")
        .ilike("course_code", `%${courseCode.replace("-", " ")}%`)
        .single();

      if (!course) {
        return { success: false, message: `Course ${courseCode} not found.` };
      }

      // Determine recipients
      let recipients: { user_id: string; email: string; full_name: string; percentage?: number; letter_grade?: string }[] = [];

      // Group selections
      if (studentNameOrGroup === "all" || studentNameOrGroup === "class" || studentNameOrGroup === "everyone") {
        // All enrolled students
        const { data: enrollments } = await supabase
          .from("gw_course_enrollments")
          .select(`
            user_id,
            gw_profiles!inner(user_id, full_name, email)
          `)
          .eq("course_id", course.id)
          .eq("enrollment_status", "active");

        recipients = (enrollments || []).map(e => ({
          user_id: e.user_id,
          email: e.gw_profiles?.email || "",
          full_name: e.gw_profiles?.full_name || "",
        }));

      } else if (studentNameOrGroup.includes("below") || studentNameOrGroup.includes("failing") || studentNameOrGroup.includes("under")) {
        // Students below a certain grade (default C = 70%)
        let threshold = 70;
        const gradeMatch = studentNameOrGroup.match(/below\s*([a-d])/i);
        if (gradeMatch) {
          const letterToThreshold: Record<string, number> = { a: 90, b: 80, c: 70, d: 60 };
          threshold = letterToThreshold[gradeMatch[1].toLowerCase()] || 70;
        }

        // Get all enrolled students with grades
        const { data: enrollments } = await supabase
          .from("gw_course_enrollments")
          .select(`user_id, gw_profiles!inner(user_id, full_name, email)`)
          .eq("course_id", course.id)
          .eq("enrollment_status", "active");

        for (const e of enrollments || []) {
          // Calculate quick grade
          const { data: journals } = await supabase.from("mus240_journal_grades").select("grade").eq("student_id", e.user_id);
          const { data: midterm } = await supabase.from("mus240_midterm_submissions").select("grade").eq("user_id", e.user_id).single();
          const { data: participation } = await supabase.from("mus240_participation_grades").select("grade").eq("student_id", e.user_id).single();

          const journalTotal = (journals || []).reduce((sum, j) => sum + (j.grade || 0), 0);
          const journalMax = (journals || []).length * 20;
          const totalEarned = journalTotal + (midterm?.grade || 0) + (participation?.grade || 0);
          const totalPossible = journalMax + 90 + 50;
          const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

          if (percentage < threshold) {
            recipients.push({
              user_id: e.user_id,
              email: e.gw_profiles?.email || "",
              full_name: e.gw_profiles?.full_name || "",
              percentage: percentage,
              letter_grade: percentage >= 90 ? "A" : percentage >= 80 ? "B" : percentage >= 70 ? "C" : percentage >= 60 ? "D" : "F",
            });
          }
        }

      } else if (studentNameOrGroup.includes("missing") || studentNameOrGroup.includes("haven't submitted") || studentNameOrGroup.includes("no journal")) {
        // Students missing journals or assignments
        const { data: enrollments } = await supabase
          .from("gw_course_enrollments")
          .select(`user_id, gw_profiles!inner(user_id, full_name, email)`)
          .eq("course_id", course.id)
          .eq("enrollment_status", "active");

        // Get count of published journal assignments
        const { data: journalAssignments } = await supabase
          .from("gw_course_assignments")
          .select("id")
          .eq("course_id", course.id)
          .eq("is_published", true)
          .ilike("title", "%journal%");

        const expectedJournals = journalAssignments?.length || 4;

        for (const e of enrollments || []) {
          const { data: journals } = await supabase
            .from("mus240_journal_grades")
            .select("journal_number")
            .eq("student_id", e.user_id);

          if ((journals?.length || 0) < expectedJournals) {
            recipients.push({
              user_id: e.user_id,
              email: e.gw_profiles?.email || "",
              full_name: e.gw_profiles?.full_name || "",
            });
          }
        }

      } else {
        // Individual student lookup (fuzzy matching)
        const nameParts = studentNameOrGroup.split(/\s+/);
        const orConditions = nameParts.map((part: string) => `full_name.ilike.%${part}%`).join(",");
        
        const { data: students } = await supabase
          .from("gw_profiles")
          .select("user_id, full_name, email")
          .or(orConditions)
          .limit(5);

        if (!students?.length) {
          return { success: false, message: `No students found matching "${args.student_name}".` };
        }

        if (students.length > 1) {
          return {
            success: false,
            multiple_matches: true,
            students: students.map(s => ({ name: s.full_name, email: s.email })),
            message: `Found ${students.length} students matching "${args.student_name}". Please be more specific: ${students.map(s => s.full_name).join(", ")}`,
          };
        }

        recipients = [{ user_id: students[0].user_id, email: students[0].email, full_name: students[0].full_name }];
      }

      if (recipients.length === 0) {
        return { success: false, message: "No recipients found for this email." };
      }

      // Build email content
      let emailSubject = args.subject;
      const senderName = senderProfile.full_name || "Glee Club Instructor";

      // For each recipient, personalize the message
      const emailsSent: string[] = [];
      const emailsFailed: string[] = [];

      for (const recipient of recipients) {
        let personalizedMessage = args.message
          .replace(/\{name\}/gi, recipient.full_name || "Student")
          .replace(/\{grade\}/gi, recipient.letter_grade || "N/A")
          .replace(/\{percentage\}/gi, recipient.percentage?.toString() || "N/A");

        // Add grade summary if requested
        let gradeSummary = "";
        if (includeGrade) {
          // Quick grade calc
          const { data: journals } = await supabase.from("mus240_journal_grades").select("grade").eq("student_id", recipient.user_id);
          const { data: midterm } = await supabase.from("mus240_midterm_submissions").select("grade").eq("user_id", recipient.user_id).single();
          const { data: participation } = await supabase.from("mus240_participation_grades").select("grade").eq("student_id", recipient.user_id).single();

          const journalTotal = (journals || []).reduce((sum, j) => sum + (j.grade || 0), 0);
          const journalMax = (journals || []).length * 20;
          const totalEarned = journalTotal + (midterm?.grade || 0) + (participation?.grade || 0);
          const totalPossible = journalMax + 90 + 50;
          const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

          gradeSummary = `
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1a1a2e;">Your Current Grade Summary</h3>
              <p><strong>Overall:</strong> ${percentage}%</p>
              <p><strong>Journals:</strong> ${journalTotal}/${journalMax} pts</p>
              <p><strong>Midterm:</strong> ${midterm?.grade || 'Not submitted'}${midterm?.grade ? '/90 pts' : ''}</p>
              <p><strong>Participation:</strong> ${participation?.grade || 'Not graded'}${participation?.grade ? '/50 pts' : ''}</p>
            </div>
          `;
        }

        const htmlContent = `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Spelman College Glee Club</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-style: italic;">${course.course_code} - ${course.title}</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0;">
              <p style="color: #333;">Dear ${recipient.full_name || 'Student'},</p>
              <div style="line-height: 1.8; color: #333; white-space: pre-wrap;">${personalizedMessage}</div>
              ${gradeSummary}
            </div>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                Sent by ${senderName} via GleeWorld<br>
                <a href="https://gleeworld.org" style="color: #1a1a2e;">gleeworld.org</a>
              </p>
            </div>
          </div>
        `;

        // Send email
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/send-branded-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              to: recipient.email,
              subject: emailSubject,
              html: htmlContent,
              senderName: senderName,
              replyTo: senderProfile.email,
              senderId: userId,
            }),
          });

          const result = await response.json();
          if (response.ok && result.success) {
            emailsSent.push(recipient.full_name || recipient.email);
          } else {
            emailsFailed.push(recipient.full_name || recipient.email);
          }
        } catch (error) {
          console.error("Email send error:", error);
          emailsFailed.push(recipient.full_name || recipient.email);
        }
      }

      // Return result
      if (emailsSent.length === 0) {
        return { success: false, message: "Failed to send emails to any recipients." };
      }

      return {
        success: true,
        action: "emails_sent",
        sent_count: emailsSent.length,
        failed_count: emailsFailed.length,
        recipients_sent: emailsSent,
        recipients_failed: emailsFailed.length > 0 ? emailsFailed : undefined,
        message: `✅ Email sent to ${emailsSent.length} student(s)${emailsFailed.length > 0 ? `. ${emailsFailed.length} failed.` : '.'}\n\nRecipients: ${emailsSent.slice(0, 5).join(", ")}${emailsSent.length > 5 ? ` and ${emailsSent.length - 5} more...` : ''}`,
      };
    }

    // ==========================================
    // STUDENT SELF-SERVICE TOOLS
    // ==========================================
    
    case "get_my_grade": {
      // Get the current user's own grade
      const courseCode = args.course_code || "MUS-240";
      const format = args.format || "summary";

      // Get user profile
      const { data: profile } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, email, voice_part")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        return { success: false, message: "Could not find your profile. Please contact an administrator." };
      }

      // Find course (flexible matching)
      let courseQuery = courseCode.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
      
      // Handle common aliases
      if (courseQuery.includes("survey") || courseQuery.includes("african american")) {
        courseQuery = "MUS 240";
      } else if (courseQuery.includes("glee club") && !courseQuery.includes("101") && !courseQuery.includes("000")) {
        courseQuery = "MUS 070";
      } else if (courseQuery.includes("glee") && courseQuery.includes("academy")) {
        // Search all enrolled courses
        courseQuery = "";
      }

      let course;
      if (courseQuery) {
        const { data: courseData } = await supabase
          .from("gw_courses")
          .select("id, title, course_code")
          .or(`course_code.ilike.%${courseQuery}%,title.ilike.%${courseQuery}%`)
          .limit(1)
          .single();
        course = courseData;
      }

      if (!course) {
        // Get all enrolled courses
        const { data: enrollments } = await supabase
          .from("gw_course_enrollments")
          .select(`
            course_id,
            gw_courses!inner(id, title, course_code)
          `)
          .eq("user_id", userId)
          .eq("enrollment_status", "active");

        if (!enrollments?.length) {
          return { success: false, message: "You are not enrolled in any courses." };
        }

        // If multiple courses, list them
        if (enrollments.length > 1) {
          const courseList = enrollments.map(e => e.gw_courses?.course_code).filter(Boolean).join(", ");
          return { 
            success: true, 
            message: `You are enrolled in: ${courseList}. Please specify which course you want to check. For example, "What's my grade in MUS-240?"` 
          };
        }

        course = enrollments[0].gw_courses;
      }

      // Build grade record (similar to get_student_record but for self)
      const record: any = {
        student_name: profile.full_name,
        course: course.course_code,
      };

      // 1. Get Journal Grades
      const { data: journals } = await supabase
        .from("mus240_journal_grades")
        .select("journal_number, grade, feedback")
        .eq("student_id", userId)
        .order("journal_number", { ascending: true });

      const journalTotal = (journals || []).reduce((sum, j) => sum + (j.grade || 0), 0);
      const journalMax = (journals || []).length * 20;
      
      record.journals = {
        total_earned: journalTotal,
        total_possible: journalMax,
        count_graded: (journals || []).filter(j => j.grade !== null).length,
        grades: format === "detailed" ? journals : undefined,
      };

      // 2. Get Midterm Score
      const { data: midterm } = await supabase
        .from("mus240_midterm_submissions")
        .select("grade, feedback")
        .eq("user_id", userId)
        .single();

      record.midterm = midterm?.grade 
        ? { grade: midterm.grade, max: 90 }
        : { submitted: false };

      // 3. Get Participation
      const { data: participation } = await supabase
        .from("mus240_participation_grades")
        .select("grade")
        .eq("student_id", userId)
        .single();

      record.participation = participation?.grade 
        ? { grade: participation.grade, max: 50 }
        : { not_graded: true };

      // 4. Get Attendance
      const { data: attendance } = await supabase
        .from("gw_attendance_records")
        .select("status")
        .eq("student_id", userId);

      const present = (attendance || []).filter(a => a.status === "present").length;
      const late = (attendance || []).filter(a => a.status === "late").length;
      const absent = (attendance || []).filter(a => a.status === "absent").length;
      const excused = (attendance || []).filter(a => a.status === "excused").length;
      const total = (attendance || []).length;

      record.attendance = {
        present, late, absent_unexcused: absent, excused, total_sessions: total,
        attendance_rate: total > 0 ? Math.round(((present + late + excused) / total) * 100) : 100,
      };

      // Calculate Overall Grade
      let totalEarned = journalTotal + (midterm?.grade || 0) + (participation?.grade || 0);
      let totalPossible = journalMax + 90 + 50;
      const attendanceDeduction = absent * 2;
      
      const rawPercentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 100;
      const finalPercentage = Math.max(0, Math.round(rawPercentage - attendanceDeduction));
      
      const getLetterGrade = (pct: number) => {
        if (pct >= 95) return "A";
        if (pct >= 90) return "A-";
        if (pct >= 87) return "B+";
        if (pct >= 83) return "B";
        if (pct >= 80) return "B-";
        if (pct >= 77) return "C+";
        if (pct >= 73) return "C";
        if (pct >= 70) return "C-";
        if (pct >= 65) return "D+";
        if (pct >= 60) return "D";
        return "F";
      };

      record.overall = {
        percentage: finalPercentage,
        letter_grade: getLetterGrade(finalPercentage),
        attendance_deduction: attendanceDeduction,
      };

      // Build message
      let message = `📊 **Your ${course.course_code} Grade: ${finalPercentage}% (${getLetterGrade(finalPercentage)})**\n`;
      
      if (format === "detailed") {
        message += `\n📚 **Journals:** ${journalTotal}/${journalMax} pts (${record.journals.count_graded} graded)`;
        if (journals?.length) {
          journals.forEach(j => {
            message += `\n   • LJ${j.journal_number}: ${j.grade}/20`;
          });
        }
        message += `\n📝 **Midterm:** ${midterm?.grade || 'Not submitted'}${midterm?.grade ? '/90' : ''}`;
        message += `\n💬 **Participation:** ${participation?.grade || 'Not graded'}${participation?.grade ? '/50' : ''}`;
        message += `\n📅 **Attendance:** ${present + late}/${total} present (${record.attendance.attendance_rate}%)`;
        if (absent > 0) {
          message += ` - ${absent} unexcused absence(s), -${attendanceDeduction} pts`;
        }
      } else {
        message += `\n• Journals: ${journalTotal}/${journalMax} pts`;
        message += `\n• Midterm: ${midterm?.grade || 'N/A'}${midterm?.grade ? '/90' : ''}`;
        message += `\n• Participation: ${participation?.grade || 'N/A'}${participation?.grade ? '/50' : ''}`;
        message += `\n• Attendance: ${record.attendance.attendance_rate}%`;
      }

      return {
        success: true,
        record: record,
        message: message,
      };
    }

    case "get_my_attendance": {
      const courseCode = args.course_code;

      // Get user profile
      const { data: profile } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        return { success: false, message: "Could not find your profile." };
      }

      // Get all attendance records
      const { data: attendance } = await supabase
        .from("gw_attendance_records")
        .select(`
          status, check_in_time, excuse_reason, excuse_status,
          gw_course_class_sessions!inner(
            session_date, start_time, title,
            gw_courses!inner(course_code, title)
          )
        `)
        .eq("student_id", userId)
        .order("check_in_time", { ascending: false });

      if (!attendance?.length) {
        return { success: true, message: "No attendance records found yet. Your attendance will be tracked once you check in to classes." };
      }

      // Group by course if needed
      const byCourse: Record<string, any[]> = {};
      attendance.forEach(a => {
        const code = a.gw_course_class_sessions?.gw_courses?.course_code || "Unknown";
        if (!byCourse[code]) byCourse[code] = [];
        byCourse[code].push(a);
      });

      // Filter by course if specified
      if (courseCode) {
        const normalized = courseCode.toLowerCase().replace(/-/g, " ");
        const filtered = Object.entries(byCourse).filter(([code]) => 
          code.toLowerCase().replace(/-/g, " ").includes(normalized)
        );
        if (filtered.length === 0) {
          return { success: false, message: `No attendance records found for "${courseCode}".` };
        }
      }

      let message = `📅 **Your Attendance Record**\n`;
      
      for (const [code, records] of Object.entries(byCourse)) {
        const present = records.filter(r => r.status === "present").length;
        const late = records.filter(r => r.status === "late").length;
        const absent = records.filter(r => r.status === "absent").length;
        const excused = records.filter(r => r.status === "excused").length;
        const total = records.length;
        const rate = Math.round(((present + late + excused) / total) * 100);

        message += `\n**${code}:** ${present + late + excused}/${total} (${rate}%)`;
        message += `\n  ✓ Present: ${present} | ⏰ Late: ${late} | 🏥 Excused: ${excused} | ❌ Absent: ${absent}`;
        
        if (absent > 0) {
          message += `\n  ⚠️ ${absent} unexcused absence(s) = -${absent * 2} grade points`;
        }
      }

      // List recent absences
      const recentAbsences = attendance
        .filter(a => a.status === "absent" || a.status === "excused")
        .slice(0, 5);

      if (recentAbsences.length > 0) {
        message += `\n\n**Recent Absences:**`;
        recentAbsences.forEach(a => {
          const date = a.gw_course_class_sessions?.session_date || "Unknown date";
          const course = a.gw_course_class_sessions?.gw_courses?.course_code || "";
          const status = a.status === "excused" ? "✓ Excused" : "❌ Unexcused";
          message += `\n  • ${date} (${course}): ${status}`;
          if (a.excuse_reason) message += ` - ${a.excuse_reason}`;
        });
      }

      return {
        success: true,
        attendance: byCourse,
        message: message,
      };
    }

    case "file_absence_excuse": {
      // Parse the absence date
      const parseDate = (dateStr: string): Date => {
        const now = new Date();
        const lower = dateStr.toLowerCase().trim();
        
        if (lower === "today") return now;
        if (lower === "yesterday") {
          const d = new Date(now);
          d.setDate(d.getDate() - 1);
          return d;
        }
        if (lower.includes("last")) {
          const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
          for (let i = 0; i < days.length; i++) {
            if (lower.includes(days[i])) {
              const d = new Date(now);
              const currentDay = d.getDay();
              const diff = currentDay - i;
              d.setDate(d.getDate() - (diff > 0 ? diff : diff + 7));
              return d;
            }
          }
        }
        return new Date(dateStr);
      };

      const absenceDate = parseDate(args.absence_date);
      const absenceDateStr = absenceDate.toISOString().split('T')[0];

      // Get user profile
      const { data: profile } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, email")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        return { success: false, message: "Could not find your profile." };
      }

      // Find the course
      const courseCode = args.course_code.toLowerCase().replace(/-/g, " ");
      let courseQuery = courseCode;
      if (courseCode.includes("glee club") || courseCode === "glee") courseQuery = "MUS 070";
      if (courseCode.includes("survey") || courseCode.includes("african american")) courseQuery = "MUS 240";

      const { data: course } = await supabase
        .from("gw_courses")
        .select("id, course_code, title")
        .or(`course_code.ilike.%${courseQuery}%,title.ilike.%${courseQuery}%`)
        .limit(1)
        .single();

      if (!course) {
        return { success: false, message: `Could not find course "${args.course_code}". Try "MUS-240" or "Glee Club".` };
      }

      // Find the class session for that date
      const { data: session } = await supabase
        .from("gw_course_class_sessions")
        .select("id, session_date, title")
        .eq("course_id", course.id)
        .eq("session_date", absenceDateStr)
        .limit(1)
        .single();

      // Check if attendance record exists
      let attendanceRecord = null;
      if (session) {
        const { data: existing } = await supabase
          .from("gw_attendance_records")
          .select("id, status, excuse_status")
          .eq("student_id", userId)
          .eq("session_id", session.id)
          .single();
        attendanceRecord = existing;
      }

      // Create or update excuse request
      const excuseData = {
        student_id: userId,
        course_id: course.id,
        session_id: session?.id || null,
        absence_date: absenceDateStr,
        excuse_reason: args.reason,
        documentation_type: args.documentation_type || "other",
        excuse_status: "pending",
        submitted_at: new Date().toISOString(),
      };

      // Try to insert into gw_excuse_requests table or update attendance record
      if (attendanceRecord) {
        // Update existing attendance record with excuse
        await supabase
          .from("gw_attendance_records")
          .update({
            excuse_reason: args.reason,
            excuse_status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", attendanceRecord.id);
      }

      // Always create an excuse request for admin review
      const { error: excuseError } = await supabase
        .from("gw_excuse_requests")
        .insert({
          student_id: userId,
          course_id: course.id,
          absence_date: absenceDateStr,
          reason: args.reason,
          documentation_type: args.documentation_type || "other",
          status: "pending",
          session_id: session?.id || null,
        });

      // If table doesn't exist, log it but continue
      if (excuseError) {
        console.log("Could not insert excuse request (table may not exist):", excuseError.message);
      }

      // Find the secretary or instructor to notify
      const { data: secretary } = await supabase
        .from("gw_profiles")
        .select("email, full_name")
        .eq("exec_board_role", "Secretary")
        .eq("is_exec_board", true)
        .limit(1)
        .single();

      // Send notification email
      if (secretary?.email) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-branded-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              to: secretary.email,
              subject: `Absence Excuse Request - ${profile.full_name}`,
              html: `
                <div style="font-family: Georgia, serif; padding: 20px;">
                  <h2>Absence Excuse Request</h2>
                  <p><strong>Student:</strong> ${profile.full_name} (${profile.email})</p>
                  <p><strong>Course:</strong> ${course.course_code} - ${course.title}</p>
                  <p><strong>Date:</strong> ${absenceDateStr}</p>
                  <p><strong>Reason:</strong> ${args.reason}</p>
                  <p><strong>Category:</strong> ${args.documentation_type || 'Other'}</p>
                  <p style="margin-top: 20px; color: #666;">Please review this request in the GleeWorld admin dashboard.</p>
                </div>
              `,
              replyTo: profile.email,
            }),
          });
        } catch (e) {
          console.error("Failed to send excuse notification:", e);
        }
      }

      const dateFormatted = absenceDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

      return {
        success: true,
        action: "excuse_filed",
        message: `✅ **Excuse Request Submitted**\n\n**Course:** ${course.course_code}\n**Date:** ${dateFormatted}\n**Reason:** ${args.reason}\n\nYour request has been sent to the ${secretary?.full_name || 'Attendance Chair'} for review. You'll be notified once it's approved or if additional documentation is needed.`,
      };
    }

    case "get_my_assignments": {
      const filter = args.filter || "upcoming";
      const courseCode = args.course_code;

      // Get user's enrolled courses
      const { data: enrollments } = await supabase
        .from("gw_course_enrollments")
        .select(`
          course_id,
          gw_courses!inner(id, course_code, title)
        `)
        .eq("user_id", userId)
        .eq("enrollment_status", "active");

      if (!enrollments?.length) {
        return { success: false, message: "You are not enrolled in any courses." };
      }

      // Filter by course if specified
      let courseIds = enrollments.map(e => e.course_id);
      let courseName = "all your courses";
      
      if (courseCode) {
        const normalized = courseCode.toLowerCase().replace(/-/g, " ");
        let matchedCourse = null;
        
        // Handle aliases
        if (normalized.includes("survey") || normalized.includes("african american")) {
          matchedCourse = enrollments.find(e => e.gw_courses?.course_code?.includes("240"));
        } else if (normalized.includes("glee club") || normalized === "glee") {
          matchedCourse = enrollments.find(e => e.gw_courses?.course_code?.includes("070"));
        } else if (normalized.includes("glee") && normalized.includes("academy")) {
          // Keep all courses
        } else {
          matchedCourse = enrollments.find(e => 
            e.gw_courses?.course_code?.toLowerCase().replace(/-/g, " ").includes(normalized) ||
            e.gw_courses?.title?.toLowerCase().includes(normalized)
          );
        }

        if (matchedCourse) {
          courseIds = [matchedCourse.course_id];
          courseName = matchedCourse.gw_courses?.course_code || courseCode;
        }
      }

      // Get assignments
      let assignmentQuery = supabase
        .from("gw_course_assignments")
        .select(`
          id, title, description, due_date, points, assignment_type,
          gw_courses!inner(course_code)
        `)
        .in("course_id", courseIds)
        .eq("is_published", true)
        .order("due_date", { ascending: true });

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      if (filter === "upcoming") {
        assignmentQuery = assignmentQuery.gte("due_date", todayStr);
      } else if (filter === "overdue") {
        assignmentQuery = assignmentQuery.lt("due_date", todayStr);
      }

      const { data: assignments } = await assignmentQuery;

      if (!assignments?.length) {
        if (filter === "upcoming") {
          return { success: true, message: `🎉 No upcoming assignments in ${courseName}! You're all caught up.` };
        }
        return { success: true, message: `No ${filter} assignments found in ${courseName}.` };
      }

      // Get submission status for each assignment
      const { data: submissions } = await supabase
        .from("assignment_submissions")
        .select("assignment_id, status, grade")
        .eq("student_id", userId)
        .in("assignment_id", assignments.map(a => a.id));

      const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]) || []);

      // Also check journal grades
      const { data: journalGrades } = await supabase
        .from("mus240_journal_grades")
        .select("assignment_id, grade")
        .eq("student_id", userId);

      const journalMap = new Map(journalGrades?.map(j => [j.assignment_id, j]) || []);

      // Build assignment list with status
      const assignmentList = assignments.map(a => {
        const submission = submissionMap.get(a.id);
        const journal = journalMap.get(a.id);
        const isSubmitted = !!submission || !!journal;
        const grade = submission?.grade || journal?.grade;
        const dueDate = new Date(a.due_date);
        const isOverdue = dueDate < now && !isSubmitted;

        return {
          id: a.id,
          title: a.title,
          course: a.gw_courses?.course_code,
          due_date: a.due_date,
          points: a.points,
          is_submitted: isSubmitted,
          grade: grade,
          is_overdue: isOverdue,
        };
      });

      // Apply filter for submitted/not_submitted
      let filtered = assignmentList;
      if (filter === "submitted") {
        filtered = assignmentList.filter(a => a.is_submitted);
      } else if (filter === "not_submitted") {
        filtered = assignmentList.filter(a => !a.is_submitted);
      }

      // Build message
      let message = `📋 **Assignments for ${courseName}**\n`;
      
      const upToDate = filtered.filter(a => a.is_submitted).length === filtered.length;
      if (upToDate && filter !== "overdue") {
        message += `\n✅ You're up-to-date on all assignments!\n`;
      }

      const overdue = filtered.filter(a => a.is_overdue);
      if (overdue.length > 0) {
        message += `\n⚠️ **Overdue (${overdue.length}):**`;
        overdue.forEach(a => {
          message += `\n  • ${a.title} (${a.course}) - Due ${a.due_date}`;
        });
      }

      const upcoming = filtered.filter(a => !a.is_overdue && !a.is_submitted).slice(0, 5);
      if (upcoming.length > 0) {
        message += `\n\n📅 **Due Soon:**`;
        upcoming.forEach(a => {
          const dueDate = new Date(a.due_date);
          const formatted = dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          message += `\n  • ${a.title} (${a.course}) - Due ${formatted}`;
        });
      }

      const submitted = filtered.filter(a => a.is_submitted).slice(0, 3);
      if (submitted.length > 0 && filter !== "upcoming") {
        message += `\n\n✓ **Recently Submitted:**`;
        submitted.forEach(a => {
          message += `\n  • ${a.title}${a.grade ? ` - ${a.grade} pts` : ''}`;
        });
      }

      return {
        success: true,
        assignments: filtered,
        total: filtered.length,
        submitted_count: filtered.filter(a => a.is_submitted).length,
        overdue_count: overdue.length,
        message: message,
      };
    }

    case "get_next_rehearsal": {
      const courseCode = args.course_code || "MUS 070"; // Default to Glee Club

      // Find course
      const { data: course } = await supabase
        .from("gw_courses")
        .select("id, course_code, title, location")
        .ilike("course_code", `%${courseCode.replace(/-/g, " ")}%`)
        .limit(1)
        .single();

      if (!course) {
        return { success: false, message: `Could not find course "${courseCode}".` };
      }

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 8);

      // Get next session
      const { data: nextSession } = await supabase
        .from("gw_course_class_sessions")
        .select("id, session_date, start_time, end_time, title, location")
        .eq("course_id", course.id)
        .or(`session_date.gt.${todayStr},and(session_date.eq.${todayStr},start_time.gt.${currentTime})`)
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(1)
        .single();

      if (!nextSession) {
        // Check if there's a regular schedule in course info
        return { 
          success: true, 
          message: `📍 **${course.course_code} - ${course.title}**\n\nNo upcoming sessions found in the calendar. Regular rehearsals are typically MWF 5:00-6:15 PM.\n\nLocation: ${course.location || 'Sisters Chapel / Glee Club Room'}`,
        };
      }

      const sessionDate = new Date(nextSession.session_date);
      const dateFormatted = sessionDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });

      // Format time
      const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
      };

      const startTime = formatTime(nextSession.start_time);
      const endTime = nextSession.end_time ? formatTime(nextSession.end_time) : '';

      return {
        success: true,
        session: nextSession,
        course: course,
        message: `🎵 **Next ${course.course_code} Rehearsal**\n\n📅 **${dateFormatted}**\n⏰ **${startTime}${endTime ? ` - ${endTime}` : ''}**\n📍 **${nextSession.location || course.location || 'Sisters Chapel'}**${nextSession.title ? `\n📝 ${nextSession.title}` : ''}`,
      };
    }

    case "send_message_to_instructor": {
      const recipientRole = (args.recipient_role || "").toLowerCase().trim();
      const messageType = args.message_type || "email";
      const subject = args.subject || `Message from GleeWorld Student`;
      const messageContent = args.message;

      // Get sender profile
      const { data: sender } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, email, phone")
        .eq("user_id", userId)
        .single();

      if (!sender) {
        return { success: false, message: "Could not find your profile." };
      }

      // Find recipient based on role
      let recipientQuery = supabase.from("gw_profiles").select("user_id, full_name, email, phone");

      if (recipientRole.includes("dr.") || recipientRole.includes("doc") || recipientRole.includes("johnson") || recipientRole.includes("instructor") || recipientRole.includes("professor")) {
        // Find Dr. Johnson or course instructor
        recipientQuery = recipientQuery.or("full_name.ilike.%Johnson%,is_super_admin.eq.true").limit(1);
      } else if (recipientRole.includes("president") && !recipientRole.includes("vice")) {
        recipientQuery = recipientQuery.eq("exec_board_role", "President").eq("is_exec_board", true);
      } else if (recipientRole.includes("vice")) {
        recipientQuery = recipientQuery.eq("exec_board_role", "Vice President").eq("is_exec_board", true);
      } else if (recipientRole.includes("secretary")) {
        recipientQuery = recipientQuery.eq("exec_board_role", "Secretary").eq("is_exec_board", true);
      } else if (recipientRole.includes("treasurer")) {
        recipientQuery = recipientQuery.eq("exec_board_role", "Treasurer").eq("is_exec_board", true);
      } else if (recipientRole.includes("chaplain")) {
        recipientQuery = recipientQuery.eq("exec_board_role", "Chaplain").eq("is_exec_board", true);
      } else {
        // Try fuzzy name match
        recipientQuery = recipientQuery.ilike("full_name", `%${recipientRole}%`);
      }

      const { data: recipients } = await recipientQuery.limit(1);

      if (!recipients?.length) {
        return { success: false, message: `Could not find "${args.recipient_role}". Try "Dr. Johnson", "President", "Secretary", etc.` };
      }

      const recipient = recipients[0];

      if (messageType === "sms") {
        // Send SMS via Twilio
        if (!recipient.phone) {
          return { success: false, message: `${recipient.full_name} doesn't have a phone number on file. Try sending an email instead.` };
        }

        try {
          const smsResponse = await fetch(`${SUPABASE_URL}/functions/v1/gw-send-sms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              to: recipient.phone,
              message: `GleeWorld: Message from ${sender.full_name}:\n\n${messageContent}\n\nReply to: ${sender.email}`,
            }),
          });

          const smsResult = await smsResponse.json();

          if (smsResult.success) {
            return {
              success: true,
              action: "sms_sent",
              message: `📱 **Text message sent to ${recipient.full_name}!**\n\nYour message has been delivered. They can reply via SMS or contact you at ${sender.email}.`,
            };
          } else {
            throw new Error(smsResult.error || "SMS failed");
          }
        } catch (e: any) {
          console.error("SMS error:", e);
          return { success: false, message: `Failed to send SMS: ${e.message}. Try sending an email instead.` };
        }
      } else {
        // Send email
        try {
          const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-branded-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              to: recipient.email,
              subject: subject,
              html: `
                <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h2 style="color: #d4af37; margin: 0;">Message from ${sender.full_name}</h2>
                  </div>
                  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0;">
                    <div style="line-height: 1.8; color: #333; white-space: pre-wrap;">${messageContent}</div>
                  </div>
                  <div style="background: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
                    <p style="color: #666; font-size: 12px; margin: 0;">
                      Sent via GleeWorld Assistant<br>
                      Reply to: <a href="mailto:${sender.email}">${sender.email}</a>
                    </p>
                  </div>
                </div>
              `,
              replyTo: sender.email,
              senderName: sender.full_name,
            }),
          });

          const emailResult = await emailResponse.json();

          if (emailResponse.ok) {
            return {
              success: true,
              action: "email_sent",
              message: `✉️ **Email sent to ${recipient.full_name}!**\n\n**Subject:** ${subject}\n\nThey will receive your message at ${recipient.email} and can reply to ${sender.email}.`,
            };
          } else {
            throw new Error(emailResult.error || "Email failed");
          }
        } catch (e: any) {
          console.error("Email error:", e);
          return { success: false, message: `Failed to send email: ${e.message}` };
        }
      }
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
      const eventTypeFilter = args.event_type?.toLowerCase();
      const searchTerm = args.search_term?.toLowerCase();
      
      // Concert-related keywords to match regardless of event_type
      const concertKeywords = ['concert', 'christmas carol', 'annual', 'founder', 'commencement', 'performance', 'carol'];
      const isSearchingForConcerts = eventTypeFilter === 'concert' || 
        concertKeywords.some(kw => searchTerm?.includes(kw));
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);
      const endDateStr = endDate.toISOString().split('T')[0];

      // Build proper date range query
      const { data: events, error } = await supabase
        .from("events")
        .select("id, title, event_name, description, start_date, event_date_start, end_date, location, event_type")
        .gte("start_date", today)
        .lte("start_date", endDateStr)
        .order("start_date", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching events:", error);
        return { events: [], message: "Could not fetch events" };
      }

      let filteredEvents = events || [];

      // Smart concert recognition - match by keywords in title regardless of event_type
      if (isSearchingForConcerts) {
        filteredEvents = filteredEvents.filter(e => {
          const title = (e.title || e.event_name || '').toLowerCase();
          const eventType = (e.event_type || '').toLowerCase();
          
          // Match if event_type is concert/performance OR if title contains concert keywords
          return eventType === 'concert' || 
                 eventType === 'performance' ||
                 concertKeywords.some(kw => title.includes(kw));
        });
      }

      // Filter by search term in memory if specified
      if (searchTerm) {
        filteredEvents = filteredEvents.filter(e => 
          (e.title?.toLowerCase() || '').includes(searchTerm) || 
          (e.event_name?.toLowerCase() || '').includes(searchTerm) ||
          (e.description?.toLowerCase() || '').includes(searchTerm)
        );
      }

      // Also filter by event type in memory for non-concert searches
      if (eventTypeFilter && !isSearchingForConcerts) {
        filteredEvents = filteredEvents.filter(e => 
          (e.event_type?.toLowerCase() || '').includes(eventTypeFilter) ||
          (e.title?.toLowerCase() || '').includes(eventTypeFilter)
        );
      }

      const formattedEvents = filteredEvents.map(e => ({
        id: e.id,
        title: e.title || e.event_name,
        description: e.description,
        date: e.start_date || e.event_date_start,
        end_date: e.end_date,
        location: e.location,
        type: e.event_type
      }));

      return {
        events: formattedEvents,
        count: formattedEvents.length,
        message: formattedEvents.length 
          ? `Found ${formattedEvents.length} upcoming event(s)${eventTypeFilter ? ` (type: ${eventTypeFilter})` : ''} in the next ${daysAhead} days.`
          : `No ${eventTypeFilter || ''} events scheduled in the next ${daysAhead} days.`
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

    // ==========================================
    // CREATE CALENDAR EVENT TOOL
    // ==========================================
    case "create_calendar_event": {
      // Verify admin/exec permissions
      const { data: profile } = await supabase
        .from("gw_profiles")
        .select("is_admin, is_super_admin, is_exec_board, exec_board_role, full_name")
        .eq("user_id", userId)
        .single();

      if (!profile?.is_admin && !profile?.is_super_admin && !profile?.is_exec_board) {
        return { success: false, message: "Access denied. Only admins or exec board members can create calendar events." };
      }

      // Parse the start date from natural language or ISO format
      const parseDateTime = (dateStr: string): Date => {
        const now = new Date();
        const lowerStr = dateStr.toLowerCase().trim();
        
        // Handle relative dates
        if (lowerStr.includes('tomorrow')) {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const timeMatch = lowerStr.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const ampm = timeMatch[3]?.toLowerCase();
            if (ampm === 'pm' && hours < 12) hours += 12;
            if (ampm === 'am' && hours === 12) hours = 0;
            tomorrow.setHours(hours, minutes, 0, 0);
          } else {
            tomorrow.setHours(17, 0, 0, 0); // Default 5pm
          }
          return tomorrow;
        }
        
        if (lowerStr.includes('next')) {
          const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          for (let i = 0; i < daysOfWeek.length; i++) {
            if (lowerStr.includes(daysOfWeek[i])) {
              const target = new Date(now);
              const currentDay = target.getDay();
              let daysUntil = i - currentDay;
              if (daysUntil <= 0) daysUntil += 7;
              target.setDate(target.getDate() + daysUntil);
              
              const timeMatch = lowerStr.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
              if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const ampm = timeMatch[3]?.toLowerCase();
                if (ampm === 'pm' && hours < 12) hours += 12;
                if (ampm === 'am' && hours === 12) hours = 0;
                target.setHours(hours, minutes, 0, 0);
              } else {
                target.setHours(17, 0, 0, 0);
              }
              return target;
            }
          }
        }
        
        // Try to parse as ISO date or common formats
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
        
        // Default to now + 1 day if parsing fails
        const fallback = new Date(now);
        fallback.setDate(fallback.getDate() + 1);
        fallback.setHours(17, 0, 0, 0);
        return fallback;
      };

      const startDate = parseDateTime(args.start_date);
      let endDate = args.end_date ? parseDateTime(args.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

      // Find the calendar to use
      let calendarId: string | null = null;
      const calendarName = args.calendar_name?.toLowerCase() || 'glee club';
      
      const { data: calendars } = await supabase
        .from("gw_calendars")
        .select("id, name")
        .eq("is_visible", true);
      
      if (calendars && calendars.length > 0) {
        // Try to find matching calendar
        const match = calendars.find(c => 
          c.name.toLowerCase().includes(calendarName) ||
          calendarName.includes(c.name.toLowerCase())
        );
        if (match) {
          calendarId = match.id;
        } else {
          // Default to first calendar or Glee Club
          const gleeCalendar = calendars.find(c => c.name.toLowerCase().includes('glee'));
          calendarId = gleeCalendar?.id || calendars[0].id;
        }
      }

      if (!calendarId) {
        return { success: false, message: "No calendars available. Please create a calendar first." };
      }

      // Generate AI image if requested
      let imageUrl: string | null = null;
      if (args.generate_image) {
        try {
          const imagePrompt = args.image_prompt || 
            `Create a professional event poster image for a ${args.event_type || 'music'} event titled "${args.title}". 
             ${args.description ? `Event description: ${args.description}. ` : ''}
             Style: Elegant, modern design suitable for the Spelman College Glee Club. 
             Color palette: Deep navy blue, gold accents, warm cream tones.
             Include subtle musical elements like notes or choir silhouettes.
             The image should be visually striking and suitable for social media.`;

          console.log("Generating event image with prompt:", imagePrompt.substring(0, 100) + "...");

          const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: imagePrompt }],
              modalities: ["image", "text"],
            }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            
            if (generatedImage) {
              // The image is base64 - we could upload it to storage, but for now we'll store the data URL
              // In production, you'd want to upload this to Supabase storage
              imageUrl = generatedImage;
              console.log("Image generated successfully");
            }
          } else {
            console.error("Image generation failed:", await imageResponse.text());
          }
        } catch (imageError) {
          console.error("Error generating event image:", imageError);
          // Continue without image
        }
      }

      // Create the event
      const eventData: any = {
        title: args.title,
        description: args.description || null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location: args.location || null,
        venue_name: args.location || null,
        event_type: args.event_type || 'other',
        is_public: args.is_public ?? false,
        is_private: !(args.is_public ?? false),
        attendance_required: args.attendance_required ?? false,
        max_attendees: args.max_attendees || null,
        calendar_id: calendarId,
        created_by: userId,
        status: 'scheduled',
        image_url: imageUrl,
        is_recurring: args.is_recurring ?? false,
        recurrence_type: args.is_recurring ? (args.recurrence_type || 'weekly') : null,
        recurrence_interval: args.is_recurring ? (args.recurrence_interval || 1) : null,
        recurrence_days_of_week: args.is_recurring ? args.recurrence_days_of_week : null,
        recurrence_end_date: args.is_recurring && args.recurrence_end_date ? parseDateTime(args.recurrence_end_date).toISOString() : null,
      };

      const { data: newEvent, error: createError } = await supabase
        .from("gw_events")
        .insert(eventData)
        .select("id, title, start_date, end_date, is_public, attendance_required, is_recurring")
        .single();

      if (createError) {
        console.error("Error creating event:", createError);
        return { success: false, message: `Failed to create event: ${createError.message}` };
      }

      // If recurring, create additional occurrences
      if (args.is_recurring && newEvent) {
        try {
          await supabase.rpc("create_recurring_gw_events", {
            p_event_id: newEvent.id,
          });
        } catch (recurError) {
          console.error("Error creating recurring events:", recurError);
          // Continue - the main event was created
        }
      }

      // Format response
      const dateOptions: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      };
      const formattedDate = startDate.toLocaleDateString('en-US', dateOptions);

      return {
        success: true,
        action: "event_created",
        event_id: newEvent.id,
        event_title: args.title,
        event_date: formattedDate,
        is_public: args.is_public ?? false,
        is_recurring: args.is_recurring ?? false,
        has_image: !!imageUrl,
        attendance_required: args.attendance_required ?? false,
        message: `Created event "${args.title}" for ${formattedDate}.${args.is_recurring ? ` Recurring ${args.recurrence_type || 'weekly'}.` : ''}${imageUrl ? ' AI image generated.' : ''}${args.attendance_required ? ' Attendance required.' : ''}`,
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

### STUDENT SELF-SERVICE (All Students):
- **get_my_grade**: Check your own grade in any enrolled course
  - Examples: "What is my grade?", "How am I doing in MUS-240?", "What's my grade in Survey of African American Music?"
  
- **get_my_attendance**: View your attendance record
  - Examples: "How many classes have I missed?", "What is my attendance?", "Show my attendance record"
  
- **file_absence_excuse**: Submit an excuse for a missed or upcoming absence
  - Examples: "I need to file an excuse for missing class yesterday", "I was sick on Monday and missed MUS-240", "I need to miss Glee Club tomorrow for a doctor's appointment"
  
- **get_my_assignments**: View your assignments, due dates, and submission status
  - Examples: "What assignment is due next?", "Am I up-to-date on my assignments?", "What assignments are due in Survey of African American Music?", "Do I have any assignments in Glee Academy?"
  
- **get_next_rehearsal**: Find out when and where the next rehearsal is
  - Examples: "When is the next rehearsal?", "Where does the Glee Club rehearse?", "When is the next MUS-240 class?"
  
- **send_message_to_instructor**: Send an email or text to instructors or exec board members
  - Examples: "Send Dr. Johnson an email about my grade", "Text the Glee Club president", "Email the secretary about my absence", "Message the treasurer about dues"

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

### ATTENDANCE MANAGEMENT (Admin/Exec Only):
- **take_attendance**: Start taking attendance for any course by displaying the QR code. Say "take attendance in MUS-240" or "take attendance for Glee Club"

### CALENDAR & EVENT MANAGEMENT (Admin/Exec Only):
- **create_calendar_event**: Create calendar events with full control over:
  - Title, description, date/time (natural language like "tomorrow at 5pm" works)
  - Location and venue
  - Public/private visibility
  - Recurring events (daily, weekly, monthly)
  - Attendance requirements
  - AI-generated event images (say "create an image" or "generate image")
  
  Examples:
  - "Create a rehearsal tomorrow at 5pm in Sisters Chapel"
  - "Schedule a concert on March 15 at 7:30pm, make it public, and create an image"
  - "Add a weekly exec board meeting every Monday at 4pm"
  - "Create a private tour planning meeting for next Tuesday"

### INSTRUCTOR GRADE & COMMUNICATION TOOLS (Admin/Instructor Only):
- **get_student_record**: Get comprehensive student grade information with transcript-like reports
  - Query by student name (fuzzy matching): "What grade is Kevin Johnson getting?" or "List Maya's transcripts"
  - Shows journals, midterm, participation, attendance, and overall grade
  - Formats: "summary" (quick), "detailed" (breakdown), "transcript" (full record)
  - Also returns class-wide grade reports if no student specified
  
  Examples:
  - "What grade is Kevin Johnson getting in MUS-240?"
  - "List Kevin's transcripts"
  - "Show me Maya Brown's grade breakdown"
  - "Who has an A in my class?"
  - "Which students are failing?"
  - "Get the class grades for MUS-240"

- **send_student_email**: Email students directly from the assistant
  - Individual: "Email Kevin Johnson about his missing journal"
  - Groups: "Email all students", "Email students below C", "Email students missing journals"
  - Optional grade summary included: "Email Maya her current grade"
  - Personalizes messages with {name}, {grade}, {percentage} placeholders
  
  Examples:
  - "Email Kevin Johnson that his journal 4 grade is ready"
  - "Send an email to all students about the upcoming midterm"
  - "Tell Maya Brown her grade is ready and include her grade summary"
  - "Email students below C that office hours are available"
  - "Send a reminder to students who haven't submitted journals"

### ENROLLMENT MANAGEMENT (Admin/Exec Only):
- **check_schedule_submissions**: Get list of students who have/haven't submitted class schedules, with conflict detection
- **get_enrollment_stats**: Get enrollment statistics and voice part breakdown for any course
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
- When a student asks about THEIR OWN grade/attendance/assignments, use the student self-service tools (get_my_grade, get_my_attendance, get_my_assignments)
- When an instructor asks about A STUDENT's grade, use get_student_record
- For admin/exec actions, verify permissions before executing
- If asked about something not in your tools, explain what the user can do manually
- Today's date is \${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Current semester: \${new Date().getMonth() >= 0 && new Date().getMonth() <= 4 ? 'Spring' : 'Fall'} \${new Date().getFullYear()}
- Keep responses concise but helpful
- When creating events with images, the AI will generate a professional event poster automatically
- When sending student emails, be professional but warm, and always sign with the instructor's name
- When reporting grades, use clear formatting
- For absence excuses, be empathetic and confirm the request was submitted
- When students ask about rehearsals, always include the location`;

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
