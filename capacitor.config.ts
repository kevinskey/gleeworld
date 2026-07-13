import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.gleeworld.app',
  appName: 'GleeWorld',
  webDir: 'dist',
  ios: {
    // Required on iOS 16.4+ for Safari Web Inspector to attach to the
    // WKWebView; the old Settings → Safari → Web Inspector toggle no
    // longer applies to in-app webviews.
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      backgroundColor: '#1e3a8a',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      // Edge-to-edge: the webview draws under the clock/battery with a
      // transparent background; headers already pad by
      // env(safe-area-inset-top). Initial style LIGHT = dark text for
      // the app's light theme; dark rooms flip it via
      // src/lib/statusBarStyle.ts.
      overlaysWebView: true,
      style: 'LIGHT',
    },
  },
};

export default config;
