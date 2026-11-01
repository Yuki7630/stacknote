import type { Block, Note } from '@/types/note';

export function blockText(block: Block): string {
  switch (block.type) {
    case 'text':
      return block.text;
    case 'list':
      return block.items.map((i) => i.text).join(' ');
    case 'table':
      return [...block.columns, ...block.rows.flat()].join(' ');
  }
}

/** First non-empty line of the note's content, for the note list. */
export function notePreview(note: Note): string {
  for (const block of note.blocks) {
    const line = blockText(block)
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    if (line) return line;
  }
  return '';
}

export function formatUpdatedAt(ms: number): string {
  const date = new Date(ms);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
