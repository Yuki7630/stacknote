import { z } from 'zod';

// Server copy of the data model in app/types/note.ts — keep both in sync.
// `dirty` is local-only on the client and is stripped here if sent.

const textBlock = z.object({
  id: z.string().min(1),
  type: z.literal('text'),
  text: z.string(),
});

const listBlock = z.object({
  id: z.string().min(1),
  type: z.literal('list'),
  style: z.enum(['bullet', 'check']),
  items: z.array(
    z.object({
      id: z.string().min(1),
      text: z.string(),
      checked: z.boolean().optional(),
    }),
  ),
});

const tableBlock = z.object({
  id: z.string().min(1),
  type: z.literal('table'),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

export const blockSchema = z.discriminatedUnion('type', [textBlock, listBlock, tableBlock]);

export const noteSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  blocks: z.array(blockSchema),
  updatedAt: z.number().int().nonnegative(),
  deleted: z.boolean().optional(),
});

export type Block = z.infer<typeof blockSchema>;
export type Note = z.infer<typeof noteSchema>;
