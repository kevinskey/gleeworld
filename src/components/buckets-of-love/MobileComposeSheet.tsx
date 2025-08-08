import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Heart, Send, Palette, Smile } from "lucide-react";
import { useBucketsOfLove } from "@/hooks/useBucketsOfLove";
import { useToast } from "@/components/ui/use-toast";

interface MobileComposeSheetProps {
  trigger?: React.ReactNode;
  onSent?: () => void;
}

export const MobileComposeSheet = ({ trigger, onSent }: MobileComposeSheetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [decorations, setDecorations] = useState('');
  const [noteColor, setNoteColor] = useState('pink');
  const [loading, setLoading] = useState(false);
  
  const { sendBucketOfLove } = useBucketsOfLove();
  const { toast } = useToast();

  const noteColors = [
    { value: 'pink', label: 'Pink', color: 'bg-pink-200' },
    { value: 'yellow', label: 'Yellow', color: 'bg-yellow-200' },
    { value: 'blue', label: 'Blue', color: 'bg-blue-200' },
    { value: 'green', label: 'Green', color: 'bg-green-200' },
    { value: 'purple', label: 'Purple', color: 'bg-purple-200' },
    { value: 'orange', label: 'Orange', color: 'bg-orange-200' },
  ];

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message to share",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await sendBucketOfLove(message, noteColor, isAnonymous);
      if (result.success) {
        toast({
          title: "Love sent! 💕",
          description: "Your message has been shared with the community",
        });
        
        // Reset form
        setMessage('');
        setIsAnonymous(false);
        setDecorations('');
        setNoteColor('pink');
        setIsOpen(false);
        onSent?.();
      } else {
        throw new Error(result.error || 'Failed to send');
      }
    } catch (error) {
      toast({
        title: "Failed to send",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button size="lg" className="w-full bg-pink-500 hover:bg-pink-600 text-white">
            <Heart className="h-4 w-4 mr-2" />
            Share Love & Encouragement
          </Button>
        )}
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-2 text-center">
            <Heart className="h-5 w-5 text-pink-500" />
            Send a Bucket of Love
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 h-full overflow-y-auto pb-20">
          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">Your message</Label>
            <Textarea
              id="message"
              placeholder="Share your love, encouragement, or appreciation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </div>
          </div>

          {/* Note Color */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Note Color
            </Label>
            <div className="grid grid-cols-6 gap-3">
              {noteColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNoteColor(color.value)}
                  className={`w-full aspect-square rounded-lg border-2 ${color.color} ${
                    noteColor === color.value ? 'border-foreground ring-2 ring-primary/20' : 'border-border'
                  } transition-all`}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Decorations */}
          <div className="space-y-2">
            <Label htmlFor="decorations" className="text-sm font-medium flex items-center gap-2">
              <Smile className="h-4 w-4" />
              Decorations (optional)
            </Label>
            <Input
              id="decorations"
              placeholder="💕 ✨ 🎵 💙 🌟"
              value={decorations}
              onChange={(e) => setDecorations(e.target.value)}
              className="text-center text-lg"
            />
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="anonymous" className="text-sm font-medium">Send anonymously</Label>
              <p className="text-xs text-muted-foreground">Your name won't be shown</p>
            </div>
            <Switch
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>
        </div>

        {/* Fixed bottom actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t border-border">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading || !message.trim()}
              className="flex-1 bg-pink-500 hover:bg-pink-600"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send Love'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};