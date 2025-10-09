import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, X, Loader2 } from 'lucide-react';
import { useAnnotationSharing } from '@/hooks/useAnnotationSharing';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface AnnotationShareButtonProps {
  annotationIds: string[];
  musicTitle?: string;
}

export const AnnotationShareButton = ({ annotationIds, musicTitle }: AnnotationShareButtonProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [shares, setShares] = useState<any[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const { loading, shareAnnotation, unshareAnnotation, getAnnotationShares } = useAnnotationSharing();

  const loadShares = async () => {
    if (annotationIds.length === 0) return;
    
    setLoadingShares(true);
    try {
      // Get shares for all annotations
      const allShares = await Promise.all(
        annotationIds.map(id => getAnnotationShares(id))
      );
      
      // Flatten and deduplicate by user
      const uniqueShares = allShares.flat().reduce((acc, share) => {
        if (!acc.find(s => s.shared_with === share.shared_with)) {
          acc.push(share);
        }
        return acc;
      }, [] as any[]);
      
      // Get user profiles for each share
      const sharesWithProfiles = await Promise.all(
        uniqueShares.map(async (share) => {
          const { data } = await supabase
            .from('gw_profiles')
            .select('full_name, email')
            .eq('user_id', share.shared_with)
            .single();
          
          return { ...share, profile: data };
        })
      );
      
      setShares(sharesWithProfiles);
    } catch (error) {
      console.error('Error loading shares:', error);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleShare = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Look up user by email
    const { data: profile } = await supabase
      .from('gw_profiles')
      .select('user_id')
      .eq('email', email.trim())
      .single();

    if (!profile) {
      toast.error('User not found');
      return;
    }

    // Share all annotations
    const results = await Promise.all(
      annotationIds.map(id => shareAnnotation(id, profile.user_id))
    );

    if (results.every(r => r !== null)) {
      setEmail('');
      loadShares();
    }
  };

  const handleUnshare = async (shareId: string) => {
    const success = await unshareAnnotation(shareId);
    if (success) {
      loadShares();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) loadShares();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-1.5 sm:h-8 sm:px-2">
          <span className="text-xs">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Annotations</DialogTitle>
          <DialogDescription>
            Share your annotations for {musicTitle || 'this music'} with other users
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Share input */}
          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleShare()}
              />
              <Button onClick={handleShare} disabled={loading || !email.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Share'}
              </Button>
            </div>
          </div>

          {/* Current shares */}
          <div className="space-y-2">
            <Label>Shared With</Label>
            {loadingShares ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Not shared with anyone yet
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {share.profile?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {share.profile?.email}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnshare(share.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
