import type { Note } from '@/types/note';

import { CloudError, OfflineError, type CloudAdapter } from './CloudAdapter';

const TOKEN = 'dev-token';
const TIMEOUT_MS = 10_000;

/**
 * Talks to mock-cloud over REST. Uses the global fetch, which is expo/fetch since SDK 56.
 * Base URL comes from EXPO_PUBLIC_API_URL in app/.env (inlined at bundle time).
 */
export class MockCloudAdapter implements CloudAdapter {
  constructor(private readonly baseUrl: string | undefined = process.env.EXPO_PUBLIC_API_URL) {}

  async pull(since: number): Promise<Note[]> {
    const body = await this.request(`/notes?since=${since}`, { method: 'GET' });
    if (!Array.isArray(body) || !body.every(isNote)) {
      throw new CloudError('Unexpected response from GET /notes');
    }
    return body;
  }

  async push(notes: Note[]): Promise<void> {
    const results = await Promise.allSettled(
      notes.map((note) => {
        // dirty is local only and never sent to the server.
        const { dirty: _dirty, ...payload } = note;
        return this.request(`/notes/${encodeURIComponent(note.id)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }),
    );
    const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failure) throw failure.reason;
  }

  private async request(path: string, init: { method: 'GET' | 'PUT'; body?: string }): Promise<unknown> {
    if (!this.baseUrl) {
      throw new CloudError('EXPO_PUBLIC_API_URL is not set (see app/.env)');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl.replace(/\/+$/, '')}${path}`, {
        method: init.method,
        body: init.body,
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
        signal: controller.signal,
      });
    } catch (err) {
      throw new OfflineError(controller.signal.aborted ? 'Request timed out' : 'Server unreachable', { cause: err });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new CloudError(`${init.method} ${path} failed with HTTP ${res.status}`, res.status);
    }
    try {
      return (await res.json()) as unknown;
    } catch {
      throw new CloudError(`${init.method} ${path} returned invalid JSON`, res.status);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Shallow shape check of a note from the server (the server validates fully with zod). */
function isNote(value: unknown): value is Note {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    Array.isArray(value.blocks) &&
    typeof value.updatedAt === 'number'
  );
}
