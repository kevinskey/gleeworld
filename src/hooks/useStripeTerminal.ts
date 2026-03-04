import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types for server-driven Terminal integration
interface StripeTerminalReader {
  id: string;
  object?: string;
  device_sw_version?: string | null;
  device_type: string;
  label: string;
  serial_number: string;
  status: string;
  ip_address?: string | null;
  location?: string | null;
}

type ConnectionStatus = 'not_connected' | 'connecting' | 'connected';
type PaymentStatus = 'idle' | 'collecting' | 'processing' | 'succeeded' | 'failed';

const LAST_READER_KEY = 'gleeworld_pos_last_reader_id';
const POLL_INTERVAL = 2000; // 2 seconds

export function useStripeTerminal() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('not_connected');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [connectedReader, setConnectedReader] = useState<StripeTerminalReader | null>(null);
  const [discoveredReaders, setDiscoveredReaders] = useState<StripeTerminalReader[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Server-driven: no SDK to initialize
  const initialize = useCallback(async () => {
    console.log('[StripeTerminal] Server-driven mode — no SDK initialization needed');
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  // Discover readers via Stripe API (server-side)
  const discoverReaders = useCallback(async () => {
    setIsDiscovering(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'terminal-server-driven',
        { body: { action: 'list_readers' } }
      );

      if (fnError || data?.error) {
        throw new Error(fnError?.message || data?.error || 'Failed to list readers');
      }

      const readers: StripeTerminalReader[] = data.readers || [];
      // Only show online readers
      const onlineReaders = readers.filter((r) => r.status === 'online');
      setDiscoveredReaders(onlineReaders);
      setIsDiscovering(false);
      console.log(`[StripeTerminal] Found ${onlineReaders.length} online reader(s) of ${readers.length} total`);
      return onlineReaders;
    } catch (err: any) {
      setError(err.message);
      setIsDiscovering(false);
      return [];
    }
  }, []);

  // "Connect" to a reader (server-driven = just select it, verify it's online)
  const connectReader = useCallback(async (reader: StripeTerminalReader) => {
    setConnectionStatus('connecting');
    setError(null);

    try {
      // Verify reader is online by checking its status
      const { data, error: fnError } = await supabase.functions.invoke(
        'terminal-server-driven',
        { body: { action: 'reader_status', reader_id: reader.id } }
      );

      if (fnError || data?.error) {
        throw new Error(fnError?.message || data?.error || 'Failed to check reader status');
      }

      if (data.status !== 'online') {
        throw new Error(`Reader is ${data.status}. It must be online to accept payments.`);
      }

      setConnectedReader({ ...reader, status: data.status });
      setConnectionStatus('connected');
      localStorage.setItem(LAST_READER_KEY, reader.id);
      console.log(`[StripeTerminal] Selected reader: ${reader.label} (${reader.id})`);
      return true;
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('not_connected');
      return false;
    }
  }, []);

  // Disconnect (just clear local state)
  const disconnectReader = useCallback(async () => {
    setConnectionStatus('not_connected');
    setConnectedReader(null);
    localStorage.removeItem(LAST_READER_KEY);
  }, []);

  // Poll reader action status until complete
  const pollReaderAction = useCallback(
    async (readerId: string, paymentIntentId: string): Promise<{ success: boolean; error?: string }> => {
      const maxAttempts = 90; // 3 minutes max (2s intervals)
      let attempts = 0;

      return new Promise((resolve) => {
        const poll = async () => {
          attempts++;
          try {
            const { data, error: fnError } = await supabase.functions.invoke(
              'terminal-server-driven',
              { body: { action: 'reader_status', reader_id: readerId } }
            );

            if (fnError || data?.error) {
              resolve({ success: false, error: fnError?.message || data?.error });
              return;
            }

            const action = data.action;

            // No action means reader went idle — check PaymentIntent status
            if (!action) {
              const { data: piData, error: piError } = await supabase.functions.invoke(
                'terminal-server-driven',
                { body: { action: 'payment_intent_status', payment_intent_id: paymentIntentId } }
              );
              if (piError || piData?.error) {
                resolve({ success: false, error: piError?.message || piData?.error || 'Could not verify payment' });
                return;
              }
              const piStatus = piData?.status;
              if (piStatus === 'succeeded' || piStatus === 'requires_capture') {
                resolve({ success: true });
              } else {
                resolve({ success: false, error: `Payment not completed (status: ${piStatus})` });
              }
              return;
            }

            if (action.status === 'succeeded') {
              resolve({ success: true });
              return;
            }

            if (action.status === 'failed') {
              resolve({
                success: false,
                error: action.failure_message || 'Payment failed on reader',
              });
              return;
            }

            // Still in progress
            if (attempts >= maxAttempts) {
              resolve({ success: false, error: 'Payment timed out' });
              return;
            }

            // Continue polling
            setTimeout(poll, POLL_INTERVAL);
          } catch (err: any) {
            resolve({ success: false, error: err.message });
          }
        };

        poll();
      });
    },
    []
  );

  // Collect payment: create PI, hand off to reader, poll for result
  const collectPayment = useCallback(
    async (amountCents: number, couponCode?: string) => {
      if (!connectedReader || connectionStatus !== 'connected') {
        setError('Reader not connected');
        return null;
      }

      setPaymentStatus('collecting');
      setError(null);

      try {
        // 1. Create the PaymentIntent via existing edge function
        const { data: piData, error: piError } = await supabase.functions.invoke(
          'terminal-create-payment-intent',
          { body: { amount: amountCents, couponCode } }
        );

        if (piError || !piData?.id) {
          throw new Error(piError?.message || piData?.error || 'Failed to create payment intent');
        }

        console.log(`[StripeTerminal] Created PaymentIntent: ${piData.id}`);

        // 2. Hand off the PaymentIntent to the reader via Stripe API
        const { data: processData, error: processError } = await supabase.functions.invoke(
          'terminal-server-driven',
          {
            body: {
              action: 'process_payment',
              reader_id: connectedReader.id,
              payment_intent_id: piData.id,
            },
          }
        );

        if (processError || processData?.error) {
          throw new Error(
            processError?.message || processData?.error || 'Failed to send payment to reader'
          );
        }

        console.log(`[StripeTerminal] Payment handed off to reader, polling for result...`);

        // 3. Poll for the reader action to complete
        setPaymentStatus('processing');
        const result = await pollReaderAction(connectedReader.id, piData.id);

        if (!result.success) {
          throw new Error(result.error || 'Payment failed');
        }

        setPaymentStatus('succeeded');
        return {
          paymentIntentId: piData.id,
          amount: piData.amount,
        };
      } catch (err: any) {
        setError(err.message);
        setPaymentStatus('failed');
        return null;
      }
    },
    [connectedReader, connectionStatus, pollReaderAction]
  );

  // Cancel payment: cancel the reader's current action
  const cancelPayment = useCallback(async () => {
    if (!connectedReader) return;
    try {
      await supabase.functions.invoke('terminal-server-driven', {
        body: { action: 'cancel_action', reader_id: connectedReader.id },
      });
    } catch {
      // ignore
    }
    setPaymentStatus('idle');
  }, [connectedReader]);

  const registerReader = useCallback(
    async (registrationCode: string, label: string): Promise<boolean> => {
      setIsRegistering(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          'terminal-register-reader',
          {
            body: { registration_code: registrationCode, label: label || undefined },
          }
        );
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
    },
    [discoverReaders]
  );

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
    isRegistering,
    initialize,
    discoverReaders,
    connectReader,
    disconnectReader,
    collectPayment,
    cancelPayment,
    resetPaymentStatus,
    registerReader,
  };
}
