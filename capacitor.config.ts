import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.68e737ffb69d444d8896ed604144004c',
  appName: 'gleeworld',
  webDir: 'dist',
  server: {
    url: 'https://68e737ff-b69d-444d-8896-ed604144004c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e3a8a',
      showSpinner: false
    }
  }
};

export default config;