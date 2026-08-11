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
    name: 'research_repertoire',
    // Deliberately drawn against search_music so the model picks correctly:
    // one answers "do we own this", the other "what is this".
    description:
      'Research a composer or a choral/liturgical work on the public web: dates and biography, '
      + "a work's voicing, language, publisher, text source, and background. "
      + 'Use when asked ABOUT a piece or composer — who wrote it, when, what forces it needs, where the text comes from. '
      + 'search_music searches OUR library and answers whether we hold a score; this answers what the work is. '
      + 'Reads the best source page in full, so prefer it over web_search for music questions.',
    parameters: {
      type: 'object',
      properties: {
        work: str('Title of the piece, e.g. "Sicut cervus" or "Lead Me, Guide Me"'),
        composer: str('Composer or arranger, e.g. "Palestrina", "Leon C. Roberts"'),
        question: str('What specifically to find out, e.g. "voicing and publisher" or "when was it written"'),
      },
      required: [],
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
    description: 'Search YouTube for videos. Returns video ids, titles, channels, and URLs. Use this to LIST options; to actually play something, call play_video.',
    parameters: {
      type: 'object',
      properties: { q: str('Search query') },
      required: ['q'],
    },
    // Read-only search, and a member asking to hear a piece is the whole
    // point — this was admin-gated, which left ordinary singers unable to
    // ask for the music they are learning.
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'play_video',
    description: "Play a video or song ON SCREEN. Use whenever the user asks to hear, play, watch, OPEN or pull up a piece of music, a recording or a video — 'play Ave Verum', 'pull up the Hall Johnson recording', 'let me hear that', 'open the video'. When they say 'the video' or 'that recording' about something ALREADY DISCUSSED in this conversation, they mean THAT one: pass its title as `q` — never send them to the video library instead. Pass what they asked for as `q` and it finds and plays the best match; pass `videoId` instead when you already have one from search_youtube. The player appears in the app — never read the URL or the video id aloud.",
    parameters: {
      type: 'object',
      properties: {
        q: str("What to play, e.g. 'Ave Verum Corpus Mozart' or 'Hall Johnson Ain't Got Time to Die'"),
        videoId: str('A known YouTube video id, when you already have one'),
        title: str('Title, when you already have one'),
      },
      required: [],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'lookup_hymn',
    description: "Hymnal number lookup across the loaded hymnal indexes (Lead Me Guide Me 2nd ed. 'LMGM II', Gather Comprehensive 'Gather', Baptist Hymnal 2008). Use for 'what number is <hymn>', picking hymns while planning a liturgy, or reverse lookup ('what is 457 in LMGM'). Pass `query` (title, first line, or tune name), and/or `number` for reverse lookup; `hymnal` narrows to one book. NEVER state a hymn number from memory — only from this tool.",
    parameters: {
      type: 'object',
      properties: {
        query: str("Hymn title, first line, or tune name, e.g. 'Total Praise'"),
        hymnal: str("Hymnal name or abbreviation to narrow to, e.g. 'LMGM', 'Gather', 'Baptist' (optional)"),
        number: str("Hymn number for reverse lookup, e.g. '457' (optional)"),
      },
      required: [],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'list_courses',
    description: "List the Academy courses this workspace offers — titles, codes, terms, instructors, dates. Use for 'what classes are available', 'is there a class called X', 'who teaches Y'. Optional `query` filters by title or code.",
    parameters: {
      type: 'object',
      properties: { query: str("Filter text matched against course title and code, e.g. 'sight reading' or 'GW102' (optional)") },
      required: [],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_course_info',
    description: "Full detail for ONE Academy course: description (where prerequisites and materials live), instructor with email/office/office-hours, term dates, meeting patterns, upcoming class sessions, location, syllabus link, enrollment. Use for 'when does X meet', 'who teaches X', 'what are the prerequisites for X', 'tell me about the X class'.",
    parameters: {
      type: 'object',
      properties: { course: str("Course title or code as the user said it, e.g. 'Sight Reading' or 'GW102'") },
      required: ['course'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_course_deadlines',
    description: "Assignment due dates and test windows across Academy courses — 'what's due in X', 'when is the next test', 'any assignments this week'. Omit `course` to sweep every visible course. Returns each item's course, kind (assignment/test), title, due/open/close dates and points. For how a SPECIFIC STUDENT is doing on them, use get_assignments instead.",
    parameters: {
      type: 'object',
      properties: { course: str('Course title or code to narrow to (optional)') },
      required: [],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_enrollments',
    description: "Who is enrolled in Academy courses. 'Am I enrolled in anything?' → call with no args. 'Who is in Sight Reading?' → pass course. 'What is Maria taking?' → pass user_name. Members can only see their OWN enrollments — an empty result for a member means they are not enrolled, never that the course is empty. Admins and instructors see everyone.",
    parameters: {
      type: 'object',
      properties: {
        course: str('Course title or code (optional)'),
        user_name: str("Member's name to filter by — admins/instructors only see results for others (optional)"),
      },
      required: [],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'stop_playback',
    // "Stop the music" during live voice (2026-08-10) got "I don't have a
    // way to stop playback" — true at the time: the app owns the mini
    // player but no tool touched it.
    description:
      "Stop the music or video currently playing in the assistant's player. Use for 'stop the music', 'stop playing', 'pause that', 'turn it off'. If nothing is playing it is harmless.",
    parameters: { type: 'object', properties: {}, required: [] },
    minRole: 'member', execution: 'client', confirm: false,
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
    description: "Navigate the user to a GleeWorld page. Valid keys are listed in the system prompt under 'Pages you can open' — pass one exactly as listed there.",
    parameters: {
      type: 'object',
      properties: { key: str("Page key from the system prompt's 'Pages you can open' list") },
      required: ['key'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'open_bible',
    description: "Open The Bible at a passage. Pass a plain reference like 'Psalm 23', 'John 3:16' or '1 Corinthians 13'. Use this when the user wants to SEE a passage. To read it aloud or quote it, call lookup_bible instead (or as well).",
    parameters: {
      type: 'object',
      properties: {
        reference: str("Scripture reference, e.g. 'Psalm 23' or 'John 3:16'"),
        translation: str("Optional translation code: WEBCE, KJV, DRA, ASV, BSB, YLT, WEBSTER, JPS1917. Defaults to WEBCE."),
      },
      required: ['reference'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'liturgical_day',
    description: "What day it is in the Church's calendar, and what is read at Mass. Returns the celebration name ('19th Sunday of Ordinary Time'), season, Sunday cycle, and every reading citation. Set include_psalm_text when the user wants the responsorial psalm actually recited — it returns the refrain and verses separately, in order.",
    parameters: {
      type: 'object',
      properties: {
        when: str("'today' (default), 'tomorrow', 'sunday' (the coming Sunday, or today if today is Sunday), or 'next_sunday'"),
        date: str('Explicit date as YYYY-MM-DD. Overrides `when`.'),
        include_psalm_text: str("Pass 'true' to also fetch the responsorial psalm's full text as refrain + verses."),
      },
      required: [],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'lookup_all_state',
    description: "Facts about a US state's All-State chorus program: audition dates and deadlines, requirements, fees, and audition repertoire, from the state association's own published materials. Call this for ANY All-State question — never answer from memory, because deadlines move and every state differs. Each fact returns with its official source URL and the date we last checked it; when you state a date, fee, or requirement, tell the user it comes from the association's published materials and that the source link is on screen.",
    parameters: {
      type: 'object',
      properties: {
        state: str("State name, two-letter abbreviation, or slug — e.g. 'Georgia', 'GA', 'texas'."),
        topic: str("Optional focus: 'dates', 'requirements', 'repertoire', 'fees', or 'overview'. Omit for everything."),
      },
      required: ['state'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'lookup_bible',
    description: "Get the actual TEXT of a Bible passage, or search scripture for a phrase. Use this to read a passage aloud or quote it. Only ever quote what this returns — never recite scripture from memory, because the wording differs between translations and the user is reading a specific one.",
    parameters: {
      type: 'object',
      properties: {
        reference: str("Scripture reference, e.g. 'Psalm 23' or 'John 3:16'. Omit if searching by phrase."),
        query: str("Words or phrase to search for, e.g. 'living water'. Omit if looking up a reference."),
        translation: str('Translation code: WEBCE, KJV, DRA, ASV, BSB, YLT, WEBSTER, JPS1917. Defaults to WEBCE.'),
      },
      required: [],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'open_link',
    description: 'Open an external http(s) link in a new browser tab — e.g. the full article behind a news headline from read_news_feeds. Use the exact link from the tool result; never fabricate URLs.',
    parameters: {
      type: 'object',
      properties: { url: str('The http(s) URL to open'), title: str('Short human name for the link, for the spoken confirmation (optional)') },
      required: ['url'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'open_song',
    description: "Open a score in the Viewer (the app's full-screen score reader) — the DEFAULT for every 'open/show/pull up <piece>' request. Get score_id from search_music first. Pass in_library=true ONLY when the user explicitly says to open it in the Music Library.",
    parameters: {
      type: 'object',
      properties: {
        score_id: str('gw_sheet_music id'),
        title: str('Score title, for the reply'),
        in_library: { type: 'boolean', description: 'true ONLY if the user explicitly asked for the Music Library instead of the Viewer' },
      },
      required: ['score_id'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'close_viewer',
    // "Close the music viewer, please" (2026-08-11) produced dead silence:
    // the model had no tool for it and replied empty. Closing returns the
    // user to the Music Library list.
    description: "Close the score Viewer / music viewer and return to the Music Library. Use for 'close the viewer', 'close the score', 'get me out of this music'.",
    parameters: { type: 'object', properties: {}, required: [] },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'open_note',
    description: 'Open a specific Planner note by id.',
    parameters: {
      type: 'object',
      properties: { note_id: str('gw_planner_notes id'), title: str('Note title, for the reply') },
      required: ['note_id'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'create_note',
    description: "Create a note in the user's private Planner. Optionally include body text. Also the tool for CAPTURING THIS CONVERSATION — 'save this as a note', 'put our research in my notes', 'write that down' — with a distilled summary of what was discussed as the body.",
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
    name: 'book_ride',
    description: "Open Uber or Lyft with a ride pre-filled to a destination. Resolve the destination with find_nearby_place FIRST to get its exact name, address, lat, and lng — never guess coordinates; omit lat/lng if unresolved. The user confirms and pays inside their own Uber/Lyft app — this only hands off a pre-filled request. REQUIRES user confirmation.",
    parameters: {
      type: 'object',
      properties: {
        provider: str("'uber' or 'lyft'"),
        destination_name: str('Place name, e.g. "Hartsfield-Jackson Atlanta International Airport" (optional)'),
        destination_address: str('Full street address of the destination'),
        lat: { type: 'number', description: 'Destination latitude from find_nearby_place (omit if unknown)' },
        lng: { type: 'number', description: 'Destination longitude from find_nearby_place (omit if unknown)' },
      },
      required: ['provider', 'destination_address'],
    },
    minRole: 'member', execution: 'client', confirm: true,
  },
  {
    name: 'order_food',
    description:
      "Prepare food-delivery deep links. Pass an optional query like 'donuts' or 'thai near me' and the user gets DoorDash, Uber Eats, and Grubhub buttons pre-loaded with that search. No query is fine — the panel then opens each service's homepage.",
    parameters: {
      type: 'object',
      properties: {
        query: str('What the user wants to order (optional)'),
        preferred: str("'doordash', 'ubereats', or 'grubhub' if the user has a preference (optional)"),
      },
      required: [],
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
    minRole: 'member', execution: 'server', confirm: false,
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
    name: 'web_search',
    description:
      "Search the live web (Brave) and return a short answer plus a list of result URLs. Use for current-events or fact-check questions your own knowledge can't cover. Daily limit is per-tenant — don't chain multiple searches for a single question.",
    parameters: {
      type: 'object',
      properties: { query: str('The search query') },
      required: ['query'],
    },
    minRole: 'member', execution: 'server', confirm: false,
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
  {
    name: 'get_assignments',
    description: 'Upcoming or overdue coursework for the caller, or for another student if user_id is given. Use for "what is due", "what am I behind on".',
    parameters: { type: 'object', properties: {
      window: str('week | overdue | all — defaults to week'),
      course_id: str('Optional course uuid to narrow to one class'),
      user_id: str('Optional gw_profiles user id; omit for the caller'),
    }, required: [] },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_grades',
    description: 'Per-course grade averages, or every graded item when detail is "all". Use for "how am I doing", "show me all my grades".',
    parameters: { type: 'object', properties: {
      detail: str('summary | all — defaults to summary'),
      course_id: str('Optional course uuid'),
      user_id: str('Optional gw_profiles user id; omit for the caller'),
    }, required: [] },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_grade_trend',
    description: 'Compares the average of the last 5 graded items against the 5 before. Use for "am I slipping", "is my grade going up".',
    parameters: { type: 'object', properties: {
      course_id: str('Optional course uuid'),
      user_id: str('Optional gw_profiles user id; omit for the caller'),
    }, required: [] },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_attendance',
    description: 'Attendance counts by status plus the most recent absences and late arrivals.',
    parameters: { type: 'object', properties: {
      days: str('Lookback window in days — defaults to 120'),
      user_id: str('Optional gw_profiles user id; omit for the caller'),
    }, required: [] },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_balance',
    description: 'Outstanding balance in cents plus open charges with due dates. Use for "what do I owe", "am I paid up".',
    parameters: { type: 'object', properties: {
      user_id: str('Optional gw_profiles user id; omit for the caller'),
    }, required: [] },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_roster_flags',
    description: 'Directors only. Lists students crossing a concern threshold across the whole roster.',
    parameters: { type: 'object', properties: {
      flag: str('failing | absences | missing_work | owes'),
    }, required: ['flag'] },
    minRole: 'admin', execution: 'server', confirm: false,
  },
  {
    name: 'search_academy',
    description: 'Search the choral reference library for background on conducting history and technique, beat patterns, spirituals, choral repertoire and major works, musical terminology, church music, choral education, and choral associations. Use this before answering any question about those subjects. Returns source passages.',
    parameters: {
      type: 'object',
      properties: { query: str('The subject to look up, e.g. "hemiola" or "conducting before the baton"') },
      required: ['query'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'search_music_facts',
    description: 'Look up exact instrument, voice and ensemble facts: playable ranges, practical vs extreme ranges, transposition (what an instrument sounds versus what is written), clefs, register spans, choral voice-part ranges for SATB, SSAA and TTBB, orchestral score order (which instrument goes where on the page), and standard orchestra instrumentations (Classical, Romantic, chamber). Call this BEFORE stating any range, transposition, register, score position or instrumentation — those are precise facts that must not be guessed. Not for concepts or technique.',
    parameters: {
      type: 'object',
      properties: { query: str('The instrument, voice part or fact wanted, e.g. "viola range" or "clarinet transposition"') },
      required: ['query'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'search_liturgy',
    description: "Search official Catholic Church documents on liturgy and sacred music — the Missal's General Instruction, council and papal documents, canon law, bishops' conference and diocesan norms. Use this BEFORE answering any question about what is allowed, required or forbidden at Mass or in Catholic worship: who may sing or read what, whether a text may be replaced, instruments and seasons, ritual roles, liturgical seasons and calendar. Returns passages with the authority of each. Never answer a question of liturgical law from your own knowledge.",
    parameters: {
      type: 'object',
      properties: {
        query: str('The liturgical question or topic, e.g. "may the choir sing the entrance chant alone"'),
        jurisdiction: str("Optional country or diocese code, e.g. 'US' or 'US/Atlanta', when the user's location matters."),
      },
      required: ['query'],
    },
    minRole: 'member', execution: 'server', confirm: false,
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
