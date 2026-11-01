import { AppState, Platform } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';
import { useSyncStatusStore } from '@/store/syncStatusStore';

import { isActivityHeld, onActivity, reportActivity } from './activity';
import { isSyncBusy, syncNow } from './syncEngine';

const IDLE_MS = 10_000;

/**
 * Auto sync: while enabled and in the foreground, syncs after IDLE_MS without user
 * activity, then again every IDLE_MS while still idle. Any activity, or any sync
 * finishing (debounce, manual, retry, or this one), restarts the countdown, so it
 * never overlaps a running sync or duplicates the 2 s post-edit debounce.
 * Returns a function that stops it.
 */
export function startAutoSync(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let foreground = AppState.currentState === 'active';

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const restart = () => {
    clear();
    const { autoSync, hydrated } = useSettingsStore.getState();
    if (autoSync && hydrated && foreground && !isActivityHeld()) timer = setTimeout(tick, IDLE_MS);
  };

  const tick = () => {
    timer = null;
    // A sync is running or a debounced one is about to: let it do the work.
    if (isSyncBusy()) {
      restart();
      return;
    }
    void syncNow(); // the countdown restarts when this sync settles (below)
  };

  const unsubActivity = onActivity(restart);

  const unsubSettings = useSettingsStore.subscribe((s, prev) => {
    if (s.autoSync !== prev.autoSync || s.hydrated !== prev.hydrated) restart();
  });

  const unsubStatus = useSyncStatusStore.subscribe((s, prev) => {
    if (s.status === 'syncing') clear();
    else if (prev.status === 'syncing') restart();
  });

  const appState = AppState.addEventListener('change', (state) => {
    foreground = state === 'active';
    restart(); // stops in background, starts a fresh countdown on return
  });

  // On web, mouse-wheel scrolling and key presses do not go through the touch responder system.
  const webEvents = ['wheel', 'keydown', 'pointerdown'] as const;
  if (Platform.OS === 'web') {
    for (const e of webEvents) window.addEventListener(e, reportActivity, { passive: true });
  }

  restart();

  return () => {
    clear();
    unsubActivity();
    unsubSettings();
    unsubStatus();
    appState.remove();
    if (Platform.OS === 'web') {
      for (const e of webEvents) window.removeEventListener(e, reportActivity);
    }
  };
}
