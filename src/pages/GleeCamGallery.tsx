import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  thumbnail_url?: string | null;
  created_at: string;
  title?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export default function GleeCamGallery() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!categorySlug) return;

      // Fetch category
      const { data: catData } = await supabase
        .from('glee_cam_categories')
        .select('*')
        .eq('slug', categorySlug)
        .single();

      if (catData) {
        setCategory(catData);

        // Fetch media for this category
        const { data: mediaData } = await supabase
          .from('gw_media_library')
          .select('*')
          .eq('glee_cam_category_id', catData.id)
          .order('created_at', { ascending: false });

        setItems(mediaData || []);
      }
      setLoading(false);
    };

    fetchData();
  }, [categorySlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Category not found</p>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
            {category.description && (
              <p className="text-sm text-muted-foreground">{category.description}</p>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No media in this category yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((item) => {
              const isVideo = item.file_type?.startsWith('video');
              return (
                <Card
                  key={item.id}
                  className="aspect-square overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => setSelectedItem(item)}
                >
                  {isVideo ? (
                    <div className="relative w-full h-full">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title || 'Video'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Play className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-10 w-10 text-white" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={item.file_url}
                      alt={item.title || 'Image'}
                      className="w-full h-full object-cover"
                    />
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedItem && (
            selectedItem.file_type?.startsWith('video') ? (
              <video
                src={selectedItem.file_url}
                controls
                autoPlay
                className="w-full max-h-[80vh]"
              />
            ) : (
              <img
                src={selectedItem.file_url}
                alt={selectedItem.title || 'Image'}
                className="w-full max-h-[80vh] object-contain"
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
