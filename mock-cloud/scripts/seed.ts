// Adds sample notes covering all three block types.
// Uses INSERT OR IGNORE with fixed ids, so it is safe to run repeatedly and never
// overwrites or deletes existing data.
import { createNoteRepo, DB_PATH, openDb } from '../src/db.js';
import type { Note } from '../src/schema.js';

const SEED_TIME = Date.UTC(2026, 9, 1, 9, 0, 0); // 2026-10-01 09:00 UTC

const samples: Note[] = [
  {
    id: 'seed-0001-welcome',
    title: 'Welcome to Notes',
    updatedAt: SEED_TIME,
    blocks: [
      {
        id: 'seed-0001-b1',
        type: 'text',
        text: 'This note came from the mock cloud.\nEdit it on one device and watch it sync to the other.',
      },
    ],
  },
  {
    id: 'seed-0002-shopping',
    title: 'Shopping list',
    updatedAt: SEED_TIME + 60_000,
    blocks: [
      {
        id: 'seed-0002-b1',
        type: 'list',
        style: 'check',
        items: [
          { id: 'seed-0002-i1', text: 'Milk', checked: true },
          { id: 'seed-0002-i2', text: 'Eggs', checked: false },
          { id: 'seed-0002-i3', text: 'Bread' },
        ],
      },
      {
        id: 'seed-0002-b2',
        type: 'list',
        style: 'bullet',
        items: [
          { id: 'seed-0002-i4', text: 'Fresh market on Saturday' },
          { id: 'seed-0002-i5', text: 'Supermarket for the rest' },
        ],
      },
    ],
  },
  {
    id: 'seed-0003-budget',
    title: 'Trip budget',
    updatedAt: SEED_TIME + 120_000,
    blocks: [
      { id: 'seed-0003-b1', type: 'text', text: 'Rough costs for the weekend trip:' },
      {
        id: 'seed-0003-b2',
        type: 'table',
        columns: ['Item', 'Cost (THB)', 'Notes'],
        rows: [
          ['Train', '780', 'Return ticket'],
          ['Hotel', '1,200', '1 night, "Riverside"'],
          ['Food', '600', ''],
        ],
      },
    ],
  },
];

const db = openDb();
const repo = createNoteRepo(db);
let inserted = 0;
for (const note of samples) {
  if (repo.insertIfMissing(note)) inserted++;
}
db.close();

console.log(`Seed: ${inserted} inserted, ${samples.length - inserted} already present (${DB_PATH})`);
