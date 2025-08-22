import { useParams, Link } from 'react-router-dom';
import { WEEKS } from '../../data/mus240Weeks';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

type Comment = { 
  id: string; 
  week: number; 
  track_index: number | null; 
  author: string | null; 
  content: string; 
  created_at: string; 
};

export default function WeekDetail() {
  const { week } = useParams();
  const num = Number(week);
  const wk = WEEKS.find(w => w.number === num);
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('smaam_comments')
        .select('*')
        .eq('week', num)
        .order('created_at', { ascending: false });
      if (!error && data) setComments(data as Comment[]);
    })();
  }, [num]);

  const post = async (track_index: number | null, a: string, c: string) => {
    if (!c.trim()) return;
    const { data, error } = await supabase
      .from('smaam_comments')
      .insert([{ week: num, track_index, author: a || null, content: c }])
      .select();
    if (!error && data) {
      setComments(prev => [...data as Comment[], ...prev]);
      setAuthor('');
      setContent('');
    }
  };

  if (!wk) {
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        <main className="max-w-5xl mx-auto p-4">
          <p>Week not found.</p>
          <Link to="/classes/mus240/listening" className="text-blue-600 hover:underline">← Back to Listening Hub</Link>
        </main>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <main className="max-w-5xl mx-auto p-4">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Week {wk.number}</h1>
          <div className="text-xs text-muted-foreground">{wk.date}</div>
          <p className="mt-2">{wk.title}</p>
          <Link to="/classes/mus240/listening" className="text-sm text-blue-600 hover:underline">← All weeks</Link>
        </header>

        <section className="rounded-2xl border p-4 mb-6">
          <h2 className="text-lg font-medium">Listening</h2>
          <ul className="mt-2 space-y-3">
            {wk.tracks.map((t, i) => (
              <li key={i} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.source}</div>
                  </div>
                  <a 
                    href={t.url} 
                    target="_blank" 
                    rel="noopener" 
                    className="px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Open
                  </a>
                </div>

                <TrackCommentBox onPost={(a, c) => post(i, a, c)} />
                <CommentList items={comments.filter(c => c.track_index === i)} label={`Track ${i + 1}`} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border p-4">
          <h2 className="text-lg font-medium">General Week Comments</h2>
          <div className="mt-2 flex flex-col gap-2">
            <input 
              className="border rounded-xl p-2" 
              placeholder="Your name (optional)" 
              value={author} 
              onChange={e => setAuthor(e.target.value)} 
            />
            <textarea 
              className="border rounded-xl p-2 min-h-[90px]" 
              placeholder="Share your insight or question…" 
              value={content} 
              onChange={e => setContent(e.target.value)} 
            />
            <button 
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors self-start" 
              onClick={() => post(null, author, content)}
            >
              Post
            </button>
          </div>
          <CommentList items={comments.filter(c => c.track_index === null)} label="Week" />
        </section>
      </main>
    </UniversalLayout>
  );
}

function TrackCommentBox({ onPost }: { onPost: (author: string, content: string) => void }) {
  const [a, setA] = useState('');
  const [c, setC] = useState('');
  
  const handlePost = () => {
    onPost(a, c);
    setA('');
    setC('');
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <input 
        className="border rounded-xl p-2" 
        placeholder="Your name (optional)" 
        value={a} 
        onChange={e => setA(e.target.value)} 
      />
      <textarea 
        className="border rounded-xl p-2 min-h-[70px]" 
        placeholder="Comment on this track…" 
        value={c} 
        onChange={e => setC(e.target.value)} 
      />
      <button 
        className="self-start px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" 
        onClick={handlePost}
      >
        Post for this track
      </button>
    </div>
  );
}

function CommentList({ items, label }: { items: Comment[]; label: string }) {
  if (!items.length) return <div className="mt-3 text-sm text-muted-foreground">No comments yet.</div>;
  
  return (
    <div className="mt-3 space-y-2">
      {items.map(c => (
        <div key={c.id} className="rounded-xl border p-3 bg-muted/50">
          <div className="text-xs text-muted-foreground">
            {label} • {c.author || 'Anonymous'} • {new Date(c.created_at).toLocaleString()}
          </div>
          <div className="mt-1">{c.content}</div>
        </div>
      ))}
    </div>
  );
}