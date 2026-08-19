// Turning WhatsApp alerts on for yourself.
//
// This is a consent surface, not a settings row, and it is written that way:
// the number, what will be sent, how often, and how to stop are all on screen
// before the button is pressed. Meta requires explicit opt-in and expects a
// business to be able to show it was given; the honest way to satisfy that is
// to make the ask legible rather than bury it in a toggle.
import { useState } from 'react';
import { Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toE164 } from '@/lib/auctions/phone';
import { useWhatsAppMutations, useWhatsAppOptIn } from '../hooks';

export function WhatsAppOptInCard() {
  const { data: optin, isLoading } = useWhatsAppOptIn();
  const { optIn, optOut } = useWhatsAppMutations();
  const [phone, setPhone] = useState('');

  const live = optin && !optin.opted_out_at ? optin : null;

  function submit() {
    const e164 = toE164(phone);
    if (!e164) {
      toast.error('That does not look like a phone number', {
        description: 'Use the full number including area code, or start with + and the country code.',
      });
      return;
    }
    optIn.mutate(e164);
    setPhone('');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="!text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          WhatsApp alerts
        </CardTitle>
        <CardDescription className="text-xs">
          A short message when a saved search finds something — the lots themselves stay in the app
          and in your email.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking…</p>
        ) : live ? (
          <>
            <p className="text-sm flex items-center gap-2">
              <Check className="w-4 h-4 text-primary shrink-0" />
              Alerts go to <span className="font-medium">{live.phone_e164}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Turn this on per search from the search's own settings. You can stop at any time here,
              or by replying STOP in WhatsApp.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={optOut.isPending}
              onClick={() => optOut.mutate()}
            >
              Turn off WhatsApp alerts
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone">Your WhatsApp number</Label>
              <Input
                id="whatsapp-phone"
                inputMode="tel"
                placeholder="(404) 555-1234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Outside the US, start with + and your country code.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              By turning this on you agree to receive WhatsApp messages about the searches you have
              asked to be alerted about. Standard message rates may apply. Reply STOP at any time,
              or turn it off here.
            </p>
            <Button size="sm" disabled={optIn.isPending || !phone.trim()} onClick={submit}>
              {optIn.isPending ? 'Turning on…' : 'Turn on WhatsApp alerts'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
