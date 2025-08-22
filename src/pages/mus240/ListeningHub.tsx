import { Link } from 'react-router-dom';
import { WEEKS } from '../../data/mus240Weeks';
import { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Search, Play, Calendar, Music } from 'lucide-react';

export default function ListeningHub() {
  const [q, setQ] = useState('');
  const items = WEEKS.filter(w =>
    w.title.toLowerCase().includes(q.toLowerCase()) ||
    w.tracks.some(t => t.title.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      {/* Hero Section */}
      <section className="relative min-h-[60vh] bg-gradient-to-br from-primary via-primary/90 to-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              MUS 240 Listening Hub
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              Explore the rich tapestry of African American music through curated listening experiences, 
              from West African foundations to contemporary innovations.
            </p>
            <div className="flex items-center justify-center gap-8 text-white/80">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                <span>{WEEKS.length} Weeks</span>
              </div>
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                <span>{WEEKS.reduce((total, week) => total + week.tracks.length, 0)} Tracks</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating music notes decoration */}
        <div className="absolute top-20 left-10 text-white/20 animate-pulse">
          <Music className="h-16 w-16" />
        </div>
        <div className="absolute bottom-32 right-16 text-white/20 animate-pulse delay-700">
          <Music className="h-12 w-12" />
        </div>
        <div className="absolute top-40 right-32 text-white/20 animate-pulse delay-1000">
          <Music className="h-8 w-8" />
        </div>
      </section>

      {/* Search Section */}
      <section className="bg-muted/30 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <input
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-border/50 rounded-2xl bg-background/80 backdrop-blur-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-lg"
              placeholder="Search weeks, tracks, or musical styles..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Back Link */}
        <div className="mb-8">
          <Link 
            to="/classes/mus240" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Back to MUS 240 Class</span>
          </Link>
        </div>

        {/* Results Counter */}
        {q && (
          <div className="mb-6 text-muted-foreground">
            Found {items.length} result{items.length !== 1 ? 's' : ''} for "{q}"
          </div>
        )}

        {/* Week Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((week) => (
            <article 
              key={week.number} 
              className="group relative bg-card rounded-3xl p-8 border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              {/* Week Number Badge */}
              <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                {week.number}
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Calendar className="h-4 w-4" />
                <time className="text-sm font-medium">
                  {new Date(week.date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </time>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold mb-4 leading-tight group-hover:text-primary transition-colors">
                {week.title}
              </h3>

              {/* Track Count */}
              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <Play className="h-4 w-4" />
                <span className="text-sm">
                  {week.tracks.length} track{week.tracks.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* CTA Button */}
              <Link 
                to={`/classes/mus240/listening/${week.number}`} 
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all duration-300 group-hover:shadow-lg"
              >
                <Play className="h-4 w-4" />
                Start Listening
              </Link>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </article>
          ))}
        </div>

        {/* Empty State */}
        {items.length === 0 && q && (
          <div className="text-center py-16">
            <Music className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No matches found</h3>
            <p className="text-muted-foreground">Try searching for different keywords or browse all weeks above.</p>
          </div>
        )}
      </main>
    </UniversalLayout>
  );
}