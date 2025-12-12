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

// Tool definitions for the assistant
const tools = [
  {
    type: "function",
    function: {
      name: "get_assignments_due_today",
      description: "Get all assignments due today for the current user from Glee Academy courses",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
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
          days_ahead: {
            type: "number",
            description: "Number of days ahead to look (default 7)",
          },
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
          query: {
            type: "string",
            description: "Search query for music title or composer",
          },
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
          score_id: {
            type: "string",
            description: "The UUID of the score from search results (e.g., '9a713722-108b-41ae-90cc-08a7ec6b77df'), OR the exact title if UUID is not available",
          },
        },
        required: ["score_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description: "Navigate to a specific page in GleeWorld. Use this when users want to go to a specific feature or section.",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: [
              "dashboard", "music-library", "calendar", "glee-academy", 
              "email-composer", "messages", "glee-lounge", "handbook",
              "first-year-resources", "exec-board-workshop", "wardrobe",
              "alumnae", "profile", "admin-dashboard"
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
      name: "get_class_schedule",
      description: "Get the class/course schedule and important dates like last day of class",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
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
          recipient_name: {
            type: "string",
            description: "Name of the person to message",
          },
          message_type: {
            type: "string",
            enum: ["sms", "email"],
            description: "Type of message to send",
          },
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
          name: {
            type: "string",
            description: "Name of the member to search for",
          },
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
          limit: {
            type: "number",
            description: "Number of announcements to fetch (default 5)",
          },
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
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
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
          topic: {
            type: "string",
            description: "Topic to search for in the handbook (e.g., 'attendance policy', 'exec board positions', 'dress code')",
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "control_radio",
      description: "Control the Glee World Radio - turn it on (play), off (pause/stop), or toggle. Use this when users want to play music, listen to the radio, or stop the radio.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            enum: ["play", "pause", "toggle"],
            description: "The radio command: 'play' to start, 'pause' to stop, 'toggle' to switch",
          },
        },
        required: ["command"],
      },
    },
  },
];

// Execute tool calls
async function executeTool(toolName: string, args: any, userId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split('T')[0];

  switch (toolName) {
    case "get_assignments_due_today": {
      const { data: assignments, error } = await supabase
        .from("gw_assignments")
        .select("id, title, description, due_date, course_id")
        .eq("due_date", today)
        .eq("is_active", true);
      
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

      // Format events for response
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
      // Normalize query by removing common punctuation so it matches titles
      let query = rawQuery.replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
      console.log("Searching music library for:", query);

      // Handle "title by composer" pattern (e.g., "Ave Maria by Nathaniel Dett")
      let titleQuery = query;
      let composerQuery = query;
      
      const byMatch = query.match(/^(.+?)\s+by\s+(.+)$/i);
      if (byMatch) {
        titleQuery = byMatch[1].trim();
        composerQuery = byMatch[2].trim();
        console.log("Parsed as title:", titleQuery, "composer:", composerQuery);
      }
      
      // Search by title
      const { data: titleMatches, error: titleError } = await supabase
        .from("gw_sheet_music")
        .select("id, title, composer, voicing, pdf_url")
        .ilike("title", `%${titleQuery}%`)
        .limit(10);

      // Search by composer
      const { data: composerMatches, error: composerError } = await supabase
        .from("gw_sheet_music")
        .select("id, title, composer, voicing, pdf_url")
        .ilike("composer", `%${composerQuery}%`)
        .limit(10);

      if (titleError && composerError) {
        console.error("Error searching music:", titleError || composerError);
        return { scores: [], message: "Could not search music library" };
      }

      // Combine and dedupe results
      let allScores = [...(titleMatches || []), ...(composerMatches || [])];
      
      // If we parsed "title by composer", prioritize scores matching BOTH
      if (byMatch) {
        const exactMatches = allScores.filter(s => 
          s.title?.toLowerCase().includes(titleQuery.toLowerCase()) &&
          s.composer?.toLowerCase().includes(composerQuery.toLowerCase())
        );
        if (exactMatches.length > 0) {
          // Put exact matches first
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
          ? `Found ${formattedScores.length} score(s) matching "${args.query}". Use the 'uuid' field when calling open_score.`
          : `No scores found matching "${args.query}".`
      };
    }

    case "open_score": {
      // First try to find by UUID
      let { data: score, error } = await supabase
        .from("gw_sheet_music")
        .select("id, title, pdf_url")
        .eq("id", args.score_id)
        .maybeSingle();

      // If not found by UUID, try searching by title
      if (!score) {
        console.log("Score not found by UUID, searching by title:", args.score_id);
        const { data: titleMatch, error: titleError } = await supabase
          .from("gw_sheet_music")
          .select("id, title, pdf_url")
          .ilike("title", `%${args.score_id}%`)
          .not("pdf_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (titleError) {
          console.error("Error searching score by title:", titleError);
        }
        
        if (titleMatch) {
          score = titleMatch;
        }
      }

      if (!score) {
        return { 
          success: false, 
          message: `Score "${args.score_id}" not found. Please search the music library first to get the correct UUID.` 
        };
      }

      if (!score.pdf_url) {
        return {
          success: false,
          message: `Found "${score.title}" but it doesn't have a PDF file attached.`
        };
      }

      return {
        success: true,
        action: "open_score",
        score_id: score.id,
        title: score.title,
        url: score.pdf_url,
        message: `Opening "${score.title}". Click to view the score.`
      };
    }

    case "navigate_to_page": {
      const pageRoutes: Record<string, string> = {
        "dashboard": "/dashboard",
        "music-library": "/music-library",
        "calendar": "/calendar",
        "glee-academy": "/glee-academy",
        "email-composer": "/compose",
        "messages": "/messages",
        "glee-lounge": "/glee-lounge",
        "handbook": "/handbook",
        "first-year-resources": "/first-year-resources",
        "exec-board-workshop": "/exec-board-workshop",
        "wardrobe": "/wardrobe",
        "alumnae": "/alumnae",
        "profile": "/profile",
        "admin-dashboard": "/admin-dashboard",
      };

      return {
        action: "navigate",
        route: pageRoutes[args.page] || "/dashboard",
        message: `Navigating to ${args.page.replace(/-/g, " ")}.`
      };
    }

    case "get_class_schedule": {
      const { data: courses, error } = await supabase
        .from("gw_courses")
        .select("id, title, description, start_date, end_date")
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching courses:", error);
        return { courses: [], message: "Could not fetch course schedule" };
      }

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
      const { data: profiles, error } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, email, phone")
        .ilike("full_name", `%${args.recipient_name}%`)
        .limit(3);

      if (error || !profiles?.length) {
        return {
          success: false,
          message: `Could not find a member named "${args.recipient_name}".`
        };
      }

      return {
        action: args.message_type === "sms" ? "prepare_sms" : "prepare_email",
        recipients: profiles,
        message: `Found ${profiles.length} member(s) matching "${args.recipient_name}". Ready to compose ${args.message_type}.`
      };
    }

    case "search_members": {
      const { data: profiles, error } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, email, phone, role, voice_part, is_exec_board, exec_board_role")
        .ilike("full_name", `%${args.name}%`)
        .limit(5);

      if (error) {
        console.error("Error searching members:", error);
        return { members: [], message: "Could not search members" };
      }

      return {
        members: profiles || [],
        count: profiles?.length || 0,
        message: profiles?.length
          ? `Found ${profiles.length} member(s) matching "${args.name}".`
          : `No members found matching "${args.name}".`
      };
    }

    case "get_announcements": {
      const limit = args.limit || 5;
      
      const { data: announcements, error } = await supabase
        .from("gw_announcements")
        .select("id, title, content, created_at, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching announcements:", error);
        return { announcements: [], message: "Could not fetch announcements" };
      }

      return {
        announcements: announcements || [],
        count: announcements?.length || 0,
        message: announcements?.length
          ? `Here are the latest ${announcements.length} announcement(s).`
          : "No active announcements at this time."
      };
    }

    case "get_polls": {
      const { data: polls, error } = await supabase
        .from("gw_polls")
        .select("id, question, options, created_at, expires_at, group_id")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching polls:", error);
        return { polls: [], message: "Could not fetch polls" };
      }

      return {
        polls: polls || [],
        count: polls?.length || 0,
        message: polls?.length
          ? `Found ${polls.length} active poll(s) that need your vote.`
          : "No active polls at this time."
      };
    }

    case "get_handbook_info": {
      // Return handbook information based on topic
      const handbookInfo: Record<string, string> = {
        "attendance": "Attendance is mandatory for all rehearsals and performances. Members must notify the Attendance Chair in advance if unable to attend. Excessive absences may result in probation or removal from performances.",
        "attendance policy": "Attendance is mandatory for all rehearsals and performances. Members must notify the Attendance Chair in advance if unable to attend. Excessive absences may result in probation or removal from performances.",
        "dress code": "Performance attire includes the official Glee Club dress (stored in wardrobe), appropriate undergarments, nude hosiery, and closed-toe black heels (2-3 inches). Hair must be styled neatly away from face.",
        "exec board": "Executive Board positions include: President, Vice President, Secretary, Treasurer, Chaplain, Parliamentarian, Historian, Public Relations Chair, Social Chair, and various committee chairs. Elections are held each spring semester.",
        "exec board positions": "Executive Board positions include: President, Vice President, Secretary, Treasurer, Chaplain, Parliamentarian, Historian, Public Relations Chair, Social Chair, and various committee chairs. Elections are held each spring semester.",
        "rehearsal": "Rehearsals are held weekly during the academic year. Members should arrive 10 minutes early, bring their music and pencil, and be prepared to sing. Cell phones must be silenced.",
        "performances": "Members are expected to participate in all performances unless excused. This includes concerts, tours, and special events. Performance schedules are released at the beginning of each semester.",
        "tour": "The Glee Club tours domestically and internationally. Tour participation requires good academic standing and payment of all dues. Tour dates are announced at the start of each academic year.",
        "dues": "Membership dues cover music, uniforms, and operational costs. Payment plans are available. Contact the Treasurer for more information.",
        "auditions": "Auditions are held at the beginning of each fall semester. Prospective members must prepare a song of their choice and demonstrate sight-reading ability.",
      };

      const topic = args.topic.toLowerCase();
      let info = null;
      
      // Search for matching topic
      for (const [key, value] of Object.entries(handbookInfo)) {
        if (topic.includes(key) || key.includes(topic)) {
          info = value;
          break;
        }
      }

      return {
        topic: args.topic,
        info: info,
        message: info 
          ? `Here's information about ${args.topic}: ${info}`
          : `I don't have specific handbook information about "${args.topic}". You can view the full handbook at the Handbook page.`,
        action: info ? null : "navigate",
        route: info ? null : "/handbook"
      };
    }

    case "control_radio": {
      const command = args.command || "play";
      return {
        action: "control_radio",
        command: command,
        message: command === "play" 
          ? "Turning on Glee World Radio!" 
          : command === "pause" 
          ? "Stopping the radio." 
          : "Toggling the radio."
      };
    }

    default:
      return { message: "Unknown tool" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Glee Assistant, a helpful AI assistant for GleeWorld - the official digital platform of the Spelman College Glee Club, celebrating over 100 years of musical excellence. The Glee Club's motto is "To Amaze and Inspire."

## Your Knowledge of GleeWorld Features:

**Music & Performance:**
- Music Library: Search and access sheet music, view PDFs with the built-in viewer, listen along with audio companions
- Virtual Piano: Practice tool with 88 keys, metronome, and multiple instrument sounds
- Calendar: View upcoming rehearsals, concerts, performances, and events

**Academic (Glee Academy):**
- MUS-240 and other courses with assignments, tests, quizzes
- Class schedules and important academic dates
- Student dashboard for tracking progress

**Communication:**
- Messages: Group messaging with polls and announcements
- Glee Lounge: Social hub for members to connect, share photos/videos, go live
- Email/SMS Composer: Send branded communications to members

**Member Resources:**
- Handbook: Policies, procedures, exec board positions, attendance rules
- First-Year Resources: Guides for new members
- Executive Board Workshop: Training materials for leadership
- Wardrobe: Dress checkout and management
- Alumnae Portal: Connect with Glee Club graduates

**Administrative:**
- Profile management
- Exit interviews and surveys
- Concert ticket requests
- Member dossiers

## Your Capabilities:
- Control Glee World Radio (play/pause music)
- Search and open sheet music from the library
- Check assignment due dates and class schedules
- Get upcoming events and rehearsals
- Search for member contact information
- Navigate users to any page in GleeWorld
- Help compose messages to other members
- Get the latest announcements
- Check active polls
- Provide handbook information about policies and procedures

## Guidelines:
- Be warm, friendly, and helpful - embody the spirit of sisterhood
- Use tools to provide accurate, real-time information
- When users ask to do something, use the appropriate tool
- If you don't have a tool for something, explain what the user can do manually
- Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Keep responses concise but helpful`;

    // First call to get tool calls or response
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    // Check if there are tool calls
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

      // Second call with tool results
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            assistantMessage,
            ...toolResults,
          ],
        }),
      });

      if (!followUpResponse.ok) {
        throw new Error("Follow-up AI call failed");
      }

      const followUpData = await followUpResponse.json();
      const finalMessage = followUpData.choices[0].message.content;

      // Extract any actions from tool results
      const actions = toolResults
        .map(r => JSON.parse(r.content))
        .filter(r => r.action);

      return new Response(JSON.stringify({ 
        message: finalMessage,
        actions,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No tool calls, return direct response
    return new Response(JSON.stringify({ 
      message: assistantMessage.content,
      actions: [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Glee Assistant error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
