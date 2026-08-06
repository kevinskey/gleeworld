// Account details step of the public booking flow. Collects just enough to
// create the visitor's account and reach them — the account itself is a
// side effect of booking, not a separate step they have to think about.

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface BookingAccount {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export const MIN_PASSWORD_LENGTH = 8; // must match handleIntake's rule (supabase/functions/_shared/publicIntake.ts)

export function isBookingAccountComplete(a: BookingAccount): boolean {
  return !!(a.firstName.trim() && a.lastName.trim() && a.email.trim() && a.phone.trim()) &&
    a.password.length >= MIN_PASSWORD_LENGTH &&
    a.password === a.confirmPassword;
}

export function BookingAccountForm({ value, onChange, disabled }: {
  value: BookingAccount;
  onChange: (next: BookingAccount) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<BookingAccount>) => onChange({ ...value, ...patch });
  const passwordTooShort = value.password.length > 0 && value.password.length < MIN_PASSWORD_LENGTH;
  const passwordsMismatch = value.confirmPassword.length > 0 && value.password !== value.confirmPassword;

  return (
    <div className="space-y-4">
      {/* Say this before they type, not after. The old flow's failure was
          asking for a login they did not have, at the end. */}
      <p className="text-sm text-muted-foreground">
        Booking creates your account so you can see and reschedule this
        appointment. No extra step — just fill this in.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="booking-first-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            First name
          </Label>
          <Input
            id="booking-first-name"
            value={value.firstName}
            disabled={disabled}
            onChange={(e) => set({ firstName: e.target.value })}
            placeholder="Jordan"
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booking-last-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Last name
          </Label>
          <Input
            id="booking-last-name"
            value={value.lastName}
            disabled={disabled}
            onChange={(e) => set({ lastName: e.target.value })}
            placeholder="Rivera"
            autoComplete="family-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booking-email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </Label>
          <Input
            id="booking-email"
            type="email"
            value={value.email}
            disabled={disabled}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booking-phone" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Phone
          </Label>
          <Input
            id="booking-phone"
            type="tel"
            value={value.phone}
            disabled={disabled}
            onChange={(e) => set({ phone: e.target.value })}
            placeholder="(404) 555-0123"
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booking-password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Password
          </Label>
          <Input
            id="booking-password"
            type="password"
            value={value.password}
            disabled={disabled}
            onChange={(e) => set({ password: e.target.value })}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            autoComplete="new-password"
          />
          {passwordTooShort && (
            <p className="text-xs text-rose-600">Needs at least {MIN_PASSWORD_LENGTH} characters.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booking-confirm-password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Confirm password
          </Label>
          <Input
            id="booking-confirm-password"
            type="password"
            value={value.confirmPassword}
            disabled={disabled}
            onChange={(e) => set({ confirmPassword: e.target.value })}
            placeholder="Retype your password"
            autoComplete="new-password"
          />
          {passwordsMismatch && (
            <p className="text-xs text-rose-600">Passwords don't match.</p>
          )}
        </div>
      </div>
    </div>
  );
}
