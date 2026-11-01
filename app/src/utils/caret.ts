/**
 * Maps a cursor position in `prev` to the equivalent position in `next` after an
 * external change (e.g. a synced edit from another device), so the cursor stays
 * next to the same text instead of jumping to the end.
 * - before the changed region: unchanged
 * - after it: keeps its distance from the end of the text
 * - inside it: moves to the end of the new text in that region
 */
export function mapCaret(prev: string, next: string, pos: number): number {
  const max = Math.min(prev.length, next.length);
  let prefix = 0;
  while (prefix < max && prev[prefix] === next[prefix]) prefix++;
  let suffix = 0;
  while (suffix < max - prefix && prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;

  if (pos <= prefix) return Math.min(pos, next.length);
  if (pos >= prev.length - suffix) return Math.max(0, Math.min(next.length, next.length - (prev.length - pos)));
  return next.length - suffix;
}
