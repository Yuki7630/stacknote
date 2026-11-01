import { AppState } from 'react-native';

import { useNotesStore } from '@/store/notesStore';
import { useSyncStatusStore, type SyncStatus } from '@/store/syncStatusStore';
import type { Note } from '@/types/note';

import { reportActivity } from './activity';
import { OfflineError, type CloudAdapter } from './CloudAdapter';
import { MockCloudAdapter } from './MockCloudAdapter';

const EDIT_DEBOUNCE_MS = 2_000;
// Retry delays after a failed sync, so MOCK_FAIL_RATE / flaky Wi-Fi recover without user action.
const RETRY_DELAYS_MS = [3_000, 10_000, 30_000, 60_000];

const adapter: CloudAdapter = new MockCloudAdapter();

let running = false;
let rerunRequested = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;

function setStatus(status: SyncStatus, message: string | null = null) {
  useSyncStatusStore.setState((s) => ({
    status,
    message,
    lastSuccessAt: status === 'synced' ? Date.now() : s.lastSuccessAt,
  }));
}

/** True while a sync is running or a post-edit debounced sync is pending. */
export function isSyncBusy(): boolean {
  return running || debounceTimer !== null;
}

/**
 * A local edit replaces a note object with one that is dirty. Server merges
 * (applyRemote / markPushed) always produce non-dirty notes, so they never match.
 */
function hasLocalEdit(next: Record<string, Note>, prev: Record<string, Note>): boolean {
  if (next === prev) return false;
  return Object.entries(next).some(([id, note]) => note !== prev[id] && note.dirty === true);
}

function dirtyNotes(): Note[] {
  return Object.values(useNotesStore.getState().notes).filter((n) => n.dirty);
}

/**
 * One sync round: push dirty notes, then pull changes since lastSyncAt and merge (LWW).
 * Local data is only changed through markPushed/applyRemote, so a failure at any
 * step leaves every local note (and its dirty flag) as it was.
 */
async function syncOnce(): Promise<void> {
  const { markPushed, applyRemote } = useNotesStore.getState();

  const toPush = dirtyNotes();
  if (toPush.length > 0) {
    await adapter.push(toPush);
    markPushed(toPush.map((n) => ({ id: n.id, updatedAt: n.updatedAt })));
  }

  const remote = await adapter.pull(useNotesStore.getState().lastSyncAt);
  applyRemote(remote);
}

/** Runs a sync now. If one is already running, another round runs right after it. */
export async function syncNow(): Promise<void> {
  if (!useNotesStore.getState().hydrated) return;
  if (running) {
    rerunRequested = true;
    return;
  }
  if (debounceTimer) clearTimeout(debounceTimer);
  if (retryTimer) clearTimeout(retryTimer);
  debounceTimer = null;
  retryTimer = null;

  running = true;
  setStatus('syncing');
  try {
    do {
      rerunRequested = false;
      await syncOnce();
    } while (rerunRequested);
    failures = 0;
    setStatus('synced');
  } catch (err) {
    const offline = err instanceof OfflineError;
    setStatus(offline ? 'offline' : 'error', err instanceof Error ? err.message : String(err));
    const delay = RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)] ?? 60_000;
    failures++;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void syncNow();
    }, delay);
  } finally {
    running = false;
  }
}

function scheduleDebouncedSync() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // Clear the handle first: syncNow may return early (sync already running), and a
    // stale handle would make isSyncBusy() report true forever.
    debounceTimer = null;
    void syncNow();
  }, EDIT_DEBOUNCE_MS);
}

/**
 * Starts the sync triggers: app start (after local data is loaded), app returning to
 * the foreground, and 2 s after the last local edit. Returns a function that stops them.
 */
export function startSyncEngine(): () => void {
  // App start: wait for AsyncStorage hydration so we never merge into an empty store.
  const unsubHydration = useNotesStore.subscribe((s, prev) => {
    if (s.hydrated && !prev.hydrated) void syncNow();
  });
  if (useNotesStore.getState().hydrated) void syncNow();

  // Local edits: schedule the debounced sync and count as user activity for auto sync.
  const unsubEdits = useNotesStore.subscribe((s, prev) => {
    if (s.hydrated && hasLocalEdit(s.notes, prev.notes)) {
      reportActivity();
      scheduleDebouncedSync();
    }
  });

  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncNow();
  });

  return () => {
    unsubHydration();
    unsubEdits();
    appState.remove();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (retryTimer) clearTimeout(retryTimer);
    debounceTimer = null;
    retryTimer = null;
  };
}
