import { registerPlugin } from '@capacitor/core';

export interface TestFlightDetectorPlugin {
  isTestFlight(): Promise<{ isTestFlight: boolean }>;
}

const TestFlightDetector = registerPlugin<TestFlightDetectorPlugin>('TestFlightDetector', {
  web: () => ({
    isTestFlight: async () => {
      // Web is never TestFlight
      return { isTestFlight: false };
    },
  }),
});

export { TestFlightDetector };
