/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildDocumentScoresCsv, buildDocumentScoresFileName } from '../document_score_table';

describe('DocumentScoresTable CSV export', () => {
  it('neutralizes a formula payload and quotes a rating containing a comma and a double quote', () => {
    const csv = buildDocumentScoresCsv([
      { docId: 'doc-1', rating: `=cmd|'/C calc'!A0` },
      { docId: 'doc-2', rating: '0.5,"x"' },
    ]);

    expect(csv.split('\n')).toEqual([
      '"Document ID","Rating"',
      `"doc-1","'=cmd|'/C calc'!A0"`,
      '"doc-2","0.5,""x"""',
    ]);
  });

  it('neutralizes a formula payload in docId', () => {
    const csv = buildDocumentScoresCsv([{ docId: '@SUM(1+1)*cmd|/C calc', rating: '1' }]);

    expect(csv.split('\n')[1]).toBe(`"'@SUM(1+1)*cmd|/C calc","1"`);
  });

  it('sanitizes query text in the download file name', () => {
    const date = new Date('2026-09-25T00:00:00.000Z');

    expect(buildDocumentScoresFileName('../evil\n/name', date)).toBe(
      'document_scores_.._evil__name_2026-09-25T00:00:00.000Z.csv'
    );
  });
});
