import { Link } from 'react-router-dom';
import { WEEKS } from '../../data/mus240Weeks';
import { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Search, Play, Calendar, Music, ArrowLeft, Upload, Brain, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import backgroundImage from '@/assets/mus240-background.jpg';
import { AudioBulkUpload } from '@/components/mus240/AudioBulkUpload';
import { useAudioResources } from '@/hooks/useAudioResources';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';

export default function ListeningHub() {
  const [q, setQ] = useState('');
  const [activeTab, setActiveTab] = useState('weekly-listening');
  const [showUpload, setShowUpload] = useState(false);
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  
  const { resources: aiMusicResources, loading: aiMusicLoading, refetch: refetchAiMusic, getFileUrl, deleteResource } = useAudioResources('ai-music');
  
  const items = WEEKS.filter(w =>
    w.title.toLowerCase().includes(q.toLowerCase()) ||
    w.tracks.some(t => t.title.toLowerCase().includes(q.toLowerCase()))
  );

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'Unknown duration';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isAdmin = userProfile?.is_admin || userProfile?.is_super_admin || 
                  userProfile?.role === 'admin' || userProfile?.role === 'super-admin';

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
              to="/mus-240" 
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to MUS 240
            </Link>
          </div>

          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Music className="h-6 w-6 md:h-7 md:w-7 text-amber-300" />
              <span className="text-white/90 font-medium text-xl md:text-2xl lg:text-xl xl:text-2xl">Listening Hub</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold mb-4 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
              MUS 240 Listening
            </h1>
            
            <p className="text-lg md:text-xl lg:text-lg xl:text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-loose">
              Explore the rich tapestry of African American music through curated listening experiences, 
              from West African foundations to contemporary innovations.
            </p>
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

          {/* Tabbed Content */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/30">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="weekly-listening" className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Weekly Listening
                </TabsTrigger>
                <TabsTrigger value="ai-music" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Music
                </TabsTrigger>
                <TabsTrigger value="supplementary" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Supplementary
                </TabsTrigger>
              </TabsList>

              {/* Weekly Listening Tab */}
              <TabsContent value="weekly-listening">
                {/* Info Banner */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-900 text-sm">
                    <strong>Note:</strong> To submit your listening journals, go to{' '}
                    <Link to="/mus-240/assignments" className="underline font-semibold hover:text-blue-700">
                      Weekly Assignments
                    </Link>
                  </p>
                </div>

                {/* Results Counter */}
                {q && (
                  <div className="mb-6 text-center text-gray-700">
                    Found {items.length} result{items.length !== 1 ? 's' : ''} for "{q}"
                  </div>
                )}

                {/* Week Cards Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((week) => (
                    <div key={week.number} className="group">
                      <Card className="hover:shadow-xl transition-all duration-300 relative">
                        {/* Week Number Badge */}
                        <div className="absolute -top-3 -right-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                          {week.number}
                        </div>

                        <CardContent className="p-6">
                          {/* Date */}
                          <div className="flex items-center gap-2 text-gray-500 mb-3">
                            <Calendar className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
                            <time className="text-sm font-medium">
                              {new Date(week.date).toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </time>
                          </div>

                          {/* Title */}
                          <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-2xl xl:text-3xl font-semibold text-gray-900 mb-4 leading-tight">
                            {week.title}
                          </h3>

                          {/* Track Count */}
                          <div className="flex items-center gap-2 text-gray-500 mb-4">
                            <Play className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
                            <span className="text-sm">
                              {week.tracks.length} track{week.tracks.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2">
                            <Link 
                              to={`/classes/mus240/listening/${week.number}`}
                              className="flex items-center gap-2 text-gray-600 hover:text-amber-600 transition-colors"
                            >
                              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                                <Play className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-white" />
                              </div>
                              <span className="font-medium">Listen to Tracks</span>
                            </Link>
                            
                            <Link 
                              to="/mus-240/assignments"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <div className="p-2 bg-blue-500 rounded-lg">
                                <Music className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-white" />
                              </div>
                              <span className="font-medium">Submit Journal</span>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>

                {/* Empty State */}
                {items.length === 0 && q && (
                  <div className="text-center py-16">
                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 max-w-md mx-auto">
                      <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches found</h3>
                      <p className="text-gray-600">Try searching for different keywords or browse all weeks above.</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* AI Music Tab */}
              <TabsContent value="ai-music">
                <div className="space-y-6">
                  {/* Upload Section */}
                  {isAdmin && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Upload AI Music Files
                          </CardTitle>
                          <Button
                            onClick={() => setShowUpload(!showUpload)}
                            variant={showUpload ? "outline" : "default"}
                          >
                            {showUpload ? 'Hide Upload' : 'Show Upload'}
                          </Button>
                        </div>
                      </CardHeader>
                      {showUpload && (
                        <CardContent>
                          <AudioBulkUpload
                            category="ai-music"
                            onUploadComplete={() => {
                              refetchAiMusic();
                              setShowUpload(false);
                            }}
                          />
                        </CardContent>
                      )}
                    </Card>
                  )}

                  {/* Resources Grid */}
                  <div className="grid gap-4">
                    {aiMusicLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading AI music resources...</p>
                      </div>
                    ) : aiMusicResources.length === 0 ? (
                      <div className="text-center py-16">
                        <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No AI Music Resources</h3>
                        <p className="text-gray-600">
                          {isAdmin ? 'Upload some AI music files to get started.' : 'No AI music resources have been uploaded yet.'}
                        </p>
                      </div>
                    ) : (
                      aiMusicResources.map((resource) => (
                        <Card key={resource.id}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                  {resource.title}
                                </h3>
                                {resource.description && (
                                  <p className="text-gray-600 mb-4">{resource.description}</p>
                                )}
                                
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                  <Badge variant="secondary">{resource.category}</Badge>
                                  <span>{formatFileSize(resource.file_size)}</span>
                                  {resource.duration && (
                                    <span>{formatDuration(resource.duration)}</span>
                                  )}
                                  <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                                </div>

                                <audio 
                                  controls 
                                  className="w-full"
                                  src={getFileUrl(resource.file_path)}
                                >
                                  Your browser does not support the audio element.
                                </audio>
                              </div>

                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteResource(resource.id, resource.file_path)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Supplementary Tab */}
              <TabsContent value="supplementary">
                <div className="text-center py-16">
                  <Play className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Supplementary Materials</h3>
                  <p className="text-gray-600">Additional listening materials and resources will be added here.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </UniversalLayout>
  );
}