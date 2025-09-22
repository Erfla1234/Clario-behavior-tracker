import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.behaviortracker.app',
  appName: 'Behavior Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true  // Allow HTTP for local development
  }
};

export default config;
