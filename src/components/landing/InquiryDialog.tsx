// Marketing-page "Get started" inquiry modal. Styled to match the landing
// page hero gradient (blue → purple → lavender) so it reads as part of the
// same visual world rather than a generic shadcn dialog.
//
// Submits to the public `landing-inquiry` edge function, which mails the
// owner, texts the owner, and sends confirmations to the inquirer.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InquiryDialogProps {
  open: boolean;
  onClose: () => void;
}

const PROMO_GRADIENT =
  "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)";
const SANS = "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif";

export function InquiryDialog({ open, onClose }: InquiryDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "landing-inquiry",
        {
          body: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
            organization: organization.trim() || undefined,
            role: role.trim() || undefined,
            message: message.trim() || undefined,
          },
        },
      );
      if (fnError) throw fnError;
      if (data && (data as any).ok === false) {
        throw new Error((data as any).error || "Submission failed");
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
        className="relative w-full max-w-lg my-auto rounded-3xl shadow-2xl overflow-hidden"
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
          <h2
            className="text-2xl sm:text-3xl font-bold leading-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            {sent ? "You're on the list." : "Let's set up your program."}
          </h2>
          <p className="mt-2 text-white/85 text-sm sm:text-base">
            {sent
              ? "Kevin will reach out personally within one business day."
              : "Tell us a bit about your group and we'll get your branded site live in ten minutes."}
          </p>
        </div>

        <div className="bg-white px-7 sm:px-10 py-7 sm:py-8">
          {sent ? (
            <div className="text-center py-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: PROMO_GRADIENT }}
              >
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Thanks, {name.split(" ")[0] || "friend"}.
              </h3>
              <p className="text-slate-600 text-sm mb-6">
                A confirmation is on its way to{" "}
                <span className="font-medium text-slate-900">{email}</span>
                {phone ? <> and {phone}</> : null}.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://demo.gleeworld.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
                  style={{ background: PROMO_GRADIENT }}
                >
                  Open the live demo <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Your name *" htmlFor="inq-name">
                <input
                  id="inq-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Jane Doe"
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Email *" htmlFor="inq-email">
                  <input
                    id="inq-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="Phone" htmlFor="inq-phone">
                  <input
                    id="inq-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    placeholder="(555) 123-4567"
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Organization" htmlFor="inq-org">
                  <input
                    id="inq-org"
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className={inputClass}
                    placeholder="Lincoln HS Chorus"
                  />
                </Field>
                <Field label="Your role" htmlFor="inq-role">
                  <input
                    id="inq-role"
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={inputClass}
                    placeholder="Director"
                  />
                </Field>
              </div>

              <Field label="Anything we should know?" htmlFor="inq-msg">
                <textarea
                  id="inq-msg"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`${inputClass} resize-none`}
                  placeholder="Group size, timeline, what you're hoping to solve…"
                />
              </Field>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: PROMO_GRADIENT }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    Send inquiry <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-xs text-slate-500 text-center">
                No spam. We'll only use this to get you set up.
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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
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
