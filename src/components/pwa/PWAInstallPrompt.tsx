import { useState, useEffect } from 'react';
import { X, Download, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';

// GleeWorld PWA install prompt.
//
// Three audiences:
//   1. iOS Safari  → point users at the App Store (Capacitor app is
//      always a better experience than a home-screen shortcut).
//   2. Android Chrome / Edge / desktop Chromium → catch the
//      beforeinstallprompt event, show our themed prompt, call
//      prompt() when the user confirms.
//   3. Already installed (display-mode: standalone) or previously
//      dismissed → render nothing.
//
// Also skipped: the Capacitor webview itself (window.Capacitor is set),
// so users inside the native app never see a "install" nag.
const APP_STORE_URL = 'https://apps.apple.com/us/app/gleeworld/id6779189993';

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);

  useEffect(() => {
    // Already installed as a PWA → nothing to do.
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Running inside the Capacitor iOS app → nothing to do (would look
    // like an install nag inside an already-installed app).
    if ((window as any).Capacitor?.isNativePlatform?.()) return;

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    const ua = window.navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|EdgiOS|FxiOS/i.test(ua);

    if (isIOS && isSafari) {
      // iOS Safari: don't suggest add-to-home-screen — the real app is
      // in the App Store and is a strictly better experience.
      setIsIosSafari(true);
      setShowPrompt(true);
      return;
    }

    // Everything else: wait for the browser's beforeinstallprompt.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') console.log('PWA installed');
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleGetIosApp = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    window.location.href = APP_STORE_URL;
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            {isIosSafari ? (
              <Apple className="w-5 h-5 text-primary" />
            ) : (
              <Download className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              {isIosSafari ? 'Get GleeWorld for iPhone' : 'Install GleeWorld'}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {isIosSafari
                ? 'Get the free GleeWorld iOS app for the best experience — native audio, push notifications, and offline access.'
                : 'Install our app for quick access, offline support, and a better experience!'}
            </p>
            <div className="flex gap-2">
              {isIosSafari ? (
                <Button onClick={handleGetIosApp} size="sm" className="flex-1">
                  Get the App
                </Button>
              ) : (
                <Button onClick={handleInstall} size="sm" className="flex-1">
                  Install
                </Button>
              )}
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
