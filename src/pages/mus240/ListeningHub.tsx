import { Link } from 'react-router-dom';
import { WEEKS } from '../../data/mus240Weeks';
import { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function ListeningHub() {
  const [q, setQ] = useState('');
  const items = WEEKS.filter(w =>
    w.title.toLowerCase().includes(q.toLowerCase()) ||
    w.tracks.some(t => t.title.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <main className="max-w-5xl mx-auto p-4">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Listening Hub</h1>
          <p className="text-sm text-muted-foreground">Browse weeks and open authoritative links.</p>
          <Link to="/classes/mus240" className="text-sm text-blue-600 hover:underline">← Back to Class</Link>
        </header>

        <input
          className="w-full border rounded-xl p-2 mb-4"
          placeholder="Search weeks or tracks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(w => (
            <article key={w.number} className="rounded-2xl border p-4">
              <h3 className="text-lg font-medium">Week {w.number}</h3>
              <div className="text-xs text-muted-foreground">{w.date}</div>
              <p className="mt-2 text-sm">{w.title}</p>
              <Link 
                to={`/classes/mus240/listening/${w.number}`} 
                className="inline-block mt-3 px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Open
              </Link>
            </article>
          ))}
        </div>
      </main>
    </UniversalLayout>
  );
}