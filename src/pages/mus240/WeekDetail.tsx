
import { useParams, Link } from 'react-router-dom';
import { WEEKS } from '../../data/mus240Weeks';
import { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ArrowLeft, Play, ExternalLink, Calendar, Music, Clock, Globe } from 'lucide-react';
import backgroundImage from '@/assets/mus240-background.jpg';

export default function WeekDetail() {
  const { weekNumber } = useParams();
  const week = WEEKS.find(w => w.number === parseInt(weekNumber || '0'));
  const [embedFailed, setEmbedFailed] = useState<Record<string, boolean>>({});

  if (!week) {
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Week Not Found</h1>
            <Link to="/classes/mus240/listening" className="text-blue-600 hover:underline">
              ← Back to Listening Hub
            </Link>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  const handleEmbedError = (trackIndex: number) => {
    setEmbedFailed(prev => ({ ...prev, [trackIndex]: true }));
  };

  const getVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const isHistoricalVideo = (title: string): boolean => {
    const historicalKeywords = ['1939', 'field hollers', 'lomax', 'historical', 'archive', 'library of congress'];
    return historicalKeywords.some(keyword => title.toLowerCase().includes(keyword));
  };

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10"></div>
        
        <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/classes/mus240/listening" 
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Listening Hub
            </Link>
            
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/30">
              <div className="flex items-start gap-6 mb-6">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg flex-shrink-0">
                  {week.number}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Calendar className="h-4 w-4" />
                    <time className="text-sm font-medium">
                      {new Date(week.date).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </time>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                    {week.title}
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  <span className="font-medium">{week.tracks.length} Listening Examples</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>Week {week.number} Materials</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tracks Section */}
          <section className="space-y-6">
            {week.tracks.map((track, index) => {
              const isYouTube = track.url.includes('youtube.com') || track.url.includes('youtu.be');
              const videoId = getVideoId(track.url);
              const isHistorical = isHistoricalVideo(track.title);
              const hasEmbedFailed = embedFailed[index];

              return (
                <div key={index} className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-start gap-3">
                      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">
                        {index + 1}
                      </div>
                      <span className="flex-1">{track.title}</span>
                    </h3>
                    <div className="ml-11 flex items-center gap-2 text-gray-500">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm font-medium">Source: {track.source}</span>
                    </div>
                  </div>

                  {/* YouTube embed with enhanced handling */}
                  {isYouTube && videoId && (
                    <div className="mb-3">
                      {!hasEmbedFailed ? (
                        <div className="relative">
                          <iframe
                            className="w-full aspect-video rounded-xl shadow-lg"
                            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                            title={track.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            onError={() => handleEmbedError(index)}
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                          <div className="text-center p-6 max-w-md">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                              <Play className="h-8 w-8 text-red-600" />
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-2">Video Restricted</h4>
                            <p className="text-sm text-gray-600 mb-4">
                              This historical recording has embedding restrictions.
                            </p>
                            <a
                              href={track.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Watch on YouTube
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Non-YouTube content */}
                  {!isYouTube && (
                    <div className="w-full aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center border border-blue-200 mb-3">
                      <div className="text-center p-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                          <ExternalLink className="h-8 w-8 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">External Resource</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          This content is hosted on {track.source}
                        </p>
                        <a
                          href={track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View Resource
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 ml-11">
                    <a
                      href={track.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-sm font-medium">Open in New Tab</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </section>
        </main>
      </div>
    </UniversalLayout>
  );
}
