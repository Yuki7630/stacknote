import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type SettingsState = {
  /** Periodic pull while the app is idle in the foreground. Off by default. */
  autoSync: boolean;
  hydrated: boolean;
  setAutoSync: (on: boolean) => void;
};

/** Device-local preferences. Stored under its own key and never synced to the server. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoSync: false,
      hydrated: false,
      setAutoSync: (autoSync) => set({ autoSync }),
    }),
    {
      name: 'settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ autoSync: s.autoSync }),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hydrated: true });
      },
    },
  ),
);
