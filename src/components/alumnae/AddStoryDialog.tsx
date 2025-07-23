import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

interface AddStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryAdded: () => void;
}

export const AddStoryDialog = ({ open, onOpenChange, onStoryAdded }: AddStoryDialogProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to add a story");
        return;
      }

      const { error } = await supabase
        .from("alumnae_stories")
        .insert({
          title,
          content,
          graduation_year: graduationYear ? parseInt(graduationYear) : null,
          user_id: user.id,
          is_approved: false, // Stories need admin approval
        });

      if (error) throw error;

      toast.success("Your story has been submitted for review!");
      setTitle("");
      setContent("");
      setGraduationYear("");
      onOpenChange(false);
      onStoryAdded();
    } catch (error) {
      console.error("Error adding story:", error);
      toast.error("Failed to submit your story. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Share Your Story
          </DialogTitle>
          <DialogDescription>
            Share your Spelman Glee Club experience with future generations. Stories are reviewed before being published.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Story Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your story a meaningful title..."
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="graduation-year">Graduation Year (Optional)</Label>
              <Input
                id="graduation-year"
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="e.g., 2020"
                min="1881"
                max={new Date().getFullYear() + 10}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Your Story</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tell us about your time in the Glee Club, memorable performances, friendships made, or how the experience shaped you..."
                className="min-h-[120px]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Story"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};