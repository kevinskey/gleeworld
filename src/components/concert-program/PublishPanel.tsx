// Publish panel — validation blockers with click-to-jump fixes, the
// approval checkbox, real QR generation, and the footer-QR toggle.
// Spec: "Publish, QR, public page" (2026-08-17-concert-program-rebuild).
//
// Pure controlled component: every piece of state that outlives a single
// render (program, validation, publishing, footerShowQr) is a prop the
// page owns. The only local state is the approval checkbox (reset per
// open by design — re-confirm every time the panel is reopened) and the
// QR data URL generated here for the "program is live" view.
import { useEffect, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { ValidateResult } from '@/lib/concertPlanner/validate';
import type { ValidationItem } from '@/lib/concertPlanner/types';
import type { ConcertProgram } from '@/hooks/useConcertPrograms';

export interface PublishPanelProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  validation: ValidateResult;
  program: ConcertProgram;
  onJumpToPiece(pieceId: string): void;
  onPublish(): Promise<void>;
  onUnpublish(): Promise<void>;
  publishing: boolean;
  footerShowQr: boolean;
  onToggleFooterQr(v: boolean): void;
}

// Blocker/warning ids are `rights-<pieceId>`, `rights-info-<pieceId>`,
// `rep-composer-<pieceId>`, or `rep-arranger-<pieceId>` — every other id
// (meta-core, rep-empty, roster-empties, timing-*) has no single piece to
// jump to. "rights-info" is tried before the bare "rights" prefix so it
// isn't swallowed by it.
function pieceIdFromItemId(id: string): string | null {
  const m = id.match(/^(rights-info|rights|rep-composer|rep-arranger)-(.+)$/);
  return m ? m[2] : null;
}

function FooterQrToggle({
  disabled, checked, onToggle,
}: { disabled: boolean; checked: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5">
      <div className="min-w-0">
        <Label htmlFor="footer-qr-toggle" className="text-xs font-medium">Show QR in program footer</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          {disabled
            ? 'Publish first — an unpublished QR would encode a dead URL'
            : 'Prints on every page, linking to the public program.'}
        </p>
      </div>
      <Switch id="footer-qr-toggle" checked={checked} disabled={disabled} onCheckedChange={onToggle} />
    </div>
  );
}

function BlockerRow({ item, onFix }: { item: ValidationItem; onFix: (id: string) => void }) {
  const pieceId = pieceIdFromItemId(item.id);
  return (
    <li className="flex items-start justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{item.message}</span>
      {pieceId ? (
        <Button
          type="button" variant="outline" size="sm" className="h-6 px-2 text-xs shrink-0"
          onClick={() => onFix(item.id)}
        >
          Fix
        </Button>
      ) : null}
    </li>
  );
}

export function PublishPanel({
  open, onOpenChange, validation, program, onJumpToPiece,
  onPublish, onUnpublish, publishing, footerShowQr, onToggleFooterQr,
}: PublishPanelProps) {
  const [hasApproval, setHasApproval] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const isPublished = !!program.published_at;
  const publicUrl = program.published_slug
    ? `${window.location.origin}/program/${program.published_slug}`
    : null;

  // Re-generate whenever the panel has something new to publish a QR
  // for — never while unpublished (the URL wouldn't resolve yet).
  useEffect(() => {
    if (!isPublished || !publicUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(publicUrl, { width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [isPublished, publicUrl]);

  const requiredItems = validation.items.filter((i) => i.level === 'required');
  const warningItems = validation.items.filter((i) => i.level === 'warning');
  const rightsRequired = requiredItems.filter((i) => i.category === 'rights');
  const otherRequired = requiredItems.filter((i) => i.category !== 'rights');

  const canPublish = !validation.hasRequiredFixes && hasApproval;

  const handleFix = (itemId: string) => {
    const pieceId = pieceIdFromItemId(itemId);
    if (pieceId) onJumpToPiece(pieceId);
  };

  const handlePublishClick = () => {
    if (!canPublish || publishing) return;
    void onPublish();
  };

  const handleUnpublishClick = () => {
    if (!confirm('Take the public program offline?')) return;
    void onUnpublish();
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast.success('Public URL copied');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isPublished ? 'Program is live' : 'Publish program'}</DialogTitle>
          <DialogDescription>
            {isPublished
              ? 'Anyone with the link can view the public program page.'
              : 'Review the checklist below, then confirm to post this program to a public URL.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isPublished ? (
            <div className="text-center space-y-3">
              <div className="bg-muted rounded-xl p-4 inline-flex items-center justify-center min-h-[9rem] min-w-[9rem]">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR code linking to the public program" className="w-40 h-40" />
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground break-all">{publicUrl}</div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={handleCopy}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy URL
                </Button>
                {qrDataUrl ? (
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <a href={qrDataUrl} download="program-qr.png">
                      <Download className="w-3.5 h-3.5 mr-1" /> Download QR
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              {requiredItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-destructive uppercase tracking-wide">
                    Before you publish
                  </div>
                  {rightsRequired.length > 0 ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 space-y-1.5">
                      <div className="text-xs font-medium text-destructive">
                        {rightsRequired.length} piece{rightsRequired.length === 1 ? '' : 's'} missing rights status
                      </div>
                      <ul className="space-y-1.5">
                        {rightsRequired.map((item) => (
                          <BlockerRow key={item.id} item={item} onFix={handleFix} />
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {otherRequired.length > 0 ? (
                    <ul className="space-y-1.5">
                      {otherRequired.map((item) => (
                        <li
                          key={item.id}
                          className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5"
                        >
                          <BlockerRow item={item} onFix={handleFix} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <div className="text-xs text-emerald-700 bg-emerald-50 rounded-md p-2.5">
                  No blockers — ready to publish once you check the box below.
                </div>
              )}

              {warningItems.length > 0 ? (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground font-medium select-none">
                    {warningItems.length} warning{warningItems.length === 1 ? '' : 's'} — won&apos;t block publish
                  </summary>
                  <ul className="mt-2 space-y-1.5 pl-1">
                    {warningItems.map((item) => (
                      <BlockerRow key={item.id} item={item} onFix={handleFix} />
                    ))}
                  </ul>
                </details>
              ) : null}

              <div className="flex items-start gap-2">
                <Checkbox
                  id="publish-approval"
                  checked={hasApproval}
                  onCheckedChange={(v) => setHasApproval(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="publish-approval" className="text-xs font-normal leading-snug cursor-pointer">
                  I&apos;ve reviewed every piece&apos;s composer, arranger, rights status, and the roster.
                </Label>
              </div>
            </>
          )}

          <FooterQrToggle disabled={!isPublished} checked={footerShowQr} onToggle={onToggleFooterQr} />

          {isPublished ? (
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleUnpublishClick}>
              Unpublish
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full"
              disabled={!canPublish || publishing}
              onClick={handlePublishClick}
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
