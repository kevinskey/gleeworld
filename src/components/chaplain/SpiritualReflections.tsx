import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Book, Heart, Star, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { useSpiritualReflections } from "@/hooks/useSpiritualReflections";
import { useAuth } from "@/contexts/AuthContext";

export const SpiritualReflections = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    scripture_reference: '',
    reflection_type: 'daily_devotional',
    is_featured: false
  });
  
  const { user } = useAuth();
  const { 
    reflections, 
    loading, 
    createReflection, 
    updateReflection, 
    toggleShare, 
    deleteReflection 
  } = useSpiritualReflections();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      await createReflection({
        ...formData,
        created_by: user.id,
        is_shared_to_members: false,
        is_featured: formData.is_featured
      });
      
      setFormData({
        title: '',
        content: '',
        scripture_reference: '',
        reflection_type: 'daily_devotional',
        is_featured: false
      });
      setIsDialogOpen(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleToggleShare = async (id: string, currentStatus?: boolean) => {
    try {
      await toggleShare(id, currentStatus || false);
      toast.success(currentStatus ? 'Reflection removed from member dashboard' : 'Reflection shared to member dashboard');
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleToggleFeatured = async (id: string, currentStatus?: boolean) => {
    try {
      await updateReflection(id, { is_featured: !currentStatus });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const getReflectionTypeColor = (type: string) => {
    switch (type) {
      case 'daily_devotional': return 'bg-blue-100 text-blue-800';
      case 'weekly_message': return 'bg-green-100 text-green-800';
      case 'prayer': return 'bg-purple-100 text-purple-800';
      case 'scripture_study': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Spiritual Reflections</h3>
          <p className="text-sm text-muted-foreground">Share daily devotionals and spiritual insights</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Reflection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Spiritual Reflection</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input 
                  placeholder="Enter reflection title" 
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Scripture Reference (Optional)</label>
                <Input 
                  placeholder="e.g., John 3:16, Psalm 23:1-6" 
                  value={formData.scripture_reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, scripture_reference: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select 
                  value={formData.reflection_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, reflection_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_devotional">Daily Devotional</SelectItem>
                    <SelectItem value="weekly_message">Weekly Message</SelectItem>
                    <SelectItem value="prayer">Prayer</SelectItem>
                    <SelectItem value="scripture_study">Scripture Study</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Write your spiritual reflection..."
                  rows={8}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Reflection</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : reflections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Book className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No reflections yet</h3>
              <p className="text-muted-foreground text-center">
                Create your first spiritual reflection to share with the Glee Club members.
              </p>
            </CardContent>
          </Card>
        ) : (
          reflections.map((reflection) => (
            <Card key={reflection.id} className={reflection.is_featured ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <Book className="h-5 w-5" />
                        {reflection.title}
                      </CardTitle>
                      {reflection.is_featured && (
                        <Star className="h-4 w-4 fill-primary text-primary" />
                      )}
                      {reflection.is_shared_to_members && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Users className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getReflectionTypeColor(reflection.reflection_type || 'daily_devotional')}>
                        {(reflection.reflection_type || 'daily_devotional').replace('_', ' ')}
                      </Badge>
                      {reflection.scripture_reference && (
                        <Badge variant="outline">
                          <Heart className="h-3 w-3 mr-1" />
                          {reflection.scripture_reference}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleToggleShare(reflection.id, reflection.is_shared_to_members)}
                      className={reflection.is_shared_to_members ? "text-green-600" : ""}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleToggleFeatured(reflection.id, reflection.is_featured)}
                    >
                      <Star className={`h-4 w-4 ${reflection.is_featured ? 'fill-primary text-primary' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {reflection.content.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-2 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Posted on {new Date(reflection.created_at).toLocaleDateString()}</span>
                  {reflection.shared_at && (
                    <span>Shared on {new Date(reflection.shared_at).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};