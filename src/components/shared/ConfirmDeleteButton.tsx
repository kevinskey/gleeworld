// ConfirmDeleteButton — drop-in replacement for `window.confirm` patterns.
// Renders a small inline confirmation popover anchored to the trigger
// button (instead of the native browser confirm). Includes a "Don't ask
// me again" checkbox; once a user opts out of a given confirmation key,
// the action runs immediately without the popover next time. The opt-out
// is stored per-user in localStorage and can be reset from settings.
//
// Usage:
//   <ConfirmDeleteButton
//     confirmKey="delete-music-item"
//     title="Delete this score?"
//     description="This will remove the PDF and any linked annotations."
//     onConfirm={() => deleteScore(id)}
//   >
//     <Trash2 className="w-4 h-4" />
//   </ConfirmDeleteButton>

import { useState, type ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';

const STORAGE_PREFIX = 'gw_skip_confirm_';

function isSkipped(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(STORAGE_PREFIX + key) === '1'; }
  catch { return false; }
}

function setSkipped(key: string) {
  try { window.localStorage.setItem(STORAGE_PREFIX + key, '1'); }
  catch { /* ignore */ }
}

interface Props {
  /** Persistent key used to remember "Don't ask again" per action type. */
  confirmKey: string;
  /** Short headline shown in the popover. */
  title: string;
  /** One-line explanation of what will happen. */
  description?: string;
  /** Action to run when the user confirms (or when they've opted out). */
  onConfirm: () => void | Promise<void>;
  /** Trigger element — typically the destructive button's icon/label. */
  children: ReactNode;
  /** Class for the underlying trigger button. */
  className?: string;
  /** Override the destructive label (default "Delete"). */
  confirmLabel?: string;
  /** Disable the trigger. */
  disabled?: boolean;
  /** Optional ARIA label for the trigger. */
  ariaLabel?: string;
  /**
   * Whether the user may permanently opt out of this confirmation.
   * Default true. Pass false for actions whose cost is other people's data —
   * deleting an assignment cascades away every student's submission and
   * grade, and that is not something anyone should be able to silence
   * forever with one stray checkbox.
   */
  allowDontAskAgain?: boolean;
}

export function ConfirmDeleteButton({
  confirmKey, title, description, onConfirm, children,
  className, confirmLabel = 'Delete', disabled, ariaLabel,
  allowDontAskAgain = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);
  const [running, setRunning] = useState(false);

  const fire = async () => {
    setRunning(true);
    try {
      if (dontAsk && allowDontAskAgain) setSkipped(confirmKey);
      await onConfirm();
      setOpen(false);
    } finally {
      setRunning(false);
    }
  };

  const handleTrigger = () => {
    // A stored opt-out never applies when this action forbids opting out —
    // so turning the flag off also re-arms anyone who had already skipped it.
    if (allowDontAskAgain && isSkipped(confirmKey)) {
      // Opted out — run immediately.
      fire();
      return;
    }
    setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTrigger(); }}
          disabled={disabled}
          aria-label={ariaLabel}
          className={className}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-72 p-4">
        <div className="flex items-start gap-2 mb-3">
          <div className="w-8 h-8 rounded-md bg-rose-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold leading-snug">{title}</div>
            {description && (
              <div className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</div>
            )}
          </div>
        </div>
        {allowDontAskAgain && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-3 cursor-pointer">
            <Checkbox
              checked={dontAsk}
              onCheckedChange={(v) => setDontAsk(v === true)}
            />
            Don&apos;t ask me again for this action
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={running}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={fire} disabled={running}>
            {running ? '...' : confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
