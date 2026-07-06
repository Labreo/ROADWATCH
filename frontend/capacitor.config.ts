import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.roadwatch.civic',
  appName: 'ROADWATCH',
  webDir: 'out',
  plugins: {
    Camera: { permissions: ['camera', 'photos'] },
    Geolocation: { enableHighAccuracy: true },
  },
};

export default config;
