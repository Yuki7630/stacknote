import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

const WRITE_DELAY_MS = 300;

const pending = new Map<string, string>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const entries = [...pending.entries()];
  pending.clear();
  await Promise.all(entries.map(([key, value]) => AsyncStorage.setItem(key, value)));
}

// Write immediately when the app leaves the foreground so a pending edit is not lost.
AppState.addEventListener('change', (state) => {
  if (state !== 'active') void flush();
});

/**
 * AsyncStorage wrapper that coalesces rapid writes (one per keystroke) into
 * a single write every WRITE_DELAY_MS. Reads see pending values first.
 */
export const debouncedStorage: StateStorage = {
  getItem: async (key) => pending.get(key) ?? AsyncStorage.getItem(key),
  setItem: (key, value) => {
    pending.set(key, value);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(), WRITE_DELAY_MS);
  },
  removeItem: async (key) => {
    pending.delete(key);
    await AsyncStorage.removeItem(key);
  },
};
