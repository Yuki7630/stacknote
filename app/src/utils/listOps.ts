import { newId } from './blockFactory';
import type { ListBlock, ListItem } from '@/types/note';

export function toggleListStyle(block: ListBlock): ListBlock {
  return { ...block, style: block.style === 'bullet' ? 'check' : 'bullet' };
}

export function setItemText(block: ListBlock, itemId: string, text: string): ListBlock {
  return { ...block, items: block.items.map((i) => (i.id === itemId ? { ...i, text } : i)) };
}

export function toggleItemChecked(block: ListBlock, itemId: string): ListBlock {
  return { ...block, items: block.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)) };
}

/**
 * Applies text typed into an item that contains newlines (Enter or a multi-line paste):
 * the first line stays in the item, each following line becomes a new item after it.
 * Returns the updated block and the id of the last new item (to focus it).
 */
export function splitItem(block: ListBlock, itemId: string, text: string): { block: ListBlock; focusId: string } | null {
  const index = block.items.findIndex((i) => i.id === itemId);
  const item = block.items[index];
  if (!item) return null;

  const [first = '', ...rest] = text.split(/\r?\n/);
  const created: ListItem[] = rest.map((line) => ({ id: newId(), text: line }));
  const last = created[created.length - 1];
  if (!last) return null;

  const items = [...block.items];
  items.splice(index, 1, { ...item, text: first }, ...created);
  return { block: { ...block, items }, focusId: last.id };
}

/** Removes an item. Returns the previous item (to focus it), or null if it is the only item. */
export function removeItem(block: ListBlock, itemId: string): { block: ListBlock; previous: ListItem } | null {
  const index = block.items.findIndex((i) => i.id === itemId);
  const previous = block.items[index - 1];
  if (index <= 0 || !previous) return null;
  return { block: { ...block, items: block.items.filter((i) => i.id !== itemId) }, previous };
}
