import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ReaderStatusProps {
  connectionStatus: 'not_connected' | 'connecting' | 'connected';
  readerLabel?: string | null;
  onClick?: () => void;
}

export function ReaderStatus({ connectionStatus, readerLabel, onClick }: ReaderStatusProps) {
  const statusConfig = {
    not_connected: {
      icon: WifiOff,
      label: 'No Reader',
      variant: 'outline' as const,
      className: 'text-white/60 border-white/20 hover:bg-white/10 cursor-pointer',
    },
    connecting: {
      icon: Loader2,
      label: 'Connecting…',
      variant: 'outline' as const,
      className: 'text-amber-300 border-amber-300/30 animate-pulse',
    },
    connected: {
      icon: Wifi,
      label: readerLabel || 'Reader',
      variant: 'outline' as const,
      className: 'text-emerald-300 border-emerald-300/30 hover:bg-white/10 cursor-pointer',
    },
  };

  const config = statusConfig[connectionStatus];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`gap-1.5 text-xs px-2 py-1 ${config.className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <Icon className={`w-3 h-3 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
      <span className="max-w-[100px] truncate">{config.label}</span>
    </Badge>
  );
}
