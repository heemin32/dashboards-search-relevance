/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiFlexGroup,
  EuiTitle,
  EuiPanel,
  EuiFlexItem,
  EuiBasicTable,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { buildCsv, sanitizeFileNamePart } from '../../common_utils/utils';

/**
 * Build the document scores CSV. docId and rating come from stored judgments (docIds can be set by
 * anyone able to index into the evaluated index), so every cell is escaped against formula injection.
 */
export const buildDocumentScoresCsv = (documentScores: Array<{ docId: string; rating: string }>) =>
  buildCsv(
    ['Document ID', 'Rating'],
    documentScores.map((item) => [item.docId, item.rating])
  );

/** Build the download file name, sanitizing the user-provided query text. */
export const buildDocumentScoresFileName = (queryText: string, date: Date) =>
  `document_scores_${sanitizeFileNamePart(queryText)}_${date.toISOString()}.csv`;

export const DocumentScoresTable: React.FC<{
  queryText: string;
  documentScores: Array<{ docId: string; rating: string }>;
}> = ({ queryText, documentScores }) => {
  const downloadCsv = () => {
    const csvContent = buildDocumentScoresCsv(documentScores);

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', buildDocumentScoresFileName(queryText, new Date()));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>Document Scores for "{queryText}"</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={downloadCsv} iconType="download">
            Download CSV
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        items={documentScores}
        columns={[
          {
            field: 'docId',
            name: 'Document ID',
            sortable: true,
          },
          {
            field: 'rating',
            name: 'Rating',
            sortable: true,
          },
        ]}
      />
    </EuiPanel>
  );
};
