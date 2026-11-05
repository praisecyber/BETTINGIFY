import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bettingify.mobile',
  appName: 'Bettingify',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  backgroundColor: '#000000',
};

export default config;
