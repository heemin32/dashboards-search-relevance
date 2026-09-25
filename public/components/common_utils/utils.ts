/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Name validation 0>Name<=50
export const isNameValid = (name: string) => {
  return name.length >= 50 || name.length === 0 ? false : true;
};

// Characters that make spreadsheet apps treat a cell as a formula (CSV/formula injection).
const CSV_FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Escape a value for use as a single CSV cell, following OWASP CSV injection guidance. A value a
 * spreadsheet would evaluate as a formula is prefixed with a single quote, then every cell is
 * wrapped in double quotes with embedded quotes doubled (RFC 4180).
 */
export const escapeCsvCell = (value: unknown): string => {
  let cell = value === null || value === undefined ? '' : String(value);
  if (CSV_FORMULA_PREFIXES.some((prefix) => cell.startsWith(prefix))) {
    cell = `'${cell}`;
  }
  return `"${cell.replace(/"/g, '""')}"`;
};

/**
 * Build CSV content from a header row and data rows, escaping every cell with {@link escapeCsvCell}.
 */
export const buildCsv = (headers: unknown[], rows: unknown[][]): string =>
  [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');

const MAX_FILE_NAME_PART_LENGTH = 100;

/**
 * Make a user-influenced value safe to embed in a download file name: path separators, control
 * characters and characters reserved on common file systems are replaced with "_", and the result
 * is truncated to a bounded length.
 */
export const sanitizeFileNamePart = (value: string): string =>
  // eslint-disable-next-line no-control-regex
  value.replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, '_').slice(0, MAX_FILE_NAME_PART_LENGTH);
