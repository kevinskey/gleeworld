import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Music, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Track {
  id: number;
  title: string;
  artist: string;
  artwork: string | null;
  url: string;
  duration_ms: number;
}

export default function SoundCloudSearch() {
  const [query, setQuery] = useState("Spelman choir");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('soundcloud-search', {
        body: { q: query }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setTracks([]);
      } else {
        setTracks(data.tracks || []);
        if (data.tracks?.length === 0) {
          toast.info("No tracks found. Try another search.");
        }
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error("Failed to search SoundCloud");
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Music className="h-8 w-8 text-primary" />
          SoundCloud Search
        </h1>
        <p className="text-muted-foreground">
          Search for tracks on SoundCloud to discover music and audio content
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          type="text"
          placeholder="Search SoundCloud..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          <Search className="h-4 w-4 mr-2" />
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      {tracks.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Music className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p>No tracks found. Try searching for something!</p>
        </div>
      )}

      <div className="space-y-3">
        {tracks.map((track) => (
          <Card key={track.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {track.artwork ? (
                  <img
                    src={track.artwork}
                    alt={track.title}
                    className="w-16 h-16 rounded object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                    <Music className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{track.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                  {track.duration_ms > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDuration(track.duration_ms)}
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={track.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open on SoundCloud
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
