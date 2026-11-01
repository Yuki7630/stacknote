import { create } from 'zustand';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

type SyncStatusState = {
  status: SyncStatus;
  /** Human-readable reason for offline / error. */
  message: string | null;
  /** Device time of the last successful sync, for display only. */
  lastSuccessAt: number | null;
};

/** In-memory only (not persisted): the status always starts fresh at app launch. */
export const useSyncStatusStore = create<SyncStatusState>()(() => ({
  status: 'syncing',
  message: null,
  lastSuccessAt: null,
}));
