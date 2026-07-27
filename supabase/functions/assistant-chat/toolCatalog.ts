// Pure TS — imported by both the Deno edge function and Vitest tests.
// Keep free of Deno/browser APIs.

export type AssistantRole = 'member' | 'admin';

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  minRole: AssistantRole;
  execution: 'server' | 'client';
  confirm: boolean;
}

const str = (description: string) => ({ type: 'string', description });

export const TOOL_CATALOG: ToolDef[] = [
  {
    name: 'query_calendar',
    description: "Look up the user's calendar events (GleeWorld events plus their synced Google Calendar events) in a date range. Use for any what/when/where question about rehearsals, classes, or events.",
    parameters: {
      type: 'object',
      properties: {
        from: str('ISO date (inclusive), e.g. 2026-07-13'),
        to: str('ISO date (inclusive)'),
      },
      required: ['from', 'to'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'search_music',
    description: 'Search the music library by title or composer. Returns matching scores with ids.',
    parameters: {
      type: 'object',
      properties: { query: str('Title or composer fragment') },
      required: ['query'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'find_user',
    description: 'Look up a member by name to get their user id, email, and phone. Use before send_sms or send_email to an individual.',
    parameters: {
      type: 'object',
      properties: { name: str('Full or partial name') },
      required: ['name'],
    },
    minRole: 'admin', execution: 'server', confirm: false,
  },
  {
    name: 'search_youtube',
    description: 'Search YouTube for videos. Returns video ids, titles, channels, and URLs.',
    parameters: {
      type: 'object',
      properties: { q: str('Search query') },
      required: ['q'],
    },
    minRole: 'admin', execution: 'server', confirm: false,
  },
  {
    name: 'get_ride',
    description:
      "Prepare a rideshare deep link to a destination. The user speaks naturally ('take me home', 'ride to the Fox Theatre'); you resolve the destination and hand back a card the user taps to launch Uber or Lyft. 'home' resolves to the user's saved home address; if it's not set, ASK for the address instead of calling this tool blindly.",
    parameters: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Where the user wants to go. Free text; may be "home", a place name, or an address.' },
        preferred: { type: 'string', description: "'uber' or 'lyft' if the user has a preference (optional)" },
      },
      required: ['destination'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'open_page',
    description: 'Navigate the user to a GleeWorld page. Valid keys: home, calendar, planner, music-library, studio, video, messenger, academy, sight-reading, part-tracks, media-library, songwriting, concert-planner, tour-manager, attendance, users, analytics.',
    parameters: {
      type: 'object',
      properties: { key: str('Page key from the list in the description') },
      required: ['key'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'open_song',
    description: 'Open a score from the music library in the PDF viewer. Get score_id from search_music first.',
    parameters: {
      type: 'object',
      properties: { score_id: str('gw_sheet_music id'), title: str('Score title, for the reply') },
      required: ['score_id'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'create_note',
    description: "Create a note in the user's private Planner. Optionally include body text.",
    parameters: {
      type: 'object',
      properties: { title: str('Note title'), body: str('Plain-text body (optional)') },
      required: ['title'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'create_task',
    description: "Create a task in the user's Planner. due_at is an ISO datetime; scheduled_date an ISO date; priority one of none|low|medium|high.",
    parameters: {
      type: 'object',
      properties: {
        title: str('Task title'),
        due_at: str('ISO datetime (optional)'),
        scheduled_date: str('ISO date (optional)'),
        priority: str('none|low|medium|high (optional)'),
      },
      required: ['title'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'create_event',
    description: 'Create a calendar event on the default calendar. Times are ISO datetimes with timezone.',
    parameters: {
      type: 'object',
      properties: {
        title: str('Event title'),
        start: str('ISO start datetime'),
        end: str('ISO end datetime'),
        location: str('Venue/location (optional)'),
        description: str('Description (optional)'),
      },
      required: ['title', 'start', 'end'],
    },
    minRole: 'admin', execution: 'client', confirm: false,
  },
  {
    name: 'start_video_session',
    description: 'Start a video meeting room and open it for the user. room_name must be letters/numbers/dots/underscores/hyphens only.',
    parameters: {
      type: 'object',
      properties: { room_name: str('Short room slug, e.g. rehearsal-check-in') },
      required: ['room_name'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'send_sms',
    description: 'Text one or more members. recipient_user_ids from find_user. REQUIRES user confirmation before sending.',
    parameters: {
      type: 'object',
      properties: {
        recipient_user_ids: { type: 'array', items: { type: 'string' }, description: 'gw_profiles user ids' },
        recipient_names: { type: 'array', items: { type: 'string' }, description: 'Display names, same order' },
        message: str('SMS body (keep under 160 chars)'),
      },
      required: ['recipient_user_ids', 'recipient_names', 'message'],
    },
    minRole: 'admin', execution: 'client', confirm: true,
  },
  {
    name: 'send_email',
    description: 'Email one or more members. Addresses resolved server-side from recipient_user_ids (from find_user); the model never handles raw addresses. REQUIRES user confirmation before sending.',
    parameters: {
      type: 'object',
      properties: {
        recipient_user_ids: { type: 'array', items: { type: 'string' }, description: 'gw_profiles user ids' },
        recipient_names: { type: 'array', items: { type: 'string' }, description: 'Display names, same order' },
        subject: str('Subject'),
        body: str('Plain-text body; will be sent as simple HTML paragraphs'),
      },
      required: ['recipient_user_ids', 'recipient_names', 'subject', 'body'],
    },
    minRole: 'admin', execution: 'client', confirm: true,
  },
  {
    name: 'add_video',
    description: 'Save a YouTube video to the Videos library. Get fields from search_youtube first.',
    parameters: {
      type: 'object',
      properties: {
        video_id: str('YouTube video id'),
        title: str('Video title'),
        channel: str('Channel name'),
        thumbnail_url: str('Thumbnail URL'),
      },
      required: ['video_id', 'title'],
    },
    minRole: 'admin', execution: 'client', confirm: false,
  },
  {
    name: 'create_course_draft',
    description: 'Create a complete DRAFT course in the Academy from your interview with the teacher: modules, assignments with prompts, a rubric, class sessions expanded from the meeting schedule, a repertoire playlist shell, and a pending roster. Students cannot see drafts. Interview first (see the course-builder rules in your instructions), summarize, get a verbal yes, then call ONCE with the full spec. REQUIRES user confirmation.',
    parameters: {
      type: 'object',
      properties: {
        spec: {
          type: 'object',
          description: 'The full CourseSpec',
          properties: {
            title: str('Course title'),
            course_code: str('Short code like MUS-240 (suggest one if the teacher has none)'),
            description: str('1-3 sentence course description'),
            semester: str('e.g. FALL 2026'),
            start_date: str('Term start, YYYY-MM-DD'),
            end_date: str('Term end, YYYY-MM-DD'),
            meeting_patterns: {
              type: 'array',
              description: 'Weekly meeting times',
              items: {
                type: 'object',
                properties: {
                  weekday: { type: 'number', description: '0=Sunday .. 6=Saturday' },
                  start_time: str('HH:MM 24h'),
                  end_time: str('HH:MM 24h'),
                  location: str('Room (optional)'),
                },
                required: ['weekday', 'start_time', 'end_time'],
              },
            },
            breaks: {
              type: 'array',
              description: 'Date ranges with no class',
              items: {
                type: 'object',
                properties: { from: str('YYYY-MM-DD'), to: str('YYYY-MM-DD'), name: str('e.g. Fall break') },
                required: ['from', 'to'],
              },
            },
            modules: {
              type: 'array',
              description: 'Max 16. Each with full descriptions, not stubs.',
              items: {
                type: 'object',
                properties: {
                  title: str('Module title, e.g. "Week 3: Legato gesture"'),
                  description: str('2-5 sentence module description'),
                  week_number: { type: 'number', description: 'Week of term, 1-based' },
                  learning_objectives: { type: 'array', items: { type: 'string' } },
                  assignments: {
                    type: 'array',
                    description: 'Max 8 per module, with authored prompts',
                    items: {
                      type: 'object',
                      properties: {
                        title: str('Assignment title'),
                        description: str('Short summary'),
                        instructions: str('Full authored prompt the student reads'),
                        points: { type: 'number', description: 'Point value' },
                        due_at: str('ISO datetime with timezone'),
                        assignment_type: str('standard|performance|reflection (optional)'),
                        category: str('Grading category (optional)'),
                      },
                      required: ['title', 'points', 'due_at'],
                    },
                  },
                },
                required: ['title', 'week_number', 'assignments'],
              },
            },
            rubric: {
              type: 'object',
              properties: {
                title: str('Rubric title'),
                description: str('Optional'),
                criteria: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: str('Criterion'),
                      description: str('Optional'),
                      max_points: { type: 'number', description: 'Max points' },
                      weight_percentage: { type: 'number', description: 'Weight 0-100' },
                    },
                    required: ['name', 'max_points', 'weight_percentage'],
                  },
                },
              },
              required: ['title', 'criteria'],
            },
            repertoire: {
              type: 'array',
              description: 'Pieces for the course playlist. Resolve ids with search_music first; keep raw titles when unmatched.',
              items: {
                type: 'object',
                properties: { library_item_id: str('gw_sheet_music id if resolved'), title: str('Piece title') },
                required: ['title'],
              },
            },
            roster: {
              type: 'array',
              description: 'Who to enroll AT PUBLISH (not at draft). Resolve user_id via find_user when possible.',
              items: {
                type: 'object',
                properties: { user_id: str('gw_profiles user id if resolved'), name: str('Display name') },
                required: ['name'],
              },
            },
          },
          required: ['title', 'start_date', 'end_date', 'meeting_patterns', 'modules'],
        },
      },
      required: ['spec'],
    },
    minRole: 'admin', execution: 'client', confirm: true,
  },
  {
    name: 'read_news_feeds',
    description: "Fetch the tenant's current news headlines — same feed the dashboard's News rail shows (fetch-news-feeds edge function). Returns up to `limit` items with title, source, description, published date, and link. Use for any 'what's in the news', 'read me today's headlines', or 'what's new in choral music' question. Server infers the tenant from the caller's JWT; no need to pass it.",
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'How many headlines to return (default 8, max 30). Keep small for spoken replies.' },
      },
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'find_nearby_place',
    description: "Find real-world places near the user via Google Places text search. `query` is what to search for ('starbucks', 'vietnamese restaurant', 'open pharmacy', 'gas station'). Provide EITHER lat/lng (when the system prompt lists the user's live location) OR `near` as a plain-text location ('30303', 'downtown Atlanta', 'my hotel'). Returns places with name, address, mapsUrl (one-tap to open in Maps), website, phone, rating, isOpen.",
    parameters: {
      type: 'object',
      properties: {
        query: str('What to look for, e.g. "starbucks" or "pizza"'),
        lat: { type: 'number', description: "Latitude (use when the system prompt has the user's live location)" },
        lng: { type: 'number', description: 'Longitude' },
        near: str("Plain-text location fallback when lat/lng aren't known (e.g. '30303' or 'my school')"),
      },
      required: ['query'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_preference',
    description: "Read one of the user's stored preferences (small key/value scratchpad — starbucks_usual, favorite_pizza, default_lunch, etc.). Returns null if the key was never set. Call this BEFORE asking the user for something they may have already told you.",
    parameters: {
      type: 'object',
      properties: { key: str('Snake-case key, e.g. starbucks_usual') },
      required: ['key'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'remember_preference',
    description: "Save (or update) one of the user's preferences for future recall. Use snake_case keys and plain-text values. Examples: key='starbucks_usual' value='grande blonde with oat milk'; key='favorite_pizza' value='Antico — Nona Margherita'.",
    parameters: {
      type: 'object',
      properties: {
        key: str('Snake-case key, e.g. starbucks_usual'),
        value: str('Plain text value the user gave you (≤ 4000 chars).'),
      },
      required: ['key', 'value'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'get_date_card',
    description: "Read the tenant's current date card (the hero card at the top of the dashboard). Returns { type, config }. Call this before explaining the current setting or before changing it.",
    parameters: { type: 'object', properties: {} },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'set_date_card',
    description: "Change the tenant's date card. `type` must be one of: plain, up_next, today, liturgical, custom. For type='custom' also provide `eyebrow`, `title`, `subtitle` (each ≤80 chars) — they accept tokens {{date}}, {{time}}, {{user_name}}, {{ensemble_name}}, {{next_event}}, {{next_event_date}}. Omit the text fields for non-custom types. Affects every member of the tenant.",
    parameters: {
      type: 'object',
      properties: {
        type: str("Card type key: 'plain' | 'up_next' | 'today' | 'liturgical' | 'custom'"),
        eyebrow: str('Custom card: small line above the title (optional)'),
        title: str('Custom card: main line (optional)'),
        subtitle: str('Custom card: line below the title (optional)'),
      },
      required: ['type'],
    },
    minRole: 'admin', execution: 'client', confirm: true,
  },
  {
    name: 'switch_world',
    description: "Switch to one of the user's other tenants ('worlds'). Pass `query` as the name or slug (or a partial match — 'kevinsworld', 'spelman', 'main'). Leave `query` empty to have the tool list the user's available worlds so you can ask which one. If the user is only in one world, this tool is a no-op. On web this cross-navigates to the tenant's subdomain; on native it swaps the cached tenant and reloads in place. Same underlying mechanism as the avatar dropdown's Switch organization list.",
    parameters: {
      type: 'object',
      properties: {
        query: str("Name or slug fragment of the target world, e.g. 'kevinsworld' or 'spelman'. Optional — omit to get a list."),
      },
      required: [],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
];

export function toolsForRole(role: AssistantRole): ToolDef[] {
  return TOOL_CATALOG.filter((t) => t.minRole === 'member' || role === 'admin');
}

export function toOpenAiTools(tools: ToolDef[]) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}
