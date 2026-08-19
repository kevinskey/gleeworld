// Calendar subscription URLs — all houses, or one at a time. Uses the same
// gw_profiles.ical_feed_token the main GleeWorld calendar feed uses, so
// rotating that token there invalidates these subscriptions too.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AuctionSource } from '@/lib/auctions/types';

interface SubscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: AuctionSource[];
}

export function SubscribeDialog({ open, onOpenChange, sources }: SubscribeDialogProps) {
  const { user } = useAuth();
  const [scope, setScope] = useState('all');

  const { data: token, isLoading } = useQuery<string | null>({
    queryKey: ['auctions', 'feed-token', user?.id],
    enabled: Boolean(user?.id) && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('ical_feed_token')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.ical_feed_token as string) ?? null;
    },
  });

  const feedUrl = token
    ? `${SUPABASE_URL}/functions/v1/auctions-ics?token=${token}` +
      (scope === 'all' ? '' : `&source=${scope}`)
    : '';

  async function copy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed — select the address and copy it manually');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <div className="min-w-0">
          <DialogHeader>
            <DialogTitle>Subscribe to the auction calendar</DialogTitle>
            <DialogDescription>
              Paste this address into Google Calendar, Apple Calendar, or Outlook to see sale dates
              and catalog releases alongside the rest of your calendar. It stays up to date on its own.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="auction-feed-scope">Which houses</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger id="auction-feed-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All auction houses</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auction-feed-url">Calendar address</Label>
              <div className="flex gap-2">
                <Input
                  id="auction-feed-url"
                  readOnly
                  value={isLoading ? 'Loading…' : feedUrl || 'No calendar address available yet'}
                  className="text-xs font-mono min-w-0"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button variant="outline" onClick={copy} disabled={!feedUrl} className="shrink-0">
                  <Copy className="w-4 h-4 mr-2" /> Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Treat this address like a password — anyone who has it can see the calendar.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
