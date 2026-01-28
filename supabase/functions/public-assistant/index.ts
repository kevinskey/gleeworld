import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Static knowledge base for public information only
const PUBLIC_KNOWLEDGE_BASE = `
## Spelman College Glee Club - Public Information

### About Us
- Established 1925, celebrating 100+ years of musical excellence
- Director: Dr. Kevin P. Johnson
- Motto: "To Amaze and Inspire"
- Approximately 50 talented voices
- Rehearses MWF 5:00-6:30pm during the academic year
- One of the oldest and most prestigious collegiate choral ensembles in the nation

### Contact Information
- Email: gleeclub@spelman.edu
- Media/Press Inquiries: media@spelman.edu
- Phone: (404) 270-5200
- Address: 350 Spelman Lane SW, Atlanta, GA 30314

### Website & Social Media
- Spelman College Official Website: spelman.edu
- GleeWorld Platform: gleeworld.lovable.app
- Instagram: @spelmanglee
- Facebook: /SpelmanGlee
- X (Twitter): @spelmanglee
- YouTube: Spelman College Glee Club

### Booking Performances
- To request the Glee Club for your event, visit the "Book Us" page on our website
- We perform nationally and internationally at corporate events, galas, conferences, and special occasions
- Submit a booking request with your event details and our team will contact you about availability and pricing
- Booking requests should be submitted at least 6-8 weeks in advance

### Becoming a Fan
- Create a free fan account on GleeWorld to access exclusive content
- Fans receive updates about upcoming concerts and events
- Access to merchandise and special promotions
- No Spelman affiliation required to become a fan

### Alumni/Alumnae Access
- Former Glee Club members can login to the Alumnae Portal
- Connect with current members and fellow alumnae
- Share memories and stay updated on Glee Club activities
- If you're an alumna, use the same login page and select your alumna status

### Auditions
- Auditions are held at the start of each Fall and Spring semester
- Open to all Spelman College students
- Prepare 30-60 seconds of any song that showcases your voice
- Sight-reading assessment is included
- No prior choral experience required, but helpful
- Check the Events Calendar for audition dates

### Major Annual Events
- Christmas Carol Concert (December) - Joint concert with Morehouse College Glee Club, celebrating 100 years in 2025
- Spring Concert (April/May)
- Commencement Performances
- Founders Day Celebration
- National and International Tours

### Performance Repertoire
- Classical and contemporary choral works
- African American spirituals and gospel
- Traditional hymns and anthems
- Popular music arrangements
- World music and folk songs

### History
- Founded in 1925 as part of Spelman College's rich musical tradition
- Has performed at the White House, Carnegie Hall, and venues worldwide
- Represents the excellence and spirit of Spelman College women
- Sister organization to the Morehouse College Glee Club
`;

// Tool definitions for the public assistant
const tools = [
  {
    type: "function",
    function: {
      name: "get_public_events",
      description: "Get upcoming public events from the Glee Club calendar. Only returns events marked as public.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of events to return (default 10)"
          },
          event_type: {
            type: "string",
            description: "Filter by event type (e.g., 'concert', 'rehearsal', 'tour')"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_public_knowledge",
      description: "Search the public knowledge base for information about the Glee Club, contact info, booking, auditions, etc.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query or topic to find information about"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_navigation",
      description: "Suggest a page or action for the user to navigate to on the GleeWorld website",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: ["booking", "calendar", "auth", "alumnae", "shop", "auditioner", "about", "contact"],
            description: "The page to suggest navigating to"
          },
          reason: {
            type: "string",
            description: "Brief explanation of why this page is helpful"
          }
        },
        required: ["page", "reason"]
      }
    }
  }
];

// Execute tool calls
async function executeTool(supabase: any, toolName: string, args: any): Promise<string> {
  console.log(`Executing tool: ${toolName} with args:`, args);
  
  switch (toolName) {
    case "get_public_events": {
      const limit = args.limit || 10;
      const now = new Date().toISOString();
      
      let query = supabase
        .from('gw_events')
        .select('id, title, description, start_date, end_date, location, venue_name, event_type, is_public')
        .eq('is_public', true)
        .gte('start_date', now)
        .order('start_date', { ascending: true })
        .limit(limit);
      
      if (args.event_type) {
        query = query.ilike('event_type', `%${args.event_type}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching events:', error);
        return JSON.stringify({ error: 'Failed to fetch events' });
      }
      
      if (!data || data.length === 0) {
        return JSON.stringify({ 
          message: "No upcoming public events found at this time. Please check back later or visit our calendar page for updates.",
          events: [] 
        });
      }
      
      // Format dates for readability
      const formattedEvents = data.map((event: any) => ({
        ...event,
        formatted_date: new Date(event.start_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        formatted_time: new Date(event.start_date).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        })
      }));
      
      return JSON.stringify({ events: formattedEvents });
    }
    
    case "search_public_knowledge": {
      // Return the full knowledge base - the AI will extract relevant info
      return JSON.stringify({ 
        knowledge: PUBLIC_KNOWLEDGE_BASE,
        query: args.query 
      });
    }
    
    case "suggest_navigation": {
      const pageRoutes: Record<string, string> = {
        booking: "/booking-request",
        calendar: "/public-calendar",
        auth: "/auth",
        alumnae: "/alumnae",
        shop: "/shop",
        auditioner: "/auditioner",
        about: "/about",
        contact: "/contact"
      };
      
      return JSON.stringify({
        page: args.page,
        route: pageRoutes[args.page] || "/",
        reason: args.reason,
        action_button: {
          text: args.page === "booking" ? "Book Us" :
                args.page === "calendar" ? "View Calendar" :
                args.page === "auth" ? "Login / Sign Up" :
                args.page === "alumnae" ? "Alumnae Portal" :
                args.page === "shop" ? "Visit Shop" :
                args.page === "auditioner" ? "Audition Info" :
                args.page === "about" ? "Learn More" :
                "Contact Us",
          route: pageRoutes[args.page] || "/"
        }
      });
    }
    
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const systemPrompt = `You are the Spelman College Glee Club's friendly public assistant. Your role is to help visitors, potential fans, alumnae, and the general public with questions about the Glee Club.

IMPORTANT GUIDELINES:
1. You ONLY provide PUBLIC information - never discuss internal matters, grades, attendance, or private member data
2. Be warm, welcoming, and enthusiastic about the Glee Club's legacy
3. Use the provided tools to get accurate, up-to-date event information
4. When appropriate, suggest navigation to relevant pages on the website
5. If someone asks about becoming a member, direct them to audition information
6. For alumnae, help them access the Alumnae Portal through the login page
7. For booking inquiries, direct them to the booking request page
8. Keep responses concise but helpful - this is a chat interface
9. Use emojis sparingly to add warmth 🎵
10. Always refer to "The Glee Club" or "Spelman College Glee Club" - never just "Spelman Glee"
11. Celebrate the 100+ years of excellence and the motto "To Amaze and Inspire"

NEVER:
- Share internal policies or handbook content
- Discuss individual member information
- Reveal financial details beyond general booking info
- Access or mention non-public events
- Pretend to have capabilities you don't have`;

    // Initial AI call with tools
    let aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    console.log("Calling AI with messages:", aiMessages.length);

    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools: tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "I'm receiving too many requests right now. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data = await response.json();
    let assistantMessage = data.choices?.[0]?.message;
    
    // Handle tool calls in a loop
    let iterations = 0;
    const maxIterations = 5;
    
    while (assistantMessage?.tool_calls && iterations < maxIterations) {
      iterations++;
      console.log(`Processing tool calls (iteration ${iterations}):`, assistantMessage.tool_calls.length);
      
      // Add assistant message with tool calls
      aiMessages.push(assistantMessage);
      
      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        
        const toolResult = await executeTool(supabase, toolName, toolArgs);
        
        aiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult
        });
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
          tools: tools,
          tool_choice: "auto",
        }),
      });
      
      if (!response.ok) {
        console.error("AI gateway error on tool response:", response.status);
        break;
      }
      
      data = await response.json();
      assistantMessage = data.choices?.[0]?.message;
    }

    // Extract final response and any navigation actions
    const content = assistantMessage?.content || "I apologize, but I'm having trouble responding right now. Please try again or contact gleeclub@spelman.edu for assistance.";
    
    // Parse any navigation suggestions from the response
    let navigationAction = null;
    if (assistantMessage?.tool_calls) {
      const navCall = assistantMessage.tool_calls.find((tc: any) => tc.function.name === 'suggest_navigation');
      if (navCall) {
        try {
          const navArgs = JSON.parse(navCall.function.arguments);
          const pageRoutes: Record<string, string> = {
            booking: "/booking-request",
            calendar: "/public-calendar",
            auth: "/auth",
            alumnae: "/alumnae",
            shop: "/shop",
            auditioner: "/auditioner"
          };
          navigationAction = {
            route: pageRoutes[navArgs.page],
            label: navArgs.page === "booking" ? "Book Us" :
                   navArgs.page === "calendar" ? "View Calendar" :
                   navArgs.page === "auth" ? "Login / Sign Up" :
                   navArgs.page === "alumnae" ? "Alumnae Portal" :
                   navArgs.page === "shop" ? "Visit Shop" :
                   "Audition Info"
          };
        } catch (e) {
          console.error("Error parsing navigation:", e);
        }
      }
    }

    console.log("Returning response with content length:", content.length);

    return new Response(
      JSON.stringify({ 
        content,
        navigationAction,
        role: "assistant"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Public assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
