import type { Note } from '@/types/note';

import { blockText } from './notePreview';

/** Case-insensitive match of `query` against the note title and the text of every block. */
export function noteMatches(note: Note, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  if (note.title.toLocaleLowerCase().includes(q)) return true;
  return note.blocks.some((b) => blockText(b).toLocaleLowerCase().includes(q));
}
