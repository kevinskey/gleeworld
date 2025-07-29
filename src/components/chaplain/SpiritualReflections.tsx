import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Book, Heart, Star } from "lucide-react";
import { toast } from "sonner";

export const SpiritualReflections = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock data for now
  const reflections = [
    {
      id: "1",
      title: "Finding Harmony in Unity",
      content: "As we prepare for our upcoming concert, let us remember that our voices unite not just in melody, but in purpose. Each note we sing carries our collective spirit, and every harmony we create reflects the divine harmony within our community.\n\nMay we approach each rehearsal with gratitude for the gift of music and the blessing of singing together as one voice, one heart, one soul.",
      scripture_reference: "Psalm 133:1",
      reflection_type: "daily_devotional",
      is_featured: true,
      created_at: "2024-07-30T10:00:00Z"
    },
    {
      id: "2",
      title: "Strength in Challenge",
      content: "When the music becomes difficult and our voices grow weary, remember that our strength comes from something greater than ourselves. Let us lean on each other and find courage in our shared purpose.",
      scripture_reference: "Isaiah 40:31",
      reflection_type: "weekly_message",
      is_featured: false,
      created_at: "2024-07-28T08:00:00Z"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Spiritual reflection created successfully');
    setIsDialogOpen(false);
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
                <Input placeholder="Enter reflection title" required />
              </div>
              <div>
                <label className="text-sm font-medium">Scripture Reference (Optional)</label>
                <Input placeholder="e.g., John 3:16, Psalm 23:1-6" />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select className="w-full p-2 border rounded-md">
                  <option value="daily_devotional">Daily Devotional</option>
                  <option value="weekly_message">Weekly Message</option>
                  <option value="prayer">Prayer</option>
                  <option value="scripture_study">Scripture Study</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Write your spiritual reflection..."
                  rows={8}
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
        {reflections.map((reflection) => (
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
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getReflectionTypeColor(reflection.reflection_type)}>
                      {reflection.reflection_type.replace('_', ' ')}
                    </Badge>
                    {reflection.scripture_reference && (
                      <Badge variant="outline">
                        <Heart className="h-3 w-3 mr-1" />
                        {reflection.scripture_reference}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Star className={`h-4 w-4 ${reflection.is_featured ? 'fill-primary text-primary' : ''}`} />
                </Button>
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
              <div className="mt-4 text-xs text-muted-foreground">
                Posted on {new Date(reflection.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};