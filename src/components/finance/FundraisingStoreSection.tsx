// Fundraising store card — enable + status + one-click store admin.
//
// Rendered inside FinancialManagement (Finance section) since the
// tenant's fundraising apparel revenue naturally belongs alongside
// dues, payments, and budgets. Talks to two edge functions:
//   • provision-tsb-store — creates or fetches the tenant's TSB group store
//   • tsb-store-sso — mints a short-lived JWT + admin URL for one-click login

import { useCallback, useEffect, useState } from 'react';
import { Store, ExternalLink, Loader2, Sparkles, AlertCircle, Palette, Clock, Check, XCircle, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { ImageUploadField } from '@/components/public-site/ImageUploadField';

interface StoreState {
  slug: string | null;
  subdomain: string | null;
  name: string | null;
  storefront_url: string | null;
  admin_url: string | null;
}

interface Draft {
  id: number;
  name: string;
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;
  reviewed_at: string | null;
  approved_product_id: number | null;
  created_at: string;
}

interface BrandJson {
  hero_url?: string;
  tagline?: string;
  logo_url?: string;
  footer_note?: string;
}
interface FundraiserJson {
  headline?: string;
  description?: string;
  goal_cents?: number;
  ends_at?: string;
}

export function FundraisingStoreSection() {
  const { isSuperAdmin, isAdmin } = useUserRole();
  const canManage = isSuperAdmin() || isAdmin();

  const [state, setState] = useState<StoreState | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [openingAdmin, setOpeningAdmin] = useState(false);
  const [openingDesign, setOpeningDesign] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [brand, setBrand] = useState<BrandJson>({});
  const [fundraiser, setFundraiser] = useState<FundraiserJson>({});
  const [editOpen, setEditOpen] = useState(false);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error('Not signed in');
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('tenant_id')
        .eq('user_id', userRes.user.id)
        .maybeSingle();
      if (!profile?.tenant_id) throw new Error('Profile has no tenant');
      const { data: tenant } = await supabase
        .from('gw_tenants')
        .select('tsb_store_slug, tsb_store_subdomain, name')
        .eq('id', profile.tenant_id)
        .maybeSingle();
      if (!tenant?.tsb_store_slug) {
        setState({ slug: null, subdomain: null, name: null, storefront_url: null, admin_url: null });
      } else {
        const base = tenant.tsb_store_subdomain
          ? `https://${tenant.tsb_store_subdomain}.tshirtbrothers.com`
          : `https://tshirtbrothers.com/stores/${tenant.tsb_store_slug}`;
        setState({
          slug: tenant.tsb_store_slug,
          subdomain: tenant.tsb_store_subdomain,
          name: tenant.name,
          storefront_url: base,
          admin_url: `${base}/admin`,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadState(); }, [loadState]);

  const loadDrafts = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('tsb-store-drafts', {});
      if (error) throw error;
      setDrafts(Array.isArray(data?.drafts) ? data.drafts : []);
      setBrand((data?.brand ?? {}) as BrandJson);
      setFundraiser((data?.fundraiser ?? {}) as FundraiserJson);
    } catch {
      setDrafts([]); // silent — the store might just have no drafts yet
    }
  }, []);

  useEffect(() => {
    if (state?.slug) void loadDrafts();
  }, [state?.slug, loadDrafts]);

  const enableStore = async () => {
    setProvisioning(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-tsb-store', {});
      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error || 'Provisioning returned no data');
      toast.success(data.created ? 'Fundraising store enabled.' : 'Store already existed — linked back.');
      await loadState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Provisioning failed');
    } finally {
      setProvisioning(false);
    }
  };

  const openAdmin = async () => {
    setOpeningAdmin(true);
    try {
      const { data, error } = await supabase.functions.invoke('tsb-store-sso', {});
      if (error) throw error;
      if (!data?.admin_url) throw new Error('SSO returned no admin URL');
      window.open(data.admin_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open store admin');
    } finally {
      setOpeningAdmin(false);
    }
  };

  const openDesign = async () => {
    setOpeningDesign(true);
    try {
      const { data, error } = await supabase.functions.invoke('tsb-store-sso', {});
      if (error) throw error;
      if (!data?.design_url) throw new Error('SSO returned no design URL');
      window.open(data.design_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open designer');
    } finally {
      setOpeningDesign(false);
    }
  };

  return (
    <div className="border border-border rounded-lg bg-card divide-y divide-border">
      <div className="px-3 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
        <Store className="w-3.5 h-3.5" />
        Fundraising Store
      </div>
      <div className="px-3 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking store status…
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>{error}</div>
          </div>
        ) : !state?.slug ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Turn on your branded apparel storefront powered by T-Shirt Brothers.
              TSB handles design, print, shipping, and returns; you keep 15% of every sale.
            </div>
            <Button
              onClick={enableStore}
              disabled={!canManage || provisioning}
              size="sm"
            >
              {provisioning ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enabling…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Enable Fundraising Store</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-semibold">{state.name || state.slug}</span>
              <span className="text-muted-foreground"> · {state.storefront_url?.replace(/^https?:\/\//, '')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={state.storefront_url!} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View storefront
                </a>
              </Button>
              <Button
                onClick={openDesign}
                disabled={!canManage || openingDesign}
                variant="outline"
                size="sm"
              >
                {openingDesign ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Opening…</>
                ) : (
                  <><Palette className="w-3.5 h-3.5 mr-1.5" /> Design merch</>
                )}
              </Button>
              <Button
                onClick={() => setEditOpen(true)}
                disabled={!canManage}
                variant="outline"
                size="sm"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit storefront
              </Button>
              <Button
                onClick={openAdmin}
                disabled={!canManage || openingAdmin}
                size="sm"
              >
                {openingAdmin ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Opening…</>
                ) : (
                  <><ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Manage store</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Design merch opens TSB&apos;s design studio; anything you submit goes to TSB for review before it appears on your storefront.
            </p>

            {drafts && drafts.length > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="text-xs font-semibold text-muted-foreground mb-2">Your submitted designs</div>
                <ul className="space-y-2">
                  {drafts.map((d) => {
                    const Icon = d.status === 'approved' ? Check : d.status === 'rejected' ? XCircle : Clock;
                    const tone = d.status === 'approved' ? 'text-emerald-700' : d.status === 'rejected' ? 'text-red-700' : 'text-amber-700';
                    const label = d.status === 'approved' ? 'Published' : d.status === 'rejected' ? 'Rejected' : 'Pending review';
                    return (
                      <li key={d.id} className="flex items-center gap-3 text-sm">
                        <img src={d.image_url} alt={d.name} className="w-10 h-10 object-contain bg-white border border-border rounded" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{d.name}</div>
                          <div className={`text-xs inline-flex items-center gap-1 ${tone}`}>
                            <Icon className="w-3 h-3" /> {label}
                            {d.review_notes && d.status !== 'pending' && (
                              <span className="text-muted-foreground italic ml-1">— {d.review_notes}</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {editOpen && (
        <EditStorefrontModal
          initialBrand={brand}
          initialFundraiser={fundraiser}
          onClose={() => setEditOpen(false)}
          onSaved={(nextBrand, nextFund) => {
            setBrand(nextBrand);
            setFundraiser(nextFund);
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}

function EditStorefrontModal({ initialBrand, initialFundraiser, onClose, onSaved }: {
  initialBrand: BrandJson;
  initialFundraiser: FundraiserJson;
  onClose: () => void;
  onSaved: (brand: BrandJson, fundraiser: FundraiserJson) => void;
}) {
  const [heroUrl, setHeroUrl] = useState(initialBrand.hero_url ?? '');
  const [tagline, setTagline] = useState(initialBrand.tagline ?? '');
  const [footer, setFooter] = useState(initialBrand.footer_note ?? '');
  const [headline, setHeadline] = useState(initialFundraiser.headline ?? '');
  const [description, setDescription] = useState(initialFundraiser.description ?? '');
  const [goalUsd, setGoalUsd] = useState(
    initialFundraiser.goal_cents ? (initialFundraiser.goal_cents / 100).toFixed(2) : '',
  );
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const goalCents = goalUsd ? Math.round(parseFloat(goalUsd) * 100) : null;
      const body = {
        brand: {
          hero_url: heroUrl || null,
          tagline: tagline || null,
          footer_note: footer || null,
        },
        fundraiser: {
          headline: headline || null,
          description: description || null,
          goal_cents: goalCents,
        },
      };
      const { data, error } = await supabase.functions.invoke('tsb-store-update', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Storefront updated');
      onSaved(
        (data?.brand_json ?? {}) as BrandJson,
        (data?.fundraiser_json ?? {}) as FundraiserJson,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="bg-card rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit storefront</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ImageUploadField
          label="Hero image (behind the store title on the storefront)"
          value={heroUrl}
          onChange={setHeroUrl}
          prefix="tsb-hero"
          thumbClass="w-24 h-24"
        />

        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Tagline</label>
          <input
            value={tagline} onChange={(e) => setTagline(e.target.value)}
            placeholder="Short line under the store name"
            maxLength={140}
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div className="pt-2 border-t border-border">
          <div className="text-xs font-semibold text-muted-foreground mb-3">Fundraiser copy</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Headline</label>
              <input
                value={headline} onChange={(e) => setHeadline(e.target.value)}
                placeholder={`Every purchase supports ${initialBrand.tagline || 'us'}.`}
                maxLength={180}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Description</label>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What's the money for? Trip, uniforms, retreat, etc."
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Goal ($)</label>
              <input
                type="number" step="0.01" min="0"
                value={goalUsd} onChange={(e) => setGoalUsd(e.target.value)}
                placeholder="Optional"
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Footer note</label>
          <input
            value={footer} onChange={(e) => setFooter(e.target.value)}
            placeholder='e.g. "Powered by T-Shirt Brothers — Fulfilled by TSB"'
            maxLength={200}
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>) : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
