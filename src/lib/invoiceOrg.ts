// Per-tenant invoice "From" identity (org name, mailing address, EIN, tax
// status). There is no server-side org-profile table yet, so this is stored
// per tenant in localStorage rather than hardcoded to a single organization.
// Everything is BLANK by default — nothing is fabricated. Each tenant fills in
// their own details once and they are remembered for subsequent invoices.
import { getOrgName } from './orgName';

export interface InvoiceOrgIdentity {
  name: string;
  address: string;
  cityStateZip: string;
  taxId: string;
  taxStatus: string;
}

function tenantSlug(): string {
  if (typeof window === 'undefined') return 'default';
  return (
    (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant || 'default'
  );
}

function storageKey(): string {
  return `gw_invoice_org:${tenantSlug()}`;
}

/** Blank identity — org name defaults to the tenant name, the rest empty. */
function blankIdentity(): InvoiceOrgIdentity {
  return { name: getOrgName(), address: '', cityStateZip: '', taxId: '', taxStatus: '' };
}

export function getInvoiceOrgIdentity(): InvoiceOrgIdentity {
  const blank = blankIdentity();
  if (typeof window === 'undefined') return blank;
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return blank;
    const parsed = JSON.parse(raw) as Partial<InvoiceOrgIdentity>;
    return {
      name: parsed.name || blank.name,
      address: parsed.address || '',
      cityStateZip: parsed.cityStateZip || '',
      taxId: parsed.taxId || '',
      taxStatus: parsed.taxStatus || '',
    };
  } catch {
    return blank;
  }
}

export function saveInvoiceOrgIdentity(org: InvoiceOrgIdentity): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(), JSON.stringify(org));
  } catch {
    /* ignore quota / unavailable storage */
  }
}

/**
 * Tax-deductible-donation receipt notice built from the org's OWN details.
 * Returns '' when no tax info has been entered, so no boilerplate is shown for
 * organizations that haven't provided a tax status / EIN.
 */
export function buildTaxNotice(org: InvoiceOrgIdentity): string {
  if (!org.taxStatus && !org.taxId) return '';
  const parts: string[] = [];
  if (org.taxStatus) parts.push(`${org.taxStatus}.`);
  else if (org.name) parts.push(`${org.name} is a nonprofit organization.`);
  if (org.taxId) parts.push(`EIN: ${org.taxId}.`);
  parts.push(
    'No goods or services were provided in exchange for this contribution unless otherwise noted. This invoice serves as your receipt for tax purposes.',
  );
  return parts.join(' ');
}
