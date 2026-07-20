// "Request your workspace" — the single conversion CTA for prospects,
// opened from the demo bar, the dashboard upsell, and every marketing
// "Get started" button. Submissions land in gw_tenant_leads via the
// tenant-intake edge function; Kevin provisions manually.
//
// Desktop layout: two columns — gradient hero on the left, form on the
// right — so the whole thing fits without a scroll region on a normal
// laptop. Mobile falls back to a stacked single-column view (the sm:
// breakpoint controls the split). Body-scroll lock prevents the
// underlying page from scrolling while the modal is open.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CheckCircle2, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RequestWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
}

// GleeWorld brand gradient (blue → violet → lavender) — same three stops as
// the "Get started" CTA on the marketing site and the app's logomark, so the
// dialog reads as part of the same brand world.
const PROMO_GRADIENT =
  "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)";
const SANS = "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif";

// Most-requested modules surfaced as checkboxes. Keep short — full module
// set is discussed during follow-up so the form stays scannable.
const MODULE_OPTIONS: { id: string; label: string }[] = [
  { id: "academy", label: "Academy" },
  { id: "music-library", label: "Music Library" },
  { id: "studio", label: "Studio" },
  { id: "messaging", label: "Messaging" },
  { id: "store", label: "Store" },
  { id: "pdf-viewer", label: "PDF Viewer" },
  { id: "box-office", label: "Box Office" },
  { id: "program-creator", label: "Program Creator" },
  { id: "google-calendar", label: "Google Calendar" },
];

const PROGRAM_TYPES = ["Person", "Choir", "Church", "Enterprise"] as const;
type ProgramType = typeof PROGRAM_TYPES[number];

// Placeholder swaps by type so the Organization field reads right for a
// solo musician vs. a big institution.
const ORG_PLACEHOLDER: Record<ProgramType, string> = {
  Person: "Your name or studio",
  Choir: "Lincoln HS Chorus",
  Church: "St. Andrew Parish",
  Enterprise: "Georgia Music Educators Assn.",
};

export function RequestWorkspaceDialog({ open, onClose }: RequestWorkspaceDialogProps) {
  const [programType, setProgramType] = useState<ProgramType>("Choir");
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [role, setRole] = useState("Director");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [expectedStudents, setExpectedStudents] = useState("30");
  // Pre-check the modules every music program takes as table stakes so the
  // form doesn't look empty on open and prospects understand these are
  // included by default; they can uncheck any they don't want.
  const [modules, setModules] = useState<Set<string>>(
    () => new Set(["music-library", "pdf-viewer", "messaging", "google-calendar", "studio"]),
  );
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
      const trimmedRole = role.trim();
      const trimmedNotes = notes.trim();
      // Program type + role fold into notes so Kevin sees the shape of the
      // lead without a schema change on gw_tenant_leads. First line wins in
      // his inbox summary.
      const combinedNotes = [
        `Type: ${programType}`,
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: "rgba(10, 5, 24, 0.75)", backdropFilter: "blur(8px)", fontFamily: SANS }}
      onClick={onClose}
    >
      <div
        // max-h-[95vh] is the outer cap — the inner grid columns each get
        // min-h-0 so overflow-y-auto (form column only, if the viewport is
        // short) engages instead of blowing past the modal box.
        className="relative w-full max-w-6xl max-h-[95vh] rounded-3xl shadow-2xl overflow-hidden bg-white grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center text-white/95 hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Left: gradient hero. On lg+ it sits beside the form; on mobile
            it stacks above. flex justify-between so the fine-print sits at
            the bottom of the hero on tall viewports. */}
        <div
          className="p-7 sm:p-10 lg:p-12 text-white flex flex-col justify-between min-h-0"
          style={{ background: PROMO_GRADIENT }}
        >
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight">
              {sent ? "You're on the list." : "Request your GleeWorld workspace."}
            </h2>
            <p className="mt-4 text-white/90 text-base lg:text-lg leading-relaxed">
              {sent
                ? "Kevin will reach out personally within one business day — most workspaces are live within two."
                : "Tell us about your program. Every workspace is set up personally, and most are live within two business days."}
            </p>
            {!sent && (
              <ul className="mt-8 space-y-3 text-white/95 text-sm lg:text-base">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                  <span>30-day free trial · no card required</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                  <span>Site setup — same day</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                  <span>Everything in your tier included from day one</span>
                </li>
              </ul>
            )}
          </div>
          <p className="mt-10 text-white/75 text-sm">
            Every setup is hands-on. No bots, no self-serve maze.
          </p>
        </div>

        {/* Right: form. overflow-y-auto only engages if the viewport is
            shorter than the natural form height (very short laptops); on a
            typical 900+ px screen the modal never scrolls. */}
        <div className="bg-white p-6 sm:p-8 lg:p-10 overflow-y-auto min-h-0">
          {sent ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: PROMO_GRADIENT }}>
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                Thanks, {contactName.split(" ")[0] || "friend"}.
              </h3>
              <p className="text-slate-600 text-base mb-8">
                A confirmation is on its way to <span className="font-medium text-slate-900">{email}</span>.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold text-white transition-transform hover:scale-[1.03]"
                style={{ background: PROMO_GRADIENT }}
              >
                Back to the demo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5">
              <div>
                <span className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                  Type
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {PROGRAM_TYPES.map((t) => {
                    const active = programType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setProgramType(t)}
                        className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          active
                            ? "border-violet-500 bg-violet-50 text-slate-900 shadow-sm"
                            : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="Organization *" htmlFor="bt-org">
                <input id="bt-org" type="text" required value={orgName}
                  onChange={(e) => setOrgName(e.target.value)} className={inputClass}
                  placeholder={ORG_PLACEHOLDER[programType]} />
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

              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Email *" htmlFor="bt-email" className="sm:col-span-2">
                  <input id="bt-email" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} className={inputClass}
                    placeholder="you@example.com" />
                </Field>
                <Field label="Students" htmlFor="bt-students">
                  <input id="bt-students" type="number" min={1} max={100000} value={expectedStudents}
                    onChange={(e) => setExpectedStudents(e.target.value)} className={inputClass}
                    placeholder="30" />
                </Field>
              </div>

              <Field label="Phone" htmlFor="bt-phone">
                <input id="bt-phone" type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)} className={inputClass}
                  placeholder="(555) 123-4567" />
              </Field>

              <div>
                <span className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                  Features you're interested in
                </span>
                {/* 3-col on lg+ keeps the 9 checkboxes at 3 rows so the
                    section doesn't dominate the form's vertical space. */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
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
                <textarea id="bt-notes" rows={2} value={notes}
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
                  <><Loader2 className="w-5 h-5 animate-spin" /> Sending…</>
                ) : (
                  <>Send to GleeWorld <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// Fields step up from text-xs → text-sm label + text-base input so the whole
// form reads at a comfortable size on desktop without shrinking away from
// laptops' shorter viewport height.
const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition";

function Field({ label, htmlFor, children, className }: {
  label: string; htmlFor: string; children: React.ReactNode; className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`block ${className ?? ""}`}>
      <span className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  );
}
