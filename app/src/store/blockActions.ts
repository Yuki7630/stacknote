import { useNotesStore } from '@/store/notesStore';
import type { Block } from '@/types/note';

// Block components edit through these helpers instead of closing over the `block` prop:
// callbacks then depend only on (noteId, blockId), stay stable across renders (so memoized
// rows/cells are not re-rendered) and always start from the latest stored block, never a
// stale copy captured by an older render.

/** The current block from the store (read at event time). */
export function readBlock(noteId: string, blockId: string): Block | undefined {
  return useNotesStore.getState().notes[noteId]?.blocks.find((b) => b.id === blockId);
}

/**
 * Saves `next` unless it is the same object as `prev` (a no-op edit), so cancelled or
 * impossible edits do not bump updatedAt / set dirty / trigger a sync.
 */
export function commitBlock(noteId: string, prev: Block, next: Block): void {
  if (next !== prev) useNotesStore.getState().updateBlock(noteId, next);
}
