import type { TableBlock } from '@/types/note';

// Every row always has exactly columns.length cells; a table keeps at least 1 column and 1 row.

export function setColumnName(block: TableBlock, col: number, text: string): TableBlock {
  return { ...block, columns: block.columns.map((c, i) => (i === col ? text : c)) };
}

export function setCell(block: TableBlock, row: number, col: number, text: string): TableBlock {
  return {
    ...block,
    rows: block.rows.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? text : c)) : r)),
  };
}

export function addRow(block: TableBlock): TableBlock {
  return { ...block, rows: [...block.rows, block.columns.map(() => '')] };
}

export function removeRow(block: TableBlock, row: number): TableBlock {
  if (block.rows.length <= 1) return block;
  return { ...block, rows: block.rows.filter((_, i) => i !== row) };
}

export function addColumn(block: TableBlock): TableBlock {
  return { ...block, columns: [...block.columns, ''], rows: block.rows.map((r) => [...r, '']) };
}

export function removeColumn(block: TableBlock, col: number): TableBlock {
  if (block.columns.length <= 1) return block;
  return {
    ...block,
    columns: block.columns.filter((_, i) => i !== col),
    rows: block.rows.map((r) => r.filter((_, i) => i !== col)),
  };
}
