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
