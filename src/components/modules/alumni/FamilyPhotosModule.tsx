import { useState, useEffect } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { Heart, Plus, Camera, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

interface FamilyPhoto {
  id: string;
  title: string;
  description: string;
  image_url: string;
  author_name: string;
  author_image?: string;
  created_at: string;
  likes: number;
}

export function FamilyPhotosModule({ user, isFullPage }: ModuleProps) {
  const [photos, setPhotos] = useState<FamilyPhoto[]>([
    {
      id: '1',
      title: 'Little Gleelettes!',
      description: 'My daughters singing along to the Christmas Carol recording',
      image_url: 'https://images.unsplash.com/photo-1484665754804-74b091211472?w=800',
      author_name: 'Sarah J. \'08',
      author_image: '',
      created_at: '2024-12-15',
      likes: 24
    },
    {
      id: '2',
      title: 'Three Generations of Glee',
      description: 'Mom, me, and my daughter - all Spelman Glee Club!',
      image_url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
      author_name: 'Michelle T. \'95',
      author_image: '',
      created_at: '2024-11-28',
      likes: 67
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPhoto, setNewPhoto] = useState({ title: '', description: '', image_url: '' });

  const handleSubmitPhoto = () => {
    if (!newPhoto.title || !newPhoto.image_url) {
      toast.error('Please add a title and image URL');
      return;
    }

    const photo: FamilyPhoto = {
      id: Date.now().toString(),
      title: newPhoto.title,
      description: newPhoto.description,
      image_url: newPhoto.image_url,
      author_name: user?.full_name || 'Anonymous',
      created_at: new Date().toISOString(),
      likes: 0
    };

    setPhotos([photo, ...photos]);
    toast.success('Photo shared with the community!');
    setIsDialogOpen(false);
    setNewPhoto({ title: '', description: '', image_url: '' });
  };

  const handleLike = (photoId: string) => {
    setPhotos(photos.map(p => 
      p.id === photoId ? { ...p, likes: p.likes + 1 } : p
    ));
  };

  return (
    <ModuleWrapper
      title="Family & Kids"
      icon={Users}
      headerActions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Share Photo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share a Family Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newPhoto.title}
                  onChange={(e) => setNewPhoto({ ...newPhoto, title: e.target.value })}
                  placeholder="My little singer..."
                />
              </div>
              <div>
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  value={newPhoto.image_url}
                  onChange={(e) => setNewPhoto({ ...newPhoto, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="description">Caption (optional)</Label>
                <Textarea
                  id="description"
                  value={newPhoto.description}
                  onChange={(e) => setNewPhoto({ ...newPhoto, description: e.target.value })}
                  placeholder="Tell us about this moment..."
                  rows={3}
                />
              </div>
              <Button onClick={handleSubmitPhoto} className="w-full">
                Share Photo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="flex gap-4 flex-wrap">
          <Badge variant="outline" className="py-2 px-4 gap-2">
            <Camera className="h-4 w-4" />
            {photos.length} photos shared
          </Badge>
          <Badge variant="outline" className="py-2 px-4 gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            {photos.reduce((sum, p) => sum + p.likes, 0)} total likes
          </Badge>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group">
              <div className="aspect-square relative bg-muted">
                <img
                  src={photo.image_url}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={photo.author_image} />
                    <AvatarFallback>{photo.author_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{photo.title}</h3>
                    <p className="text-xs text-muted-foreground">{photo.author_name}</p>
                  </div>
                </div>
                {photo.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{photo.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1.5 text-muted-foreground hover:text-rose-500"
                    onClick={() => handleLike(photo.id)}
                  >
                    <Heart className="h-4 w-4" />
                    {photo.likes}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {new Date(photo.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No family photos shared yet. Be the first!</p>
          </div>
        )}
      </div>
    </ModuleWrapper>
  );
}

export default FamilyPhotosModule;
