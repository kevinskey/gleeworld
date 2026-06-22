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
      launchShowDuration: 2000,
      backgroundColor: '#1e3a8a',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DEFAULT',
    },
  },
};

export default config;
