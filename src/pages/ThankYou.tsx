import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Mail } from "lucide-react";

const SANS = "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif";

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: SANS }}>
      <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12"
              style={{
                backgroundImage: 'url(/lovable-uploads/gleeworld-logo.png?v=6)',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <span className="font-bold text-xl sm:text-2xl tracking-tight" style={{ letterSpacing: '-0.02em', color: '#000618' }}>
              GleeWorld
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-20 sm:pt-28 text-center">
        <div
          className="inline-flex w-16 h-16 sm:w-20 sm:h-20 rounded-full items-center justify-center mb-6"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #c084fc)' }}
        >
          <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>

        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4"
          style={{ letterSpacing: '-0.03em' }}
        >
          You're in.
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-10 max-w-lg mx-auto leading-relaxed">
          Thanks for choosing GleeWorld. We're spinning up your private site right now —
          this takes about two minutes.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 text-left max-w-lg mx-auto">
          <div className="flex items-start gap-4 mb-5">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-sm">1</div>
            <div>
              <div className="font-semibold mb-1">Check your inbox</div>
              <div className="text-sm text-slate-600">A welcome email is on its way with the link to set your password.</div>
            </div>
          </div>
          <div className="flex items-start gap-4 mb-5">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-sm">2</div>
            <div>
              <div className="font-semibold mb-1">Set your password</div>
              <div className="text-sm text-slate-600">Click the link in the email — it opens your new site so you can choose a password.</div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-sm">3</div>
            <div>
              <div className="font-semibold mb-1">Set up your brand</div>
              <div className="text-sm text-slate-600">A quick wizard guides you through uploading your logo and picking your colors.</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 mt-10">
          Don't see the email after a few minutes? Check spam, then email{' '}
          <a href="mailto:kevin@gleeworld.org" className="text-sky-700 underline inline-flex items-center gap-1">
            <Mail className="w-3 h-3" /> kevin@gleeworld.org
          </a>{' '}
          and we'll send a fresh link manually.
        </p>
      </main>

      <footer className="py-12 mt-16 border-t border-slate-200 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} GleeWorld
      </footer>
    </div>
  );
}
