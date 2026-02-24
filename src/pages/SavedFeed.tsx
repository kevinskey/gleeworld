import { useState } from 'react';
import { Heart, Bookmark, ExternalLink, Trash2, Newspaper, GraduationCap } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useFeedSaves } from '@/hooks/useFeedSaves';
import { useAuth } from '@/contexts/AuthContext';

const SavedFeed = () => {
  const { user } = useAuth();
  const { getAllSaves, removeSave, isLiked, toggleLike, loading } = useFeedSaves();
  const [tab, setTab] = useState('all');

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please sign in to view your saved feed.</p>
      </div>
    );
  }

  const allSaves = getAllSaves();
  const filtered = tab === 'all' ? allSaves
    : tab === 'news' ? allSaves.filter(s => s.feed_type === 'news')
    : tab === 'scholarships' ? allSaves.filter(s => s.feed_type === 'scholarship')
    : allSaves.filter(s => s.is_liked);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Saved Feed</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({allSaves.length})</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="scholarships">Scholarships</TabsTrigger>
          <TabsTrigger value="liked">Liked</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {[1,2,3].map(i => <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No saved items yet. Bookmark news or scholarships from your dashboard!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {filtered.map(item => (
                <div key={item.link} className="rounded-lg border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {item.image_url ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      <img src={item.image_url} alt="" className="w-full h-36 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </a>
                  ) : (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="w-full h-36 bg-muted flex items-center justify-center block">
                      {item.feed_type === 'news' ? <Newspaper className="h-10 w-10 text-muted-foreground/30" /> : <GraduationCap className="h-10 w-10 text-muted-foreground/30" />}
                    </a>
                  )}
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">{item.source_icon}</span>
                      <span className="text-xs text-muted-foreground">{item.source}</span>
                      <span className="ml-auto text-xs capitalize px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {item.feed_type}
                      </span>
                    </div>
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium line-clamp-2 hover:underline block">
                      {item.title}
                    </a>
                    {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => toggleLike(item.feed_type, { title: item.title, link: item.link, description: item.description || '', source: item.source || '', sourceIcon: item.source_icon || '', imageUrl: item.image_url, pubDate: item.pub_date || '' })}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isLiked(item.link) ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="ml-auto">
                        <Button variant="ghost" size="sm" className="h-7 px-2"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </a>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => removeSave(item.link)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SavedFeed;
