import { Transform } from 'node:stream';

const CSV_COLUMNS = ['name', 'email', 'message', 'stage', 'source', 'created_at'] as const;

function escapeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function csvHeaderRow(): string {
  return `${CSV_COLUMNS.join(',')}\n`;
}

export function createCsvRowTransform(): Transform {
  return new Transform({
    objectMode: true,
    transform(row: Record<string, unknown>, _encoding, callback) {
      const line = CSV_COLUMNS.map((column) => escapeCsvValue(row[column])).join(',');
      callback(null, `${line}\n`);
    },
  });
}
