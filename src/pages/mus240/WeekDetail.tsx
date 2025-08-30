
import { useParams, Link } from 'react-router-dom';
import { WEEKS, Track } from '../../data/mus240Weeks';
import { useState, useEffect } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ArrowLeft, Play, ExternalLink, Calendar, Music, Clock, Globe, Edit, Save, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMus240VideoEdits } from '@/hooks/useMus240VideoEdits';
import backgroundImage from '@/assets/mus240-background.jpg';

export default function WeekDetail() {
  const { weekNumber, week: weekParam } = useParams();
  
  // Handle both parameter names (weekNumber and week)
  const weekNumberString = weekNumber || weekParam;
  const weekNum = parseInt(weekNumberString || '0');
  const week = WEEKS.find(w => w.number === weekNum);
  
  const [embedFailed, setEmbedFailed] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editedTracks, setEditedTracks] = useState<Track[]>([]);
  
  const { tracks: savedTracks, loading, saving, saveVideoEdits } = useMus240VideoEdits(weekNum);

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

  // Use saved tracks if available, otherwise fall back to default week tracks
  const displayTracks = savedTracks.length > 0 ? savedTracks : week.tracks;

  // Initialize editedTracks when tracks change
  useEffect(() => {
    if (!isEditing) {
      setEditedTracks(displayTracks);
    }
  }, [displayTracks, isEditing]);

  const handleEditTrack = (index: number, field: keyof Track, value: string) => {
    setEditedTracks(prev => prev.map((track, i) => 
      i === index ? { ...track, [field]: value } : track
    ));
  };

  const handleSaveChanges = async () => {
    const success = await saveVideoEdits(editedTracks);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTracks(displayTracks);
    setIsEditing(false);
  };

  const handleAddTrack = () => {
    const newTrack: Track = {
      title: "New Video Title",
      source: "YouTube",
      url: "https://www.youtube.com/watch?v="
    };
    setEditedTracks(prev => [...prev, newTrack]);
  };

  const handleRemoveTrack = (index: number) => {
    setEditedTracks(prev => prev.filter((_, i) => i !== index));
  };

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
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    <span className="font-medium">{displayTracks.length} Listening Examples</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>Week {week.number} Materials</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <Button 
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Videos
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={handleSaveChanges}
                        size="sm"
                        disabled={saving}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button 
                        onClick={handleCancelEdit}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tracks Section */}
          <section className="space-y-6">
            {isEditing && (
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 border-dashed">
                <div className="text-center">
                  <Button 
                    onClick={handleAddTrack}
                    variant="outline"
                    className="flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Video
                  </Button>
                </div>
              </div>
            )}
            
            {editedTracks.map((track, index) => {
              const isYouTube = track.url.includes('youtube.com') || track.url.includes('youtu.be');
              const videoId = getVideoId(track.url);
              const isHistorical = isHistoricalVideo(track.title);
              const hasEmbedFailed = embedFailed[index];

              return (
                <div key={index} className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
                  <div className="mb-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex-1 space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
                                  <Input
                                    value={track.title}
                                    onChange={(e) => handleEditTrack(index, 'title', e.target.value)}
                                    className="text-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-1 block">Video URL</label>
                                  <Input
                                    value={track.url}
                                    onChange={(e) => handleEditTrack(index, 'url', e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-1 block">Source</label>
                                  <Input
                                    value={track.source}
                                    onChange={(e) => handleEditTrack(index, 'source', e.target.value)}
                                    placeholder="YouTube, Internet Archive, etc."
                                  />
                                </div>
                              </div>
                              <Button 
                                onClick={() => handleRemoveTrack(index)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 self-start mt-6"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <h3 className="text-xl font-bold text-gray-900">{track.title}</h3>
                        )}
                      </div>
                    </div>
                    {!isEditing && (
                      <div className="ml-11 flex items-center gap-2 text-gray-500">
                        <Globe className="h-4 w-4" />
                        <span className="text-sm font-medium">Source: {track.source}</span>
                      </div>
                    )}
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
