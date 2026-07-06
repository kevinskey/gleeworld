// "Request your workspace" — the single conversion CTA for prospects,
// opened from the demo bar, the dashboard upsell, and every marketing
// "Get started" button. Submissions land in gw_tenant_leads via the
// tenant-intake edge function; Kevin provisions manually.
//
// Mirrors the marketing InquiryDialog visually so the demo CTA reads as
// part of the same brand world.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CheckCircle2, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RequestWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
}

// Blue-dominant gradient (Stripe/Linear family) — universally
// best-liked color per cross-country preference research. Replaces
// the previous blue→purple→lavender drift, which read as creative
// but skewed more polarizing than pure blue.
const PROMO_GRADIENT =
  "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)";
const SANS = "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif";

// Most-requested modules surfaced as checkboxes. Keep short — full module
// set is discussed during follow-up so the form stays scannable.
const MODULE_OPTIONS: { id: string; label: string }[] = [
  { id: "academy", label: "Academy (course creation)" },
  { id: "music-library", label: "Music Library" },
  { id: "studio", label: "Studio (Recording)" },
  { id: "messaging", label: "Messaging" },
  { id: "store", label: "Store" },
  { id: "pdf-viewer", label: "PDF Viewer" },
  { id: "box-office", label: "Box Office (Tickets)" },
  { id: "program-creator", label: "Program Creator" },
  { id: "google-calendar", label: "Google Calendar sync" },
];

export function RequestWorkspaceDialog({ open, onClose }: RequestWorkspaceDialogProps) {
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [expectedStudents, setExpectedStudents] = useState("");
  const [modules, setModules] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setSent(false);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const toggleModule = (id: string) => {
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const sourceTenant =
        (window as unknown as { __TENANT_CONFIG__?: { tenant?: string } })
          .__TENANT_CONFIG__?.tenant ?? "demo";
      // Role isn't a schema column — fold it into notes so Kevin sees
      // it without expanding the table for what's basically a free-form
      // piece of context.
      const trimmedRole = role.trim();
      const trimmedNotes = notes.trim();
      const combinedNotes = [
        trimmedRole ? `Role: ${trimmedRole}` : null,
        trimmedNotes || null,
      ].filter(Boolean).join("\n\n") || undefined;

      const { data, error: fnError } = await supabase.functions.invoke(
        "tenant-intake",
        {
          body: {
            org_name: orgName.trim(),
            contact_name: contactName.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
            expected_students: expectedStudents ? Number(expectedStudents) : undefined,
            modules: Array.from(modules),
            notes: combinedNotes,
            source_tenant_slug: sourceTenant,
          },
        },
      );
      if (fnError) throw fnError;
      if (data && (data as { ok?: boolean }).ok === false) {
        throw new Error((data as { error?: string }).error || "Submission failed");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(10, 5, 24, 0.75)", backdropFilter: "blur(8px)", fontFamily: SANS }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl my-auto rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: PROMO_GRADIENT }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white/90 hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-7 sm:px-10 pt-10 pb-6 text-white">
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ letterSpacing: "-0.02em" }}>
            {sent ? "You're on the list." : "Request your GleeWorld workspace."}
          </h2>
          <p className="mt-2 text-white/85 text-sm sm:text-base">
            {sent
              ? "Kevin will reach out personally within one business day — most workspaces are live within two."
              : "Tell us a bit about your program. Every workspace is set up personally, and most are live within two business days."}
          </p>
        </div>

        <div className="bg-white px-7 sm:px-10 py-7 sm:py-8 max-h-[70vh] overflow-y-auto">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: PROMO_GRADIENT }}>
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Thanks, {contactName.split(" ")[0] || "friend"}.
              </h3>
              <p className="text-slate-600 text-sm mb-6">
                A confirmation is on its way to <span className="font-medium text-slate-900">{email}</span>.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
                style={{ background: PROMO_GRADIENT }}
              >
                Back to the demo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Organization *" htmlFor="bt-org">
                <input id="bt-org" type="text" required value={orgName}
                  onChange={(e) => setOrgName(e.target.value)} className={inputClass}
                  placeholder="Lincoln HS Chorus" />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Your name *" htmlFor="bt-name">
                  <input id="bt-name" type="text" required value={contactName}
                    onChange={(e) => setContactName(e.target.value)} className={inputClass}
                    placeholder="Jane Doe" />
                </Field>
                <Field label="Your role" htmlFor="bt-role">
                  <input id="bt-role" type="text" value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={inputClass} placeholder="Director, Choir Manager…" />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Email *" htmlFor="bt-email">
                  <input id="bt-email" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} className={inputClass}
                    placeholder="you@example.com" />
                </Field>
                <Field label="Phone" htmlFor="bt-phone">
                  <input id="bt-phone" type="tel" value={phone}
                    onChange={(e) => setPhone(e.target.value)} className={inputClass}
                    placeholder="(555) 123-4567" />
                </Field>
              </div>

              <Field label="Approx. students" htmlFor="bt-students">
                <input id="bt-students" type="number" min={1} max={100000} value={expectedStudents}
                  onChange={(e) => setExpectedStudents(e.target.value)} className={inputClass}
                  placeholder="e.g. 80" />
              </Field>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                  Features you're interested in
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {MODULE_OPTIONS.map((m) => {
                    const checked = modules.has(m.id);
                    return (
                      <label key={m.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                          checked
                            ? "border-violet-400 bg-violet-50 text-slate-900"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}>
                        <input type="checkbox" checked={checked}
                          onChange={() => toggleModule(m.id)} className="accent-violet-500" />
                        {m.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <Field label="Anything we should know?" htmlFor="bt-notes">
                <textarea id="bt-notes" rows={3} value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClass} resize-none`}
                  placeholder="Timeline, current tools you're replacing, must-haves…" />
              </Field>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: PROMO_GRADIENT }}>
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <>Send to Kevin <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-xs text-slate-500 text-center">
                Every setup is hands-on — no bots, no self-serve maze.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition";

function Field({ label, htmlFor, children }: {
  label: string; htmlFor: string; children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  );
}
