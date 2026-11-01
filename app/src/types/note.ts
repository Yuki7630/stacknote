// Single source of truth for the data model.
// mock-cloud keeps a zod copy of these types — keep both in sync.

export type TextBlock = { id: string; type: 'text'; text: string };

export type ListItem = { id: string; text: string; checked?: boolean };

export type ListBlock = {
  id: string;
  type: 'list';
  style: 'bullet' | 'check';
  items: ListItem[];
};

export type TableBlock = {
  id: string;
  type: 'table';
  columns: string[];
  rows: string[][];
};

export type Block = TextBlock | ListBlock | TableBlock;

export type BlockType = Block['type'];

export type Note = {
  id: string;
  title: string;
  blocks: Block[];
  updatedAt: number; // ms epoch, set on every local edit
  deleted?: boolean; // soft delete
  dirty?: boolean; // local only, never sent to server
};
