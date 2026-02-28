import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, WifiOff, RefreshCw, Unplug } from 'lucide-react';

interface Reader {
  id: string;
  label: string;
  serial_number: string;
  device_type: string;
  status: string;
  ip_address?: string;
}

interface ReaderSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionStatus: 'not_connected' | 'connecting' | 'connected';
  connectedReader: Reader | null;
  discoveredReaders: Reader[];
  isDiscovering: boolean;
  error: string | null;
  lastReaderId: string | null;
  onDiscover: () => void;
  onConnect: (reader: Reader) => void;
  onDisconnect: () => void;
}

export function ReaderSettingsDialog({
  open,
  onOpenChange,
  connectionStatus,
  connectedReader,
  discoveredReaders,
  isDiscovering,
  error,
  lastReaderId,
  onDiscover,
  onConnect,
  onDisconnect,
}: ReaderSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Card Reader
          </DialogTitle>
          <DialogDescription>
            Connect to a Stripe Terminal S710 reader on your network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Connected reader info */}
          {connectionStatus === 'connected' && connectedReader && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {connectedReader.label}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {connectedReader.serial_number}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Unplug className="w-3.5 h-3.5 mr-1" />
                Disconnect
              </Button>
            </div>
          )}

          {/* Discover button */}
          {connectionStatus !== 'connected' && (
            <Button
              className="w-full gap-2"
              onClick={onDiscover}
              disabled={isDiscovering}
            >
              {isDiscovering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isDiscovering ? 'Searching for readers…' : 'Discover Readers'}
            </Button>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">
              {error}
            </p>
          )}

          {/* Discovered readers list */}
          {connectionStatus !== 'connected' && discoveredReaders.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Found {discoveredReaders.length} reader{discoveredReaders.length !== 1 ? 's' : ''}
              </p>
              {discoveredReaders.map((reader) => (
                <div
                  key={reader.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <WifiOff className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{reader.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {reader.device_type} • {reader.serial_number}
                      </p>
                    </div>
                    {reader.id === lastReaderId && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Last used
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onConnect(reader)}
                    disabled={connectionStatus === 'connecting'}
                    className="shrink-0 ml-2"
                  >
                    {connectionStatus === 'connecting' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {connectionStatus !== 'connected' &&
            !isDiscovering &&
            discoveredReaders.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No readers found</p>
                <p className="text-xs mt-1">
                  Make sure your S710 reader is powered on and on the same network.
                </p>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
