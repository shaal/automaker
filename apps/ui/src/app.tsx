import { useState, useCallback, useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { createLogger } from '@automaker/utils/logger';
import { router } from './utils/router';
import { SplashScreen } from './components/splash-screen';
import { useSettingsSync } from './hooks/use-settings-sync';
import { useCursorStatusInit } from './hooks/use-cursor-status-init';
import { useProviderAuthInit } from './hooks/use-provider-auth-init';
import { useAppStore } from './store/app-store';
import { TooltipProvider } from '@/components/ui/tooltip';
import './styles/global.css';
import './styles/theme-imports';
import './styles/font-imports';

const logger = createLogger('App');

// Key for localStorage to persist splash screen preference
const DISABLE_SPLASH_KEY = 'automaker-disable-splash';

export default function App() {
  const disableSplashScreen = useAppStore((state) => state.disableSplashScreen);

  const [showSplash, setShowSplash] = useState(() => {
    // Check localStorage for user preference (available synchronously)
    const savedPreference = localStorage.getItem(DISABLE_SPLASH_KEY);
    if (savedPreference === 'true') {
      return false;
    }
    // Only show splash once per session
    if (sessionStorage.getItem('automaker-splash-shown')) {
      return false;
    }
    return true;
  });

  // Sync the disableSplashScreen setting to localStorage for fast access on next startup
  useEffect(() => {
    localStorage.setItem(DISABLE_SPLASH_KEY, String(disableSplashScreen));
  }, [disableSplashScreen]);

  // Clear accumulated PerformanceMeasure entries to prevent memory leak in dev mode
  // React's internal scheduler creates performance marks/measures that accumulate without cleanup
  useEffect(() => {
    if (import.meta.env.DEV) {
      const clearPerfEntries = () => {
        // Check if window.performance is available before calling its methods
        if (window.performance) {
          window.performance.clearMarks();
          window.performance.clearMeasures();
        }
      };
      const interval = setInterval(clearPerfEntries, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  // Settings are now loaded in __root.tsx after successful session verification
  // This ensures a unified flow: verify session → load settings → redirect
  // We no longer block router rendering here - settings loading happens in __root.tsx

  // Sync settings changes back to server (API-first persistence)
  const settingsSyncState = useSettingsSync();
  if (settingsSyncState.error) {
    logger.error('Settings sync error:', settingsSyncState.error);
  }

  // Initialize Cursor CLI status at startup
  useCursorStatusInit();

  // Initialize Provider auth status at startup (for Claude/Codex usage display)
  useProviderAuthInit();

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('automaker-splash-shown', 'true');
    setShowSplash(false);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router} />
      {showSplash && !disableSplashScreen && <SplashScreen onComplete={handleSplashComplete} />}
    </TooltipProvider>
  );
}
