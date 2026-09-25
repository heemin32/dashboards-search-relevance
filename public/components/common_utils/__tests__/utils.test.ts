/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildCsv, escapeCsvCell, isNameValid, sanitizeFileNamePart } from '../utils';

describe('Utils helper functions', () => {
  it('validates isNameValid function', () => {
    expect(isNameValid('Lorem ipsum dolor sit amet, consectetur adipiscing elit,')).toBe(false);
    expect(isNameValid('Lorem ipsum dolor sit amet, consectetur adipiscin')).toBe(true);
  });

  it('quotes every cell in escapeCsvCell', () => {
    expect(escapeCsvCell('doc-id_1')).toBe('"doc-id_1"');
    expect(escapeCsvCell('0.5')).toBe('"0.5"');
    expect(escapeCsvCell(1)).toBe('"1"');
    expect(escapeCsvCell(undefined)).toBe('""');
    expect(escapeCsvCell(null)).toBe('""');
  });

  it('neutralizes formula-leading values in escapeCsvCell', () => {
    expect(escapeCsvCell('=1+1')).toBe(`"'=1+1"`);
    expect(escapeCsvCell('+SUM(A1)')).toBe(`"'+SUM(A1)"`);
    expect(escapeCsvCell('-2')).toBe(`"'-2"`);
    expect(escapeCsvCell('@cmd')).toBe(`"'@cmd"`);
    expect(escapeCsvCell('\tx')).toBe(`"'\tx"`);
    expect(escapeCsvCell('\rx')).toBe(`"'\rx"`);
  });

  it('doubles embedded quotes in escapeCsvCell', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('escapes every header and data cell in buildCsv', () => {
    expect(buildCsv(['a', 'b'], [['=x', '1,"2"']])).toBe(`"a","b"\n"'=x","1,""2"""`);
  });

  it('strips path separators and control characters in sanitizeFileNamePart', () => {
    expect(sanitizeFileNamePart('superhero movies')).toBe('superhero movies');
    expect(sanitizeFileNamePart('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(sanitizeFileNamePart('a\\b:c*d?e"f<g>h|i')).toBe('a_b_c_d_e_f_g_h_i');
    expect(sanitizeFileNamePart('x\u0000y\ny\u007f')).toBe('x_y_y_');
    expect(sanitizeFileNamePart('q'.repeat(500))).toHaveLength(100);
  });
});
