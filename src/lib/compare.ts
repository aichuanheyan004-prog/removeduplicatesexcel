import { isEmptyRow, makeDedupeKey } from "./dedupe";
import type { CompareAgainstOptions, ComparisonAnalysis, ComparisonPreviewRow } from "./types";

export function compareRowsAgainst(
  baseRows: string[][],
  comparisonRows: string[][],
  compareFileName: string,
  options: CompareAgainstOptions
): ComparisonAnalysis {
  const headerOffset = options.hasHeader ? 1 : 0;
  const comparisonKeys = new Set<string>();
  let comparisonComparedRows = 0;

  comparisonRows.forEach((row, index) => {
    if (index < headerOffset || isEmptyRow(row)) return;
    comparisonComparedRows += 1;
    comparisonKeys.add(makeDedupeKey(row, options.selectedColumns, options.compare));
  });

  const previewRows: ComparisonPreviewRow[] = [];
  let matchedRows = 0;
  let uniqueRows = 0;
  let emptyRows = 0;
  let baseComparedRows = 0;

  if (options.hasHeader && baseRows[0]) {
    previewRows.push({
      sheetRowIndex: 0,
      rowNumber: 1,
      values: baseRows[0],
      key: "",
      status: "header",
      reason: "Header row is not compared"
    });
  }

  baseRows.forEach((row, sheetRowIndex) => {
    if (sheetRowIndex < headerOffset) return;
    if (isEmptyRow(row)) {
      emptyRows += 1;
      if (previewRows.length < options.previewLimit) {
        previewRows.push({
          sheetRowIndex,
          rowNumber: sheetRowIndex + 1,
          values: row,
          key: "",
          status: "empty",
          reason: "Empty row is ignored for cross-file comparison"
        });
      }
      return;
    }

    baseComparedRows += 1;
    const key = makeDedupeKey(row, options.selectedColumns, options.compare);
    const isMatch = comparisonKeys.has(key);
    if (isMatch) matchedRows += 1;
    else uniqueRows += 1;

    if (previewRows.length < options.previewLimit) {
      previewRows.push({
        sheetRowIndex,
        rowNumber: sheetRowIndex + 1,
        values: row,
        key,
        status: isMatch ? "match" : "unique",
        reason: isMatch ? "This row key also appears in the comparison file" : "This row key was not found in the comparison file"
      });
    }
  });

  return {
    compareFileName,
    compareSheetName: options.compareSheetName,
    baseRows: baseRows.length,
    baseComparedRows,
    comparisonRows: comparisonComparedRows,
    matchedRows,
    uniqueRows,
    emptyRows,
    previewRows
  };
}
