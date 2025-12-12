import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      description: "Open a specific score/PDF from the music library. Returns the URL to open.",
      parameters: {
        type: "object",
        properties: {
          score_id: {
            type: "string",
            description: "The ID of the score to open",
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
      description: "Navigate to a specific page in GleeWorld",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: ["dashboard", "music-library", "calendar", "glee-academy", "email-composer", "messages", "glee-lounge"],
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
];

// Execute tool calls
async function executeTool(toolName: string, args: any, userId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split('T')[0];

  switch (toolName) {
    case "get_assignments_due_today": {
      // Get assignments due today
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
        .select("id, title, description, event_date, start_time, end_time, location, event_type")
        .gte("event_date", today)
        .lte("event_date", endDate.toISOString().split('T')[0])
        .order("event_date", { ascending: true })
        .limit(10);

      if (error) {
        console.error("Error fetching events:", error);
        return { events: [], message: "Could not fetch events" };
      }

      return {
        events: events || [],
        count: events?.length || 0,
        message: events?.length 
          ? `Found ${events.length} upcoming event(s) in the next ${daysAhead} days.`
          : `No events scheduled in the next ${daysAhead} days.`
      };
    }

    case "search_music_library": {
      const query = args.query?.toLowerCase() || "";
      
      const { data: scores, error } = await supabase
        .from("gw_sheet_music")
        .select("id, title, composer, voicing, pdf_url")
        .or(`title.ilike.%${query}%,composer.ilike.%${query}%`)
        .limit(5);

      if (error) {
        console.error("Error searching music:", error);
        return { scores: [], message: "Could not search music library" };
      }

      return {
        scores: scores || [],
        count: scores?.length || 0,
        message: scores?.length
          ? `Found ${scores.length} score(s) matching "${args.query}".`
          : `No scores found matching "${args.query}".`
      };
    }

    case "open_score": {
      const { data: score, error } = await supabase
        .from("gw_sheet_music")
        .select("id, title, pdf_url")
        .eq("id", args.score_id)
        .single();

      if (error || !score) {
        return { success: false, message: "Score not found" };
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
      };

      return {
        action: "navigate",
        route: pageRoutes[args.page] || "/dashboard",
        message: `Navigating to ${args.page.replace("-", " ")}.`
      };
    }

    case "get_class_schedule": {
      // Get course information and important dates
      const { data: courses, error } = await supabase
        .from("gw_courses")
        .select("id, title, description, start_date, end_date")
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching courses:", error);
        return { courses: [], message: "Could not fetch course schedule" };
      }

      // Find the latest end date as "last day of class"
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
      // Search for the recipient
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

    const systemPrompt = `You are Glee Assistant, a helpful AI assistant for GleeWorld - the digital platform of the Spelman College Glee Club. You help members with:

- Finding and opening sheet music/scores
- Checking assignment due dates
- Getting calendar and event information
- Navigating the platform
- Sending messages to other members
- Answering questions about class schedules

Be friendly, concise, and helpful. When users ask to do something, use the available tools to help them. If you need to perform an action (like opening a score or navigating), always use the appropriate tool.

Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

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
