/**
 * RFC 4180 CSV. A field is quoted when it contains a comma, double quote, CR or LF
 * (or leading/trailing spaces, which some readers trim); quotes inside are doubled.
 * Rows end with CRLF.
 */
export function csvField(value: string): string {
  if (/[",\r\n]/.test(value) || /^\s|\s$/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}
