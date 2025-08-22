import { Link } from 'react-router-dom';
import { WEEKS } from '../../data/mus240Weeks';
import { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Search, Play, Calendar, Music, ArrowLeft } from 'lucide-react';
import backgroundImage from '@/assets/mus240-background.jpg';

export default function ListeningHub() {
  const [q, setQ] = useState('');
  const items = WEEKS.filter(w =>
    w.title.toLowerCase().includes(q.toLowerCase()) ||
    w.tracks.some(t => t.title.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative bg-gradient-to-br from-orange-800 to-amber-600"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10"></div>
        
        <main className="relative z-10 max-w-6xl mx-auto px-4 py-12">
          {/* Header with back navigation */}
          <div className="mb-8">
            <Link 
              to="/classes/mus240" 
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to MUS 240
            </Link>
          </div>

          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Music className="h-6 w-6 text-amber-300" />
              <span className="text-white/90 font-medium">Listening Hub</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
              MUS 240 Listening
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
              <div className="hidden sm:block w-1 h-1 bg-white/60 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                <span>{WEEKS.reduce((total, week) => total + week.tracks.length, 0)} Tracks</span>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="mb-12 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
              <input
                className="w-full pl-12 pr-4 py-4 text-lg bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder:text-white/60 focus:bg-white/20 focus:border-white/40 focus:outline-none transition-all duration-300"
                placeholder="Search weeks, tracks, or musical styles..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Results Counter */}
          {q && (
            <div className="mb-6 text-center text-white/70">
              Found {items.length} result{items.length !== 1 ? 's' : ''} for "{q}"
            </div>
          )}

          {/* Week Cards Grid */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {items.map((week) => (
              <Link 
                key={week.number} 
                to={`/classes/mus240/listening/${week.number}`}
                className="group block"
              >
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/30 hover:bg-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 relative">
                  {/* Week Number Badge */}
                  <div className="absolute -top-3 -right-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                    {week.number}
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-gray-500 mb-3">
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 leading-tight group-hover:text-amber-600 transition-colors">
                    {week.title}
                  </h3>

                  {/* Track Count */}
                  <div className="flex items-center gap-2 text-gray-500 mb-4">
                    <Play className="h-4 w-4" />
                    <span className="text-sm">
                      {week.tracks.length} track{week.tracks.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Visual indicator */}
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                      <Play className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">Start Listening</span>
                  </div>
                </div>
              </Link>
            ))}
          </section>

          {/* Empty State */}
          {items.length === 0 && q && (
            <div className="text-center py-16">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
                <Music className="h-16 w-16 text-white/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No matches found</h3>
                <p className="text-white/70">Try searching for different keywords or browse all weeks above.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </UniversalLayout>
  );
}