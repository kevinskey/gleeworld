// Edge function: concert-card-regen
//
// Regenerates the text content of a single Concert Planner card via
// DeepSeek (OpenAI-compatible). Currently handles two card kinds:
//
//   - piece-detail → rewrites the piece's `program_notes`
//   - hero-cover  → rewrites the program's `subtitle`
//
// The function reads the underlying row server-side so the prompt has
// real context (composer, year-ish, voicing) without trusting the
// browser to send accurate text. RLS still applies to the row read.
//
// Body shape:
//   {
//     "card_kind": "piece-detail" | "hero-cover",
//     "program_id": "uuid",
//     "piece_id":   "uuid"   (required when card_kind = piece-detail)
//     "tone":       "concise" | "scholarly" | "warm"   (optional)
//   }
// Response:
//   { "suggestion": "…" }
//
// Auth: requires the user's JWT (the function uses anon API + the
// caller's token so tenant RLS clamps reads to the user's tenant).
// Falls back to service role only for the auth-userdata read.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-slug',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

type CardKind = 'piece-detail' | 'hero-cover';
type Tone = 'concise' | 'scholarly' | 'warm';

interface ProgramRow {
  id: string;
  title: string;
  subtitle: string | null;
  venue: string | null;
  conductor: string | null;
  performer_group: string | null;
  event_date: string | null;
}
interface PieceRow {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  voicing: string | null;
  duration_seconds: number | null;
  program_notes: string | null;
  rights_status: string | null;
}

async function authedGet<T>(path: string, jwt: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`PostgREST ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

function promptForPiece(program: ProgramRow, piece: PieceRow, tone: Tone): string {
  const toneLine = {
    concise: 'Write tight, 2–3 sentences. Plain language, no purple prose.',
    scholarly: '3–4 sentences. Reference the historical era, form, or notable musical features. Academic but not stuffy.',
    warm: '2–3 sentences in a warm, audience-friendly voice the conductor might say from the podium.',
  }[tone];

  return [
    `You are a music research assistant writing concert program notes for an ensemble's printed and published program. Treat this as a research task, not a generic blurb.`,
    ``,
    `Piece: ${piece.title}`,
    piece.composer ? `Composer: ${piece.composer}` : '',
    piece.arranger ? `Arranger: ${piece.arranger}` : '',
    piece.voicing ? `Voicing: ${piece.voicing}` : '',
    program.performer_group ? `Performed by: ${program.performer_group}` : '',
    ``,
    `Existing notes (may be empty): ${piece.program_notes || '(none)'}`,
    ``,
    `RESEARCH STEP (silent, do not output):`,
    `Recall what you actually know about THIS specific work by THIS specific composer:`,
    `  • Approximate year/period of composition`,
    `  • Text source (Psalm, scripture, poem, libretto, folk tune) and language`,
    `  • Original voicing/instrumentation and typical performing forces`,
    `  • Form / structure (e.g. through-composed, motet, anthem, art song, spiritual)`,
    `  • Historical or liturgical context, dedication, premiere, or notable performers`,
    `  • Distinctive musical features (modal, polyphonic, syllabic, melismatic, etc.)`,
    `If you are NOT confident about a specific fact, OMIT it. Do not invent dates, dedicatees, premiere details, or text sources.`,
    `If you don't know this exact piece, anchor the notes in what you DO know — the composer's era, style, and typical output — and say what kind of work it appears to be.`,
    ``,
    `WRITING STEP (this is the output):`,
    toneLine,
    `Ground every statement in the research above. Prefer concrete musical detail over vague praise ("a soaring climax" is generic; "an unaccompanied a cappella opening that swells into eight-part divisi" is grounded).`,
    ``,
    `Output ONLY the program notes. No preamble, no labels, no quote marks, no headers, no "Program Notes:" prefix.`,
  ].filter(Boolean).join('\n');
}

function promptForHero(program: ProgramRow, tone: Tone): string {
  const toneLine = {
    concise: 'Write a punchy 4–8 word subtitle.',
    scholarly: 'Write a thoughtful 6–10 word subtitle that hints at the program\'s theme.',
    warm: 'Write a warm, inviting 5–9 word subtitle that draws audiences in.',
  }[tone];

  return [
    `You are writing the subtitle (tagline) for a concert program titled "${program.title}".`,
    program.venue ? `Venue: ${program.venue}` : '',
    program.conductor ? `Conductor: ${program.conductor}` : '',
    program.performer_group ? `Performed by: ${program.performer_group}` : '',
    program.event_date ? `Date: ${program.event_date}` : '',
    ``,
    `RESEARCH STEP (silent, do not output):`,
    `Consider what the title "${program.title}" implies — season, theme, repertoire era, liturgical or secular context. Use that thematic understanding to shape the subtitle.`,
    ``,
    toneLine,
    ``,
    `Output ONLY the subtitle. No quotes, no labels, no period at the end unless rhetorical.`,
  ].filter(Boolean).join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Auth check ─────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── AI key ─────────────────────────────────────────────────────
  const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const apiKey = DEEPSEEK_API_KEY || OPENAI_API_KEY;
  const apiUrl = DEEPSEEK_API_KEY
    ? 'https://api.deepseek.com/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const model = DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4o-mini';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ai_not_configured', message: 'Set DEEPSEEK_API_KEY (or OPENAI_API_KEY) in the edge function env.' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Body ───────────────────────────────────────────────────────
  let body: {
    card_kind?: CardKind;
    program_id?: string;
    piece_id?: string;
    tone?: Tone;
    overrides?: Partial<PieceRow & ProgramRow>;
  };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const cardKind = body.card_kind;
  const programId = body.program_id;
  const pieceId = body.piece_id;
  const tone: Tone = body.tone ?? 'warm';
  const overrides = body.overrides ?? {};
  if (!cardKind || !programId) {
    return new Response(JSON.stringify({ error: 'missing_params' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (cardKind === 'piece-detail' && !pieceId) {
    return new Response(JSON.stringify({ error: 'missing_piece_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // ── Build prompt from real DB rows ─────────────────────────────
  let prompt: string;
  try {
    const programs = await authedGet<ProgramRow>(
      `gw_concert_programs?id=eq.${programId}&select=id,title,subtitle,venue,conductor,performer_group,event_date`,
      jwt,
    );
    if (programs.length === 0) {
      return new Response(JSON.stringify({ error: 'program_not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // Merge any client-supplied overrides so unsaved edits (the
    // 700ms debounce in PieceDetailEditor) still reach the prompt.
    const program: ProgramRow = {
      ...programs[0],
      title: overrides.title ?? programs[0].title,
      subtitle: overrides.subtitle ?? programs[0].subtitle,
      venue: overrides.venue ?? programs[0].venue,
      conductor: overrides.conductor ?? programs[0].conductor,
      performer_group: overrides.performer_group ?? programs[0].performer_group,
    };

    if (cardKind === 'piece-detail') {
      const pieces = await authedGet<PieceRow>(
        `gw_concert_program_pieces?id=eq.${pieceId}&program_id=eq.${programId}&select=id,title,composer,arranger,voicing,duration_seconds,program_notes,rights_status`,
        jwt,
      );
      if (pieces.length === 0) {
        return new Response(JSON.stringify({ error: 'piece_not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const piece: PieceRow = {
        ...pieces[0],
        title: overrides.title ?? pieces[0].title,
        composer: overrides.composer ?? pieces[0].composer,
        arranger: overrides.arranger ?? pieces[0].arranger,
      };
      prompt = promptForPiece(program, piece, tone);
    } else if (cardKind === 'hero-cover') {
      prompt = promptForHero(program, tone);
    } else {
      return new Response(JSON.stringify({ error: 'card_kind_unsupported', message: 'Regen only supports piece-detail and hero-cover right now.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: 'context_fetch_failed', detail: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── LLM call ───────────────────────────────────────────────────
  try {
    const aiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.4,
      }),
    });
    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => '');
      return new Response(JSON.stringify({ error: 'ai_api_error', detail: detail.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await aiRes.json();
    const suggestion = data?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!suggestion) {
      return new Response(JSON.stringify({ error: 'empty_suggestion' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ suggestion }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: 'ai_call_failed', detail: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
