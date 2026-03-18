import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { format } from 'date-fns';
import { DollarSign, FileSignature, Loader2, Phone, Receipt, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TIP_AMOUNT = 300;

const driverTipReceiptSchema = z.object({
  driver_name: z.string().trim().min(1, 'Driver name is required').max(120, 'Driver name is too long'),
  bus_company_name: z.string().trim().max(120, 'Bus company name is too long').optional().or(z.literal('')),
  driver_phone: z.string().trim().max(30, 'Phone number is too long').optional().or(z.literal('')),
  payment_method: z.enum(['cash', 'check', 'cash_app', 'venmo', 'other']),
  notes: z.string().trim().max(500, 'Notes must be 500 characters or less').optional().or(z.literal('')),
  signature_data: z.string().trim().min(1, 'Driver signature is required'),
});

interface SavedBusCompany {
  id: string;
  company_name: string;
  driver_name: string | null;
  driver_phone: string | null;
}

interface ActiveTour {
  id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
}

interface DriverTipReceiptRow {
  id: string;
  driver_name: string;
  bus_company_name: string | null;
  driver_phone: string | null;
  payment_method: string | null;
  amount: number;
  signed_at: string;
}

interface BusDriverTipReceiptSectionProps {
  activeTour?: ActiveTour | null;
  savedCompanies?: SavedBusCompany[];
}

export const BusDriverTipReceiptSection: React.FC<BusDriverTipReceiptSectionProps> = ({
  activeTour,
  savedCompanies,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [driverName, setDriverName] = useState('');
  const [busCompanyName, setBusCompanyName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'cash_app' | 'venmo' | 'other'>('cash');
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const signatureRef = useRef<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: queriedCompanies = [] } = useQuery({
    queryKey: ['tour-bus-companies-driver-tip'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tour_bus_companies')
        .select('id, company_name, driver_name, driver_phone')
        .eq('is_active', true)
        .order('company_name');
      if (error) throw error;
      return (data ?? []) as SavedBusCompany[];
    },
    enabled: !savedCompanies,
  });

  const { data: queriedTour } = useQuery({
    queryKey: ['active-tour-driver-tip'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tours')
        .select('id, name, start_date, end_date, status')
        .in('status', ['active', 'planning', 'draft'])
        .order('start_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as ActiveTour | null) ?? null;
    },
    enabled: !activeTour,
  });

  const resolvedCompanies = savedCompanies ?? queriedCompanies;
  const resolvedTour = activeTour ?? queriedTour ?? null;

  const defaultCompany = useMemo(
    () => resolvedCompanies.find((company) => company.driver_name || company.driver_phone) || resolvedCompanies[0],
    [resolvedCompanies],
  );

  useEffect(() => {
    if (!defaultCompany) return;

    setBusCompanyName((current) => current || defaultCompany.company_name || '');
    setDriverName((current) => current || defaultCompany.driver_name || '');
    setDriverPhone((current) => current || defaultCompany.driver_phone || '');
  }, [defaultCompany]);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['tour-driver-tip-receipts', resolvedTour?.id ?? 'none'],
    queryFn: async () => {
      let query = supabase
        .from('gw_tour_driver_tip_receipts')
        .select('id, driver_name, bus_company_name, driver_phone, payment_method, amount, signed_at')
        .order('signed_at', { ascending: false })
        .limit(8);

      if (resolvedTour?.id) {
        query = query.eq('tour_id', resolvedTour.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as DriverTipReceiptRow[];
    },
    enabled: Boolean(user),
  });

  const resetForm = () => {
    setNotes('');
    setSignature(null);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be logged in to save a tip receipt');
      return;
    }

    const parsed = driverTipReceiptSchema.safeParse({
      driver_name: driverName,
      bus_company_name: busCompanyName,
      driver_phone: driverPhone,
      payment_method: paymentMethod,
      notes,
      signature_data: signature ?? '',
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Please complete the receipt form');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('gw_tour_driver_tip_receipts').insert({
        tour_id: resolvedTour?.id ?? null,
        amount: TIP_AMOUNT,
        driver_name: parsed.data.driver_name,
        bus_company_name: parsed.data.bus_company_name || null,
        driver_phone: parsed.data.driver_phone || null,
        payment_method: parsed.data.payment_method,
        signed_by_name: parsed.data.driver_name,
        signature_data: parsed.data.signature_data,
        notes: parsed.data.notes || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('Driver tip receipt saved');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['tour-driver-tip-receipts'] });
    } catch (error) {
      console.error('Error saving driver tip receipt:', error);
      const message = error instanceof Error ? error.message : 'Failed to save driver tip receipt';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Receipt className="h-5 w-5 text-primary" />
        Bus Driver Tip Receipt
      </h2>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-base">
              <FileSignature className="h-4 w-4 text-primary" />
              Signed $300 tip acknowledgment
            </span>
            <Badge variant="secondary" className="w-fit">
              <DollarSign className="mr-1 h-3 w-3" />
              ${TIP_AMOUNT.toFixed(2)}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Capture the driver’s signature in Tour Manager after the tip is paid.
          </p>
          {resolvedTour && (
            <p className="text-xs text-muted-foreground">
              Tour: {resolvedTour.name}
              {resolvedTour.start_date ? ` · ${format(new Date(resolvedTour.start_date), 'MMM d, yyyy')}` : ''}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="driver-name">Driver name</Label>
              <Input
                id="driver-name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Enter driver name"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bus-company">Bus company</Label>
              <Input
                id="bus-company"
                value={busCompanyName}
                onChange={(e) => setBusCompanyName(e.target.value)}
                placeholder="Enter company name"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-phone">Driver phone</Label>
              <Input
                id="driver-phone"
                type="tel"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="Enter phone number"
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment method</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}>
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Select a payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash_app">Cash App</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-notes">Notes</Label>
            <Textarea
              id="receipt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment notes"
              maxLength={500}
              rows={3}
            />
          </div>

          <SignatureCanvas onSignatureChange={setSignature} disabled={isSubmitting} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              This stores a signed receipt for the paid bus driver tip.
            </p>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving receipt...
                </>
              ) : (
                <>
                  <FileSignature className="mr-2 h-4 w-4" />
                  Save signed receipt
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent signed receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading receipts...
            </div>
          ) : receipts.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No driver tip receipts have been signed yet.</p>
          ) : (
            <div className="space-y-3">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{receipt.driver_name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {receipt.bus_company_name && (
                          <span className="flex items-center gap-1">
                            <Receipt className="h-3.5 w-3.5" />
                            {receipt.bus_company_name}
                          </span>
                        )}
                        {receipt.driver_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {receipt.driver_phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {receipt.payment_method || 'Cash'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(receipt.signed_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
