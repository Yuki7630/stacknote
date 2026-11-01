import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { TableBlock } from '@/types/note';

import { toCsv } from './csv';

// UTF-8 byte order mark so Excel opens Thai (non-ASCII) text correctly.
const BOM = '\uFEFF';

function safeFileName(base: string): string {
  const cleaned = base
    .replace(/[\\/:*?"<>|\r\n\t]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return `${cleaned || 'table'}.csv`;
}

/**
 * Exports a table block as CSV.
 * Native: writes the file to the cache directory with the expo-file-system `File` API
 * (SDK 54+ object API; `write` is synchronous) and opens the share sheet.
 * Web: expo-file-system's File is not implemented there, so the CSV is downloaded via a Blob.
 */
export async function exportTableCsv(block: TableBlock, baseName: string): Promise<void> {
  const csv = BOM + toCsv(block.columns, block.rows);
  const name = safeFileName(baseName);

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(csv);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: `Export ${name}`,
  });
}
