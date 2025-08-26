import { useParams, Link } from 'react-router-dom';
import { WEEKS } from '../../data/mus240Weeks';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ExternalLink, Play, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Helper function to extract video ID from YouTube URLs
const getVideoId = (url: string) => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
    if (urlObj.hostname.includes('youtube.com')) {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return videoId;
    }
    // Handle shortened URLs and other formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
  } catch {
    return null;
  }
  return null;
};

// Create education-friendly embed URL with privacy-enhanced mode
const createEmbedUrl = (videoId: string) => {
  const params = new URLSearchParams({
    autoplay: '0',
    rel: '0',
    modestbranding: '1',
    showinfo: '0',
    fs: '1',
    controls: '1',
    cc_load_policy: '1', // Show captions if available
    iv_load_policy: '3', // Hide video annotations
    playsinline: '1', // Better mobile experience
    origin: window.location.origin // Required for some embedded videos
  });
  // Use privacy-enhanced mode for better compatibility
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
};

// Check if video exists and is embeddable
const checkVideoAvailability = async (videoId: string): Promise<boolean> => {
  try {
    // Use oEmbed API to check if video is available and embeddable
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    return response.ok;
  } catch {
    return false;
  }
};


type Comment = { 
  id: string; 
  week: number; 
  track_index: number | null; 
  author: string | null; 
  content: string; 
  created_at: string; 
};

export default function WeekDetail() {
  console.log('WeekDetail component loading...');
  const { week } = useParams();
  const num = Number(week);
  const wk = WEEKS.find(w => w.number === num);
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [failedEmbeds, setFailedEmbeds] = useState<Set<number>>(new Set());
  const [videoAvailability, setVideoAvailability] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('smaam_comments')
        .select('*')
        .eq('week', num)
        .order('created_at', { ascending: false });
      if (!error && data) setComments(data as Comment[]);
    })();

    // Check video availability for all YouTube tracks
    if (wk) {
      const checkVideos = async () => {
        const availabilityMap = new Map<number, boolean>();
        for (let i = 0; i < wk.tracks.length; i++) {
          const track = wk.tracks[i];
          const isYouTube = track.url.includes('youtube.com') || track.url.includes('youtu.be');
          if (isYouTube) {
            const videoId = getVideoId(track.url);
            if (videoId) {
              const isAvailable = await checkVideoAvailability(videoId);
              availabilityMap.set(i, isAvailable);
            }
          }
        }
        setVideoAvailability(availabilityMap);
      };
      checkVideos();
    }
  }, [num, wk]);

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

  const handleEmbedError = (trackIndex: number) => {
    setFailedEmbeds(prev => new Set([...prev, trackIndex]));
  };

  if (!wk) {
    console.log('Week not found for number:', num);
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        <main className="max-w-5xl mx-auto p-4">
          <p>Week not found.</p>
          <Link to="/classes/mus240/listening" className="text-blue-600 hover:underline">← Back to Listening Hub</Link>
        </main>
      </UniversalLayout>
    );
  }

  console.log('Week found:', wk);
  console.log('Week tracks:', wk.tracks);
  console.log('Total tracks found for week', num, ':', wk.tracks.length);

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
            {wk.tracks.map((t, i) => {
              const isYouTube = t.url.includes('youtube.com') || t.url.includes('youtu.be');
              const videoId = getVideoId(t.url);
              const embedUrl = videoId ? createEmbedUrl(videoId) : null;
              const embedFailed = failedEmbeds.has(i);
              const videoIsAvailable = videoAvailability.get(i) !== false; // Default to true if not checked yet
              
              console.log(`Track ${i}:`, { 
                title: t.title, 
                url: t.url, 
                isYouTube, 
                videoId, 
                embedUrl, 
                embedFailed,
                videoIsAvailable
              });
              
              return (
                <li key={i} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.source}</div>
                    </div>
                    <a 
                      href={t.url} 
                      target="_blank" 
                      rel="noopener" 
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open on {t.source}
                    </a>
                  </div>

                  {/* YouTube embed with enhanced handling */}
                  {isYouTube && videoId && videoIsAvailable && (
                    <div className="mb-3">
                      {!embedFailed ? (
                        <div className="relative">
                          <iframe
                            src={embedUrl}
                            title={t.title}
                            className="w-full aspect-video rounded-lg"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            onError={() => handleEmbedError(i)}
                            onLoad={(e) => {
                              // Check if iframe loaded successfully
                              const iframe = e.currentTarget;
                              try {
                                // If we can't access contentDocument, it likely means blocked
                                if (!iframe.contentDocument && !iframe.contentWindow) {
                                  handleEmbedError(i);
                                }
                              } catch {
                                // Cross-origin restrictions, but video might still work
                              }
                            }}
                          />
                          {/* Fallback detection overlay */}
                          <div 
                            className="absolute inset-0 pointer-events-none"
                            onError={() => handleEmbedError(i)}
                          />
                        </div>
                      ) : (
                        /* Fallback to thumbnail with modal player */
                        <div className="relative group">
                          <div 
                            className="cursor-pointer relative"
                            onClick={() => {
                              // Try to open in a modal or new window optimized for playback
                              const newWindow = window.open(
                                `https://www.youtube.com/embed/${videoId}?autoplay=1&origin=${window.location.origin}`,
                                'youtube-player',
                                'width=800,height=450,scrollbars=yes,resizable=yes'
                              );
                              if (!newWindow) {
                                // Fallback to direct YouTube link
                                window.open(t.url, '_blank');
                              }
                            }}
                          >
                            <img 
                              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                              alt={t.title}
                              className="w-full aspect-video object-cover rounded-lg"
                              onError={(e) => {
                                e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors rounded-lg">
                              <div className="bg-red-600 text-white p-4 rounded-full group-hover:scale-110 transition-transform shadow-lg">
                                <Play className="h-8 w-8 ml-1" />
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg">
                              <p className="text-white font-medium">Click to play video</p>
                              <p className="text-white/80 text-sm">{t.title}</p>
                            </div>
                          </div>
                          
                          <Alert className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              This video cannot be embedded due to YouTube restrictions. Click the thumbnail to open in a popup player.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show notice for unavailable videos */}
                  {isYouTube && videoId && !videoIsAvailable && (
                    <Alert className="mb-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This video is not available for embedding, but you can still watch it on YouTube by clicking the "Open on YouTube" button above.
                      </AlertDescription>
                    </Alert>
                  )}


                  <TrackCommentBox onPost={(a, c) => post(i, a, c)} />
                  <CommentList items={comments.filter(c => c.track_index === i)} label={`Track ${i + 1}`} />
                </li>
              );
            })}
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