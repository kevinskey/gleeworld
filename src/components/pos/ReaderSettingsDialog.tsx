import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wifi, WifiOff, RefreshCw, Unplug, Plus } from 'lucide-react';

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
  onRegister: (code: string, label: string) => Promise<boolean>;
  isRegistering?: boolean;
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
  onRegister,
  isRegistering,
}: ReaderSettingsDialogProps) {
  const [showRegister, setShowRegister] = useState(false);
  const [regCode, setRegCode] = useState('');
  const [regLabel, setRegLabel] = useState('');

  const handleRegister = async () => {
    if (!regCode.trim()) return;
    const ok = await onRegister(regCode.trim(), regLabel.trim());
    if (ok) {
      setRegCode('');
      setRegLabel('');
      setShowRegister(false);
    }
  };

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

          {/* Discover + Register buttons */}
          {connectionStatus !== 'connected' && (
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={onDiscover}
                disabled={isDiscovering}
              >
                {isDiscovering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isDiscovering ? 'Searching…' : 'Discover Readers'}
              </Button>
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowRegister(!showRegister)}
              >
                <Plus className="w-4 h-4" />
                Register
              </Button>
            </div>
          )}

          {/* Register reader form */}
          {showRegister && connectionStatus !== 'connected' && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <p className="text-sm font-medium">Register New Reader</p>
              <p className="text-xs text-muted-foreground">
                Enter the pairing code shown on your reader's screen.
              </p>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="reg-code" className="text-xs">Pairing Code</Label>
                  <Input
                    id="reg-code"
                    placeholder="e.g. sepia-cerulean-orchid"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-label" className="text-xs">Label (optional)</Label>
                  <Input
                    id="reg-label"
                    placeholder="e.g. Tour POS Reader"
                    value={regLabel}
                    onChange={(e) => setRegLabel(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={handleRegister}
                disabled={!regCode.trim() || isRegistering}
              >
                {isRegistering ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                {isRegistering ? 'Registering…' : 'Register Reader'}
              </Button>
            </div>
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
            discoveredReaders.length === 0 &&
            !showRegister && (
              <div className="text-center py-6 text-muted-foreground">
                <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No readers found</p>
                <p className="text-xs mt-1">
                  Make sure your S710 is powered on and on the same network, or tap <strong>Register</strong> to pair a new reader.
                </p>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
