import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types for the Stripe Terminal SDK
interface StripeTerminalReader {
  id: string;
  object: string;
  device_sw_version: string | null;
  device_type: string;
  label: string;
  serial_number: string;
  status: string;
  ip_address?: string;
}

interface StripeTerminalInstance {
  discoverReaders: (config?: any) => Promise<{ discoveredReaders?: StripeTerminalReader[]; error?: any }>;
  connectReader: (reader: StripeTerminalReader) => Promise<{ reader?: StripeTerminalReader; error?: any }>;
  disconnectReader: () => Promise<void>;
  getConnectionStatus: () => string;
  collectPaymentMethod: (clientSecret: string) => Promise<{ paymentIntent?: any; error?: any }>;
  processPayment: (paymentIntent: any) => Promise<{ paymentIntent?: any; error?: any }>;
  cancelCollectPaymentMethod: () => Promise<void>;
  clearCachedCredentials: () => Promise<void>;
}

type ConnectionStatus = 'not_connected' | 'connecting' | 'connected';
type PaymentStatus = 'idle' | 'collecting' | 'processing' | 'succeeded' | 'failed';

const LAST_READER_KEY = 'gleeworld_pos_last_reader_id';

export function useStripeTerminal() {
  const terminalRef = useRef<StripeTerminalInstance | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('not_connected');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [connectedReader, setConnectedReader] = useState<StripeTerminalReader | null>(null);
  const [discoveredReaders, setDiscoveredReaders] = useState<StripeTerminalReader[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const initRef = useRef(false);

  const fetchConnectionToken = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('terminal-connection-token');
    if (error || !data?.secret) {
      throw new Error(error?.message || 'Failed to fetch connection token');
    }
    return data.secret;
  }, []);

  const initialize = useCallback(async () => {
    if (initRef.current || terminalRef.current) return;
    initRef.current = true;

    try {
      // Dynamically load the Stripe Terminal SDK from CDN
      if (!(window as any).StripeTerminal) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector('script[src*="terminal"]');
          if (existing) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/terminal/v1/';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Stripe Terminal SDK'));
          document.head.appendChild(script);
        });
      }

      const StripeTerminal = (window as any).StripeTerminal;
      if (!StripeTerminal) {
        throw new Error('Stripe Terminal SDK not available');
      }

      const terminal = StripeTerminal.create({
        onFetchConnectionToken: fetchConnectionToken,
        onUnexpectedReaderDisconnect: () => {
          setConnectionStatus('not_connected');
          setConnectedReader(null);
          setError('Reader disconnected unexpectedly');
        },
      });

      terminalRef.current = terminal;
    } catch (err: any) {
      setError(err.message);
      initRef.current = false;
    }
  }, [fetchConnectionToken]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const discoverReaders = useCallback(async () => {
    if (!terminalRef.current) {
      await initialize();
    }
    if (!terminalRef.current) {
      setError('Terminal not initialized');
      return [];
    }

    setIsDiscovering(true);
    setError(null);

    try {
      const result = await terminalRef.current.discoverReaders({
        simulated: false,
      });

      if (result.error) {
        setError(result.error.message || 'Failed to discover readers');
        setIsDiscovering(false);
        return [];
      }

      const readers = result.discoveredReaders || [];
      setDiscoveredReaders(readers);
      setIsDiscovering(false);
      return readers;
    } catch (err: any) {
      setError(err.message);
      setIsDiscovering(false);
      return [];
    }
  }, [initialize]);

  const connectReader = useCallback(async (reader: StripeTerminalReader) => {
    if (!terminalRef.current) {
      setError('Terminal not initialized');
      return false;
    }

    setConnectionStatus('connecting');
    setError(null);

    try {
      const result = await terminalRef.current.connectReader(reader);

      if (result.error) {
        setError(result.error.message || 'Failed to connect to reader');
        setConnectionStatus('not_connected');
        return false;
      }

      setConnectedReader(result.reader || reader);
      setConnectionStatus('connected');
      localStorage.setItem(LAST_READER_KEY, reader.id);
      return true;
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('not_connected');
      return false;
    }
  }, []);

  const disconnectReader = useCallback(async () => {
    if (!terminalRef.current) return;

    try {
      await terminalRef.current.disconnectReader();
    } catch {
      // ignore
    }
    setConnectionStatus('not_connected');
    setConnectedReader(null);
    localStorage.removeItem(LAST_READER_KEY);
  }, []);

  const collectPayment = useCallback(async (amountCents: number, couponCode?: string) => {
    if (!terminalRef.current || connectionStatus !== 'connected') {
      setError('Reader not connected');
      return null;
    }

    setPaymentStatus('collecting');
    setError(null);

    try {
      // 1. Create the PaymentIntent via edge function
      const { data, error: fnError } = await supabase.functions.invoke(
        'terminal-create-payment-intent',
        { body: { amount: amountCents, couponCode } }
      );

      if (fnError || !data?.client_secret) {
        throw new Error(fnError?.message || data?.error || 'Failed to create payment intent');
      }

      // 2. Collect payment method on the reader
      const collectResult = await terminalRef.current.collectPaymentMethod(data.client_secret);

      if (collectResult.error) {
        throw new Error(collectResult.error.message || 'Payment collection failed');
      }

      // 3. Process the payment
      setPaymentStatus('processing');
      const processResult = await terminalRef.current.processPayment(collectResult.paymentIntent);

      if (processResult.error) {
        throw new Error(processResult.error.message || 'Payment processing failed');
      }

      setPaymentStatus('succeeded');
      return {
        paymentIntentId: data.id,
        amount: data.amount,
      };
    } catch (err: any) {
      setError(err.message);
      setPaymentStatus('failed');
      return null;
    }
  }, [connectionStatus]);

  const cancelPayment = useCallback(async () => {
    if (!terminalRef.current) return;
    try {
      await terminalRef.current.cancelCollectPaymentMethod();
    } catch {
      // ignore
    }
    setPaymentStatus('idle');
  }, []);

  const [isRegistering, setIsRegistering] = useState(false);

  const registerReader = useCallback(async (registrationCode: string, label: string): Promise<boolean> => {
    setIsRegistering(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('terminal-register-reader', {
        body: { registration_code: registrationCode, label: label || undefined },
      });
      if (fnError || data?.error) {
        throw new Error(fnError?.message || data?.error || 'Registration failed');
      }
      // Auto-discover after registration
      await discoverReaders();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [discoverReaders]);

  const resetPaymentStatus = useCallback(() => {
    setPaymentStatus('idle');
    setError(null);
  }, []);

  const lastReaderId = localStorage.getItem(LAST_READER_KEY);

  return {
    connectionStatus,
    paymentStatus,
    connectedReader,
    discoveredReaders,
    error,
    isDiscovering,
    lastReaderId,
    initialize,
    discoverReaders,
    connectReader,
    disconnectReader,
    collectPayment,
    cancelPayment,
    resetPaymentStatus,
  };
}
