import { useState, useEffect } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { Camera, Plus, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

interface Memory {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  graduation_year?: number;
  created_at: string;
  user_id: string;
}

export function MemoryLaneModule({ user, isFullPage }: ModuleProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMemory, setNewMemory] = useState({ title: '', content: '', image_url: '' });

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('alumnae_stories')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMemory = async () => {
    if (!newMemory.title || !newMemory.content) {
      toast.error('Please fill in title and content');
      return;
    }

    try {
      const { error } = await supabase
        .from('alumnae_stories')
        .insert({
          title: newMemory.title,
          content: newMemory.content,
          image_url: newMemory.image_url || null,
          user_id: user?.id,
          is_approved: false,
          is_featured: false
        });

      if (error) throw error;

      toast.success('Memory submitted for approval!');
      setIsDialogOpen(false);
      setNewMemory({ title: '', content: '', image_url: '' });
      fetchMemories();
    } catch (error) {
      console.error('Error submitting memory:', error);
      toast.error('Failed to submit memory');
    }
  };

  return (
    <ModuleWrapper
      title="Memory Lane"
      icon={Camera}
      headerActions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Share Memory
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share a Memory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newMemory.title}
                  onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                  placeholder="My favorite Glee Club memory..."
                />
              </div>
              <div>
                <Label htmlFor="content">Your Memory</Label>
                <Textarea
                  id="content"
                  value={newMemory.content}
                  onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                  placeholder="Tell us about this special moment..."
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="image">Image URL (optional)</Label>
                <Input
                  id="image"
                  value={newMemory.image_url}
                  onChange={(e) => setNewMemory({ ...newMemory, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <Button onClick={handleSubmitMemory} className="w-full">
                Submit Memory
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {memories.map((memory) => (
          <Card key={memory.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {memory.image_url && (
              <div className="aspect-video bg-muted">
                <img
                  src={memory.image_url}
                  alt={memory.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg">{memory.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                {memory.content}
              </p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">
                  {new Date(memory.created_at).toLocaleDateString()}
                </span>
                <Button variant="ghost" size="sm">
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {memories.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No memories shared yet. Be the first to share!</p>
          </div>
        )}
      </div>
    </ModuleWrapper>
  );
}

export default MemoryLaneModule;
