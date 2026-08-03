// "Report a Bug" — avatar-menu item. Deliberately tiny surface: one
// textarea, an optional screenshot, send. Context the developer needs
// (page URL, tenant, user, browser) is attached automatically so the
// reporter never has to think about it. Delivery rides the existing
// gw-send-email edge fn (Resend, attachments supported).
import { useCallback, useRef, useState } from 'react';
import { Bug, ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const BUG_REPORT_TO = 'kpj64110@gmail.com';
const MAX_SHOT_BYTES = 5 * 1024 * 1024; // Resend attachment comfort zone

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function ReportBugDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [shot, setShot] = useState<{ file: File; preview: string } | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setDescription('');
    if (shot) URL.revokeObjectURL(shot.preview);
    setShot(null);
  }, [shot]);

  const pickShot = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Screenshots must be an image file.'); return; }
    if (file.size > MAX_SHOT_BYTES) { toast.error('That image is over 5 MB — try a smaller screenshot.'); return; }
    if (shot) URL.revokeObjectURL(shot.preview);
    setShot({ file, preview: URL.createObjectURL(file) });
  };

  const submit = async () => {
    const text = description.trim();
    if (!text) { toast.error('Tell me what went wrong first.'); return; }
    setSending(true);
    try {
      let attachments: Array<{ filename: string; content: string; contentType?: string }> | undefined;
      if (shot) {
        const buf = new Uint8Array(await shot.file.arrayBuffer());
        // Chunked btoa — String.fromCharCode(...4MB) blows the arg limit.
        let binary = '';
        for (let i = 0; i < buf.length; i += 0x8000) {
          binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        }
        attachments = [{
          filename: shot.file.name || 'screenshot.png',
          content: btoa(binary),
          contentType: shot.file.type,
        }];
      }
      const tenant = getTenantSlug() ?? 'main';
      const html = [
        `<h2>🐛 Bug report — ${escapeHtml(tenant)}</h2>`,
        `<p style="white-space:pre-wrap">${escapeHtml(text)}</p>`,
        '<hr/>',
        `<p><b>From:</b> ${escapeHtml(user?.email ?? 'unknown')} (${escapeHtml(user?.id ?? '')})</p>`,
        `<p><b>Page:</b> ${escapeHtml(window.location.href)}</p>`,
        `<p><b>Browser:</b> ${escapeHtml(navigator.userAgent)}</p>`,
        `<p><b>Screen:</b> ${window.innerWidth}×${window.innerHeight}</p>`,
        `<p><b>When:</b> ${new Date().toISOString()}</p>`,
      ].join('\n');
      const { data, error } = await supabase.functions.invoke('gw-send-email', {
        body: {
          to: BUG_REPORT_TO,
          subject: `🐛 Bug report — ${tenant} — ${text.slice(0, 60)}`,
          html,
          replyTo: user?.email || undefined,
          attachments,
        },
      });
      if (error || data?.success === false) throw new Error(error?.message ?? data?.error ?? 'send failed');
      toast.success("Sent — thank you! Kevin's on it.");
      reset();
      onClose();
    } catch (e) {
      console.warn('[ReportBugDialog] send failed:', e);
      toast.error("Couldn't send the report. Please try again in a moment.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !sending) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-primary" /> Report a bug
          </DialogTitle>
          <DialogDescription>
            Tell us what went wrong — the page you're on and your browser info are included automatically.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened? What did you expect instead?"
          rows={5}
          autoFocus
          disabled={sending}
        />
        {shot ? (
          <div className="relative w-fit">
            <img src={shot.preview} alt="Screenshot preview" className="max-h-36 rounded-md border border-border" />
            <button
              type="button"
              aria-label="Remove screenshot"
              onClick={() => { URL.revokeObjectURL(shot.preview); setShot(null); }}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border shadow flex items-center justify-center hover:bg-muted"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ImagePlus className="w-4 h-4" /> Add a screenshot (optional)
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { pickShot(e.target.files?.[0]); e.target.value = ''; }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => { if (!sending) { reset(); onClose(); } }} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={sending || !description.trim()}>
            {sending ? (<><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Sending…</>) : 'Send report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
