import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Facebook, 
  Instagram, 
  Share2, 
  Copy, 
  Check,
  ExternalLink
} from 'lucide-react';

interface SharePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postContent: string;
  postMediaUrls?: string[];
  postId: string;
}

interface ShareDestination {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
}

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export function SharePostDialog({ 
  open, 
  onOpenChange, 
  postContent, 
  postMediaUrls = [],
  postId 
}: SharePostDialogProps) {
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/glee-lounge?post=${postId}`;
  const shareText = postContent.substring(0, 280);
  const hashtags = '#SpelmanGleeClub #GleeWorld #Spelman';

  const destinations: ShareDestination[] = [
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <Facebook className="w-5 h-5" />,
      color: 'bg-[#1877F2] hover:bg-[#166FE5]',
      available: true
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <Instagram className="w-5 h-5" />,
      color: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90',
      available: true
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: <TikTokIcon />,
      color: 'bg-black hover:bg-gray-900',
      available: true
    },
    {
      id: 'native',
      name: 'More Options',
      icon: <Share2 className="w-5 h-5" />,
      color: 'bg-primary hover:bg-primary/90',
      available: typeof navigator.share === 'function'
    }
  ];

  const toggleDestination = (id: string) => {
    setSelectedDestinations(prev => 
      prev.includes(id) 
        ? prev.filter(d => d !== id)
        : [...prev, id]
    );
  };

  const copyToClipboard = async () => {
    const fullText = `${shareText}\n\n${hashtags}\n\n${shareUrl}`;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Content copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(fbUrl, '_blank', 'width=600,height=400');
  };

  const shareToInstagram = async () => {
    // Instagram doesn't have a web share API, so we copy content and open Instagram
    await copyToClipboard();
    toast.info('Content copied! Opening Instagram...', {
      description: 'Paste the content in your Instagram post'
    });
    // Try to open Instagram app, fallback to web
    window.open('https://www.instagram.com/', '_blank');
  };

  const shareToTikTok = async () => {
    // TikTok doesn't have a web share API, so we copy content and open TikTok
    await copyToClipboard();
    toast.info('Content copied! Opening TikTok...', {
      description: 'Paste the content in your TikTok post'
    });
    window.open('https://www.tiktok.com/upload', '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Spelman Glee Club Post',
          text: `${shareText}\n\n${hashtags}`,
          url: shareUrl
        });
        toast.success('Shared successfully!');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    }
  };

  const handleShare = async () => {
    if (selectedDestinations.length === 0) {
      toast.error('Please select at least one destination');
      return;
    }

    setIsSharing(true);

    for (const dest of selectedDestinations) {
      switch (dest) {
        case 'facebook':
          shareToFacebook();
          break;
        case 'instagram':
          await shareToInstagram();
          break;
        case 'tiktok':
          await shareToTikTok();
          break;
        case 'native':
          await shareNative();
          break;
      }
      // Small delay between shares
      await new Promise(r => setTimeout(r, 500));
    }

    setIsSharing(false);
    toast.success('Sharing complete!');
    onOpenChange(false);
  };

  const handleQuickShare = async (destId: string) => {
    switch (destId) {
      case 'facebook':
        shareToFacebook();
        break;
      case 'instagram':
        await shareToInstagram();
        break;
      case 'tiktok':
        await shareToTikTok();
        break;
      case 'native':
        await shareNative();
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="p-3 bg-muted rounded border">
            <p className="text-sm line-clamp-3">{shareText}</p>
            <p className="text-xs text-muted-foreground mt-2">{hashtags}</p>
          </div>

          {/* Quick Share Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Share</p>
            <div className="grid grid-cols-2 gap-2">
              {destinations.filter(d => d.available).map(dest => (
                <Button
                  key={dest.id}
                  onClick={() => handleQuickShare(dest.id)}
                  className={`${dest.color} text-white`}
                >
                  {dest.icon}
                  <span className="ml-2">{dest.name}</span>
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              ))}
            </div>
          </div>

          {/* Copy Link */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Content & Link'}
            </Button>
          </div>

          {/* Multi-select Share */}
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Share to Multiple</p>
            <div className="space-y-2">
              {destinations.filter(d => d.available).map(dest => (
                <label
                  key={dest.id}
                  className="flex items-center gap-3 p-2 rounded border cursor-pointer hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedDestinations.includes(dest.id)}
                    onCheckedChange={() => toggleDestination(dest.id)}
                  />
                  <span className={`p-1.5 rounded ${dest.color} text-white`}>
                    {dest.icon}
                  </span>
                  <span className="text-sm">{dest.name}</span>
                </label>
              ))}
            </div>
            <Button
              onClick={handleShare}
              disabled={selectedDestinations.length === 0 || isSharing}
              className="w-full"
            >
              {isSharing ? 'Sharing...' : `Share to ${selectedDestinations.length} platform${selectedDestinations.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
