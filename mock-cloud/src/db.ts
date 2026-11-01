import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { blockSchema, type Note } from './schema.js';

export const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
export const DB_PATH = join(DATA_DIR, 'notes.db');

type NoteRow = {
  id: string;
  title: string;
  blocks: string;
  updated_at: number;
  deleted: number;
};

/**
 * Opens (or creates) the database. Only CREATE ... IF NOT EXISTS here —
 * this file must never drop, truncate or delete anything.
 */
export function openDb(): Database.Database {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      blocks TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);
  `);
  return db;
}

function rowToNote(row: NoteRow): Note {
  const note: Note = {
    id: row.id,
    title: row.title,
    blocks: blockSchema.array().parse(JSON.parse(row.blocks)),
    updatedAt: row.updated_at,
  };
  if (row.deleted) note.deleted = true;
  return note;
}

export function createNoteRepo(db: Database.Database) {
  const selectSince = db.prepare<[number], NoteRow>(
    'SELECT id, title, blocks, updated_at, deleted FROM notes WHERE updated_at > ? ORDER BY updated_at ASC',
  );
  const selectOne = db.prepare<[string], NoteRow>(
    'SELECT id, title, blocks, updated_at, deleted FROM notes WHERE id = ?',
  );
  // Last-write-wins: the row is only replaced when the incoming updatedAt is newer.
  const upsertIfNewer = db.prepare<[string, string, string, number, number]>(`
    INSERT INTO notes (id, title, blocks, updated_at, deleted) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      blocks = excluded.blocks,
      updated_at = excluded.updated_at,
      deleted = excluded.deleted
    WHERE excluded.updated_at > notes.updated_at
  `);
  const insertIgnore = db.prepare<[string, string, string, number, number]>(
    'INSERT OR IGNORE INTO notes (id, title, blocks, updated_at, deleted) VALUES (?, ?, ?, ?, ?)',
  );

  const params = (n: Note): [string, string, string, number, number] => [
    n.id,
    n.title,
    JSON.stringify(n.blocks),
    n.updatedAt,
    n.deleted ? 1 : 0,
  ];

  return {
    /** Notes with updated_at > since, including soft-deleted ones. */
    since(since: number): Note[] {
      return selectSince.all(since).map(rowToNote);
    },

    get(id: string): Note | undefined {
      const row = selectOne.get(id);
      return row ? rowToNote(row) : undefined;
    },

    /** Upserts only if newer. Returns whether it was applied and the note now stored. */
    putIfNewer(note: Note): { applied: boolean; current: Note } {
      const applied = upsertIfNewer.run(...params(note)).changes > 0;
      const current = this.get(note.id);
      if (!current) throw new Error(`note ${note.id} missing after upsert`);
      return { applied, current };
    },

    /** Inserts only if the id does not exist yet. Never overwrites or deletes. */
    insertIfMissing(note: Note): boolean {
      return insertIgnore.run(...params(note)).changes > 0;
    },
  };
}
