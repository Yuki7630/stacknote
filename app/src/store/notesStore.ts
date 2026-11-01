import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Block, BlockType, Note } from '@/types/note';

import { createBlock, newId } from '@/utils/blockFactory';
import { debouncedStorage } from './debouncedStorage';

type NotesState = {
  notes: Record<string, Note>;
  hydrated: boolean;
  /** Pull cursor: the highest server updatedAt seen so far (not this device's clock). */
  lastSyncAt: number;

  createNote: () => string;
  updateNote: (id: string, patch: Partial<Pick<Note, 'title'>>) => void;
  deleteNote: (id: string) => void;

  addBlock: (noteId: string, type: BlockType, index?: number) => string | undefined;
  updateBlock: (noteId: string, block: Block) => void;
  removeBlock: (noteId: string, blockId: string) => void;
  moveBlock: (noteId: string, fromIndex: number, toIndex: number) => void;

  // Sync only — these do not bump updatedAt or set dirty.
  /** Clears dirty on pushed notes that were not edited again after the snapshot was taken. */
  markPushed: (pushed: Pick<Note, 'id' | 'updatedAt'>[]) => void;
  /** Merges pulled notes with last-write-wins and advances lastSyncAt. */
  applyRemote: (remote: Note[]) => void;
};

/** Marks a note as locally edited: bumps updatedAt and sets dirty. */
function touch(note: Note, changes: Partial<Note>): Note {
  return { ...note, ...changes, updatedAt: Date.now(), dirty: true };
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => {
      /** Applies `fn` to one note; no-op if the note does not exist. */
      const editNote = (id: string, fn: (note: Note) => Partial<Note> | null) => {
        const note = get().notes[id];
        if (!note) return;
        const changes = fn(note);
        if (!changes) return;
        set((s) => ({ notes: { ...s.notes, [id]: touch(note, changes) } }));
      };

      return {
        notes: {},
        hydrated: false,
        lastSyncAt: 0,

        createNote: () => {
          const id = newId();
          const note: Note = {
            id,
            title: '',
            blocks: [createBlock('text')],
            updatedAt: Date.now(),
            dirty: true,
          };
          set((s) => ({ notes: { ...s.notes, [id]: note } }));
          return id;
        },

        updateNote: (id, patch) => editNote(id, () => patch),

        deleteNote: (id) => editNote(id, () => ({ deleted: true })),

        addBlock: (noteId, type, index) => {
          const block = createBlock(type);
          let added = false;
          editNote(noteId, (note) => {
            const blocks = [...note.blocks];
            const at = index === undefined ? blocks.length : Math.max(0, Math.min(index, blocks.length));
            blocks.splice(at, 0, block);
            added = true;
            return { blocks };
          });
          return added ? block.id : undefined;
        },

        updateBlock: (noteId, block) =>
          editNote(noteId, (note) => {
            if (!note.blocks.some((b) => b.id === block.id)) return null;
            return { blocks: note.blocks.map((b) => (b.id === block.id ? block : b)) };
          }),

        removeBlock: (noteId, blockId) =>
          editNote(noteId, (note) => {
            if (!note.blocks.some((b) => b.id === blockId)) return null;
            return { blocks: note.blocks.filter((b) => b.id !== blockId) };
          }),

        moveBlock: (noteId, fromIndex, toIndex) =>
          editNote(noteId, (note) => {
            const { length } = note.blocks;
            if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= length || toIndex < 0 || toIndex >= length) {
              return null;
            }
            const blocks = [...note.blocks];
            const [moved] = blocks.splice(fromIndex, 1);
            if (!moved) return null;
            blocks.splice(toIndex, 0, moved);
            return { blocks };
          }),

        // Both sync actions call set() only when something actually changed: zustand's persist
        // middleware serialises and writes the whole store after every set() call, and a new
        // `notes` object re-renders every screen that reads it.
        markPushed: (pushed) => {
          const current = get().notes;
          let notes: Record<string, Note> | null = null;
          for (const p of pushed) {
            const local = (notes ?? current)[p.id];
            // If updatedAt changed, the note was edited during the push: keep it dirty.
            if (local && local.dirty && local.updatedAt === p.updatedAt) {
              notes ??= { ...current };
              notes[p.id] = { ...local, dirty: false };
            }
          }
          if (notes) set({ notes });
        },

        applyRemote: (remote) => {
          const { notes: current, lastSyncAt: previousCursor } = get();
          let notes: Record<string, Note> | null = null;
          let lastSyncAt = previousCursor;
          for (const r of remote) {
            lastSyncAt = Math.max(lastSyncAt, r.updatedAt);
            const local = (notes ?? current)[r.id];
            // Last-write-wins: keep the local note if it is at least as new. Same id + same
            // updatedAt is the same version (e.g. our own push coming back in the pull), so it is
            // left untouched; a newer dirty local note stays dirty and is pushed next time.
            if (local && local.updatedAt >= r.updatedAt) continue;
            notes ??= { ...current };
            notes[r.id] = { ...r, dirty: false };
          }
          if (notes) set({ notes, lastSyncAt });
          else if (lastSyncAt !== previousCursor) set({ lastSyncAt });
        },
      };
    },
    {
      name: 'notes-store',
      version: 1,
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s) => ({ notes: s.notes, lastSyncAt: s.lastSyncAt }),
      onRehydrateStorage: () => () => {
        useNotesStore.setState({ hydrated: true });
      },
    },
  ),
);
