import type { Note } from '@/types/note';

/** The only way the app talks to a cloud backend. UI and store never call fetch directly. */
export interface CloudAdapter {
  /** Notes changed on the server with updatedAt > since, including soft-deleted ones. */
  pull(since: number): Promise<Note[]>;
  /**
   * Sends notes to the server (server keeps the newer one per note).
   * Rejects if any note failed; re-pushing is safe because the server ignores
   * a note that is not newer than what it has.
   */
  push(notes: Note[]): Promise<void>;
}

/** Server unreachable: no network, wrong IP, firewall, or timeout. */
export class OfflineError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'OfflineError';
  }
}

/** Server reachable but the request failed (HTTP error status or bad response). */
export class CloudError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'CloudError';
  }
}
