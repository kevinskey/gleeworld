import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Send,
  RefreshCw,
  XCircle,
  ExternalLink,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  UserX,
  Mail,
} from 'lucide-react';
import type { PermissionSlip } from '@/hooks/usePermissionSlips';

interface SlipStatusBadgeProps {
  slip: PermissionSlip | null;
  guardianCount: number;
  k12Enabled: boolean;
  onSend: () => Promise<void>;
  onRevoke: () => Promise<void>;
  onViewSigned: () => Promise<void>;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SlipStatusBadge({
  slip,
  guardianCount,
  k12Enabled,
  onSend,
  onRevoke,
  onViewSigned,
}: SlipStatusBadgeProps) {
  const [sending, setSending] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  // K-12 flag off and no slip at all → show nothing
  if (!k12Enabled && !slip) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  // No slip yet, K-12 is on
  if (!slip) {
    if (guardianCount === 0) {
      return (
        <Badge variant="warning" className="text-xs gap-1 flex-shrink-0">
          <UserX className="h-3 w-3" />
          Missing guardian
        </Badge>
      );
    }
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Badge variant="outline" className="text-xs gap-1">
          <Mail className="h-3 w-3" />
          Not sent
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            try { await onSend(); } finally { setSending(false); }
          }}
        >
          {sending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        </Button>
      </div>
    );
  }

  const handleSend = async () => {
    setSending(true);
    try { await onSend(); } finally { setSending(false); }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try { await onRevoke(); } finally { setRevoking(false); setConfirmRevoke(false); }
  };

  const pill = (() => {
    switch (slip.status) {
      case 'pending':
        if (guardianCount === 0) {
          return (
            <Badge variant="warning" className="text-xs gap-1">
              <UserX className="h-3 w-3" />
              Missing guardian
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-xs gap-1">
            <Mail className="h-3 w-3" />
            Not sent
          </Badge>
        );

      case 'sent':
        return (
          <Badge variant="secondary" className="text-xs gap-1">
            <Clock className="h-3 w-3" />
            Sent {relativeTime(slip.sent_at)}
          </Badge>
        );

      case 'signed':
        return (
          <Badge variant="success" className="text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Signed {relativeTime(slip.signed_at)}
          </Badge>
        );

      case 'expired':
        return (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expired
          </Badge>
        );

      case 'revoked':
        return (
          <Badge variant="outline" className="text-xs gap-1 line-through text-muted-foreground">
            <Ban className="h-3 w-3" />
            Revoked
          </Badge>
        );

      default:
        return null;
    }
  })();

  const canSend = slip.status === 'pending' && guardianCount > 0;
  const canResend = slip.status === 'sent' || slip.status === 'expired';
  const canRevoke = slip.status === 'sent' || slip.status === 'signed';
  const canView = slip.status === 'signed';
  const hasActions = canSend || canResend || canRevoke || canView;

  return (
    <>
      {hasActions ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Permission slip actions"
            >
              {pill}
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {canSend && (
              <DropdownMenuItem onClick={handleSend} disabled={sending}>
                <Send className="h-3.5 w-3.5 mr-2" />
                {sending ? 'Sending…' : 'Send slip'}
              </DropdownMenuItem>
            )}
            {canResend && (
              <DropdownMenuItem onClick={handleSend} disabled={sending}>
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                {sending ? 'Sending…' : 'Resend slip'}
              </DropdownMenuItem>
            )}
            {canView && (
              <DropdownMenuItem onClick={onViewSigned}>
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                View signed
              </DropdownMenuItem>
            )}
            {(canRevoke) && (canSend || canResend || canView) && (
              <DropdownMenuSeparator />
            )}
            {canRevoke && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmRevoke(true)}
                disabled={revoking}
              >
                <XCircle className="h-3.5 w-3.5 mr-2" />
                Revoke
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        pill
      )}

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke permission slip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the signing link immediately. The guardian
              will no longer be able to sign, and any previously signed record
              will be marked revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? 'Revoking…' : 'Yes, revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
