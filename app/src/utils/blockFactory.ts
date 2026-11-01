import { randomUUID } from 'expo-crypto';

import type { Block, BlockType } from '@/types/note';

export function newId(): string {
  return randomUUID();
}

/** Creates an empty block of the given type with fresh ids. */
export function createBlock(type: BlockType): Block {
  switch (type) {
    case 'text':
      return { id: newId(), type: 'text', text: '' };
    case 'list':
      return { id: newId(), type: 'list', style: 'bullet', items: [{ id: newId(), text: '' }] };
    case 'table':
      return {
        id: newId(),
        type: 'table',
        columns: ['', ''],
        rows: [
          ['', ''],
          ['', ''],
        ],
      };
  }
}
