// Sharing is the product. A participant who shares three times raises more
// than one who writes a beautiful story, so this hands them finished text
// rather than a bare link and a blank compose window.
//
// Uses the native share sheet when the browser has one (every phone does,
// which is where these links actually get sent) and falls back to explicit
// SMS / email / copy actions on desktop.

import { useState } from 'react';
import { Copy, Mail, MessageSquare, Check, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  /** First-person when a participant is sharing their own page. */
  pitch: string;
}

export function ShareSheet({ open, onOpenChange, url, title, pitch }: Props) {
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState(`${pitch}\n\n${url}`);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — select the text and copy manually.');
    }
  }

  async function nativeShare() {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title, text: pitch, url });
    } catch {
      /* user dismissed the sheet — not an error */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share this fundraiser</DialogTitle>
          <DialogDescription>Edit the message, then send it to a few people who would want to help.</DialogDescription>
        </DialogHeader>

        <Textarea rows={5} value={text} onChange={e => setText(e.target.value)} className="text-sm" />

        <div className="grid gap-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button onClick={nativeShare} className="w-full">
              <Share2 className="w-4 h-4 mr-2" /> Share…
            </Button>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" asChild>
              <a href={`sms:?&body=${encodeURIComponent(text)}`}>
                <MessageSquare className="w-4 h-4 mr-1.5" /> Text
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`}>
                <Mail className="w-4 h-4 mr-1.5" /> Email
              </a>
            </Button>
            <Button variant="outline" onClick={copy}>
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
