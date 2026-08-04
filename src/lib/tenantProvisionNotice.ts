// Copy for the two provisioning outcomes. Staged setup (superadmin API
// `staged: true`) holds the welcome email and returns temp_password
// exactly once; the resend-welcome action later mints a fresh one.
export interface ProvisionNotice {
  toastTitle: string;
  toastDescription: string;
  tempPasswordNote: string | null;
}

export function provisionNotice(
  body: { staged?: boolean; temp_password?: string },
  name: string,
  adminEmail: string,
): ProvisionNotice {
  if (body.staged) {
    return {
      toastTitle: 'Tenant created (staged)',
      toastDescription: `${name} provisioned — no email sent. Press "Welcome" on its card at handoff.`,
      tempPasswordNote: body.temp_password
        ? `Temp password for ${adminEmail} (shown once): ${body.temp_password}`
        : `${adminEmail} already had an account — their existing password is unchanged.`,
    };
  }
  return {
    toastTitle: 'Tenant created',
    toastDescription: `${name} provisioned. Admin invite sent to ${adminEmail}.`,
    tempPasswordNote: null,
  };
}
