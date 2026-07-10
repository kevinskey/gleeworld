// Ported from the standalone songwriter app's client/src/components/AIPanel.tsx.
// Tab structure, per-feature form state, and result rendering are kept
// byte-identical in spirit to the source — only three things changed:
//  - Transport: `api.ai.<method>(...)` (old REST client hitting
//    /api/ai/<endpoint>) is replaced by `askSongwritingAI(feature, payload)`
//    (Task 5), which invokes the `songwriting-ai` edge function. The old
//    `next-line` endpoint is feature `next_line`; every other feature keeps
//    its old name. Payload keys are unchanged so the edge function (built
//    against the old routes) reads the same shape.
//  - Error handling: the old panel toasted `e.message` globally via sonner.
//    Per the Task 9 brief this is now a panel-local inline notice so an AI
//    failure never touches the rest of the editor: an AiError whose message
//    contains "Too many" (or whose status is 429) renders "You've hit the AI
//    limit — try again in a few minutes."; a 403 / songwriting_not_enabled
//    error, or anything else (including non-AiError failures), renders "AI
//    assist is unavailable right now."
//  - Styling: ink-*/accent tokens → this app's light-theme shadcn tokens
//    (bg-card, border-border, text-foreground, text-muted-foreground,
//    bg-muted, text-primary), and every sub-11px label bumped to the
//    text-xs metadata floor (body copy stays at text-sm as in the source).

import { useState } from 'react';
import { toast } from 'sonner';
import { askSongwritingAI, AiError } from '@/lib/songwriting/ai';

type Props = {
  selectedWord: string;
  currentLine: string;
  previousLines: string[];
  sectionType: string;
  onInsertLine: (line: string) => void;
  onReplaceLine: (line: string) => void;
};

type Tab = 'rhymes' | 'synonyms' | 'senses' | 'related' | 'next' | 'rewrite';

// Maps an AI-request failure to the panel-local inline notice copy per the
// Task 9 brief. Rate limiting is recognized either by message content
// (in case the edge function's JSON body message changes wording slightly)
// or by HTTP status, whichever the transport surfaced.
function aiErrorMessage(e: unknown): string {
  if (e instanceof AiError && (e.message.includes('Too many') || e.status === 429)) {
    return "You've hit the AI limit — try again in a few minutes.";
  }
  return 'AI assist is unavailable right now.';
}

function ErrorNotice({ message }: { message: string }) {
  const isRateLimit = message.startsWith("You've hit the AI limit");
  return (
    <div
      role="alert"
      className={
        isRateLimit
          ? 'mt-3 text-xs bg-amber-500/10 border border-amber-500/40 rounded p-2 text-amber-800'
          : 'mt-3 text-xs bg-rose-50 border border-rose-300/60 rounded p-2 text-rose-700'
      }
    >
      {message}
    </div>
  );
}

export default function AIPanel({ selectedWord, currentLine, previousLines, sectionType, onInsertLine, onReplaceLine }: Props) {
  const [tab, setTab] = useState<Tab>('rhymes');
  const [style, setStyle] = useState('');

  return (
    <aside className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg font-semibold text-foreground">AI co-writer</h2>
      </div>

      <div className="grid grid-cols-3 gap-1 mb-4 bg-muted rounded-md p-1">
        <TabBtn active={tab === 'rhymes'} onClick={() => setTab('rhymes')}>Rhymes</TabBtn>
        <TabBtn active={tab === 'synonyms'} onClick={() => setTab('synonyms')}>Synonyms</TabBtn>
        <TabBtn active={tab === 'senses'} onClick={() => setTab('senses')}>Senses</TabBtn>
        <TabBtn active={tab === 'related'} onClick={() => setTab('related')}>Related</TabBtn>
        <TabBtn active={tab === 'next'} onClick={() => setTab('next')}>Next line</TabBtn>
        <TabBtn active={tab === 'rewrite'} onClick={() => setTab('rewrite')}>Rewrite</TabBtn>
      </div>

      <div className="mb-4">
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Style / mood (optional)</label>
        <input
          type="text"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          placeholder="e.g. folk ballad, heartbreak, gritty"
          className="w-full text-sm bg-muted border border-border rounded px-2 py-1.5 text-foreground focus:outline-none focus:border-primary"
        />
      </div>

      {tab === 'rhymes' && (
        <RhymeTab word={selectedWord} context={currentLine} style={style} />
      )}
      {tab === 'synonyms' && (
        <SynonymTab word={selectedWord} context={currentLine} style={style} />
      )}
      {tab === 'senses' && (
        <SensoryTab seedWord={selectedWord} context={currentLine} style={style} />
      )}
      {tab === 'related' && (
        <RelatedTab word={selectedWord} context={currentLine} style={style} />
      )}
      {tab === 'next' && (
        <NextLineTab
          previousLines={previousLines}
          sectionType={sectionType}
          style={style}
          onInsertLine={onInsertLine}
        />
      )}
      {tab === 'rewrite' && (
        <RewriteTab
          line={currentLine}
          context={previousLines.join(' / ')}
          onReplace={onReplaceLine}
        />
      )}
    </aside>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-xs py-1.5 rounded ${active ? 'bg-card shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}

// ── Rhymes ────────────────────────────────────────────────────────────────

function RhymeTab({ word, context, style }: { word: string; context: string; style: string }) {
  const [result, setResult] = useState<{ perfect: string[]; near: string[]; multi: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastWord, setLastWord] = useState('');
  const [showPerfect, setShowPerfect] = useState(true);
  const [showNear, setShowNear] = useState(true);
  const [showMulti, setShowMulti] = useState(true);

  async function find(w: string) {
    if (!w) return;
    setLoading(true);
    setError(null);
    try {
      const r = await askSongwritingAI('rhymes', { word: w, context, style });
      setResult(r);
      setLastWord(w);
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          defaultValue={word}
          key={word}
          placeholder="Word to rhyme"
          className="flex-1 text-sm border border-border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:border-primary"
          onKeyDown={(e) => { if (e.key === 'Enter') find((e.target as HTMLInputElement).value.trim()); }}
        />
        <button
          onClick={() => find(word)}
          disabled={!word || loading}
          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 disabled:opacity-40"
        >
          {loading ? '…' : 'Find'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Tip: click a word in the editor to fill this field.
      </p>

      {error && <ErrorNotice message={error} />}

      {result && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <FilterChip label={`Perfect (${result.perfect?.length ?? 0})`} active={showPerfect} onClick={() => setShowPerfect((v) => !v)} title="Pop / theatrical clarity" />
            <FilterChip label={`Near/Slant (${result.near?.length ?? 0})`} active={showNear} onClick={() => setShowNear((v) => !v)} title="Modern / gritty" />
            <FilterChip label={`Multi (${result.multi?.length ?? 0})`} active={showMulti} onClick={() => setShowMulti((v) => !v)} title="Multi-syllable rhymes" />
          </div>
          <div className="mt-4 space-y-4">
            {showPerfect && <RhymeGroup title={`Perfect rhymes for "${lastWord}"`} words={result.perfect} />}
            {showNear && <RhymeGroup title="Near / slant rhymes" words={result.near} />}
            {showMulti && <RhymeGroup title="Multi-syllable" words={result.multi} />}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick, title }: { label: string; active: boolean; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-0.5 rounded-full border transition-colors ${
        active
          ? 'border-primary text-primary bg-primary/5'
          : 'border-border text-muted-foreground hover:border-muted-foreground'
      }`}
    >
      {label}
    </button>
  );
}

function RhymeGroup({ title, words }: { title: string; words: string[] }) {
  if (!words?.length) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {words.map((w) => (
          <button
            key={w}
            onClick={() => navigator.clipboard.writeText(w).then(() => toast.success(`Copied "${w}"`))}
            className="text-xs bg-muted hover:bg-primary hover:text-primary-foreground border border-border rounded px-2 py-1 text-foreground"
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Synonyms ─────────────────────────────────────────────────────────────

function SynonymTab({ word, context, style }: { word: string; context: string; style: string }) {
  const [result, setResult] = useState<{ common: string[]; vivid: string[]; poetic: string[]; phrases: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastWord, setLastWord] = useState('');

  async function find(w: string) {
    if (!w) return;
    setLoading(true);
    setError(null);
    try {
      const r = await askSongwritingAI('synonyms', { word: w, context, style });
      setResult(r);
      setLastWord(w);
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          defaultValue={word}
          key={word}
          placeholder="Word to swap"
          className="flex-1 text-sm border border-border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:border-primary"
          onKeyDown={(e) => { if (e.key === 'Enter') find((e.target as HTMLInputElement).value.trim()); }}
        />
        <button
          onClick={() => find(word)}
          disabled={!word || loading}
          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 disabled:opacity-40"
        >
          {loading ? '…' : 'Find'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Tip: click a word in the editor to fill this field. Click any result to copy.
      </p>

      {error && <ErrorNotice message={error} />}

      {result && (
        <div className="mt-4 space-y-4">
          <RhymeGroup title={`Common alternatives for "${lastWord}"`} words={result.common} />
          <RhymeGroup title="Vivid / sensory" words={result.vivid} />
          <RhymeGroup title="Poetic / elevated" words={result.poetic} />
          <RhymeGroup title="Phrases" words={result.phrases} />
        </div>
      )}
    </div>
  );
}

// ── Sensory word bank ────────────────────────────────────────────────────

function SensoryTab({ seedWord, context, style }: { seedWord: string; context: string; style: string }) {
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState<{ sight: string[]; sound: string[]; touch: string[]; taste: string[]; smell: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTopic, setLastTopic] = useState('');

  async function find(t: string) {
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const r = await askSongwritingAI('sensory', { topic: t, context, style });
      setResult(r);
      setLastTopic(t);
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={seedWord || 'Topic, feeling, or scene'}
          className="flex-1 text-sm border border-border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:border-primary"
          onKeyDown={(e) => { if (e.key === 'Enter') find(topic.trim() || seedWord); }}
        />
        <button
          onClick={() => find(topic.trim() || seedWord)}
          disabled={loading || (!topic && !seedWord)}
          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 disabled:opacity-40"
        >
          {loading ? '…' : 'Show'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Show, don't tell — concrete words across the five senses for "{lastTopic || topic || seedWord || '…'}".
      </p>

      {error && <ErrorNotice message={error} />}

      {result && (
        <div className="mt-4 space-y-4">
          <RhymeGroup title="Sight" words={result.sight} />
          <RhymeGroup title="Sound" words={result.sound} />
          <RhymeGroup title="Touch" words={result.touch} />
          <RhymeGroup title="Taste" words={result.taste} />
          <RhymeGroup title="Smell" words={result.smell} />
        </div>
      )}
    </div>
  );
}

// ── Related concepts ─────────────────────────────────────────────────────

function RelatedTab({ word, context, style }: { word: string; context: string; style: string }) {
  const [result, setResult] = useState<{ objects: string[]; places: string[]; actions: string[]; feelings: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastWord, setLastWord] = useState('');

  async function find(w: string) {
    if (!w) return;
    setLoading(true);
    setError(null);
    try {
      const r = await askSongwritingAI('related', { word: w, context, style });
      setResult(r);
      setLastWord(w);
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          defaultValue={word}
          key={word}
          placeholder="Concept (e.g. ocean, betrayal)"
          className="flex-1 text-sm border border-border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:border-primary"
          onKeyDown={(e) => { if (e.key === 'Enter') find((e.target as HTMLInputElement).value.trim()); }}
        />
        <button
          onClick={() => find(word)}
          disabled={!word || loading}
          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 disabled:opacity-40"
        >
          {loading ? '…' : 'Find'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Words that live in the same world — motifs, settings, actions, feelings.
      </p>

      {error && <ErrorNotice message={error} />}

      {result && (
        <div className="mt-4 space-y-4">
          <RhymeGroup title={`Objects & motifs (for "${lastWord}")`} words={result.objects} />
          <RhymeGroup title="Places" words={result.places} />
          <RhymeGroup title="Actions" words={result.actions} />
          <RhymeGroup title="Feelings" words={result.feelings} />
        </div>
      )}
    </div>
  );
}

// ── Next line ────────────────────────────────────────────────────────────

function NextLineTab({
  previousLines, sectionType, style, onInsertLine,
}: { previousLines: string[]; sectionType: string; style: string; onInsertLine: (s: string) => void }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    if (previousLines.length === 0) {
      toast.message('Write a line first, then ask for the next one');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await askSongwritingAI('next_line', {
        previous_lines: previousLines,
        section_type: sectionType,
        style,
        count: 3,
      });
      setSuggestions(r.suggestions || []);
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-2">
        Using <strong>{previousLines.length}</strong> prior line{previousLines.length !== 1 ? 's' : ''} in this {sectionType}.
      </div>
      <button
        onClick={suggest}
        disabled={loading}
        className="w-full px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 disabled:opacity-40"
      >
        {loading ? 'Thinking…' : 'Suggest next line'}
      </button>

      {error && <ErrorNotice message={error} />}

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="group flex items-start gap-2 bg-muted border border-border rounded p-3">
              <div className="flex-1 font-serif text-sm text-foreground">{s}</div>
              <button
                onClick={() => onInsertLine(s)}
                className="text-xs px-2 py-1 bg-card border border-border rounded hover:bg-primary hover:text-primary-foreground"
                title="Insert into the editor"
              >
                Use
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rewrite ──────────────────────────────────────────────────────────────

function RewriteTab({ line, context, onReplace }: { line: string; context: string; onReplace: (s: string) => void }) {
  const [instruction, setInstruction] = useState('make it stronger');
  const [rewrites, setRewrites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!line) {
      toast.message('Click a line in the editor first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await askSongwritingAI('rewrite', { line, instruction, context, count: 3 });
      setRewrites(r.rewrites || []);
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">Rewriting</div>
      <div className="text-sm italic text-muted-foreground mb-3 min-h-[1.5em]">
        {line ? `"${line}"` : '(click a line in the editor)'}
      </div>

      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Instruction</label>
      <input
        type="text"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        className="w-full text-sm border border-border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:border-primary mb-3"
      />

      <button
        onClick={go}
        disabled={loading || !line}
        className="w-full px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 disabled:opacity-40"
      >
        {loading ? 'Rewriting…' : 'Get 3 rewrites'}
      </button>

      {error && <ErrorNotice message={error} />}

      {rewrites.length > 0 && (
        <div className="mt-4 space-y-2">
          {rewrites.map((r, i) => (
            <div key={i} className="flex items-start gap-2 bg-muted border border-border rounded p-3">
              <div className="flex-1 font-serif text-sm text-foreground">{r}</div>
              <button
                onClick={() => onReplace(r)}
                className="text-xs px-2 py-1 bg-card border border-border rounded hover:bg-primary hover:text-primary-foreground"
              >
                Replace
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
