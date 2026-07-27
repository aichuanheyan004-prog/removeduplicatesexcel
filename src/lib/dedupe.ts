import type {
  AnalyzeOptions,
  ColumnMeta,
  CompareOptions,
  DedupeAnalysis,
  DuplicateGroupPreview,
  PreviewRow
} from "./types";

const KEY_SEPARATOR = "\u001f";

export function excelColumnName(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    n = Math.floor((n - mod) / 26);
  }
  return name;
}

export function isEmptyRow(row: string[] | undefined): boolean {
  if (!row) return true;
  return row.every((cell) => String(cell ?? "").trim() === "");
}

export function normalizeCell(value: string | undefined, options: CompareOptions): string {
  let next = String(value ?? "");
  if (options.trimWhitespace) next = next.trim();
  if (options.ignoreCase) next = next.toLocaleLowerCase("en-US");
  return next;
}

export function columnMetadata(rows: string[][], hasHeader: boolean): ColumnMeta[] {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const header = hasHeader ? rows[0] ?? [] : [];
  const seen = new Map<string, number>();

  return Array.from({ length: maxColumns }, (_, index) => {
    const excelName = excelColumnName(index);
    const rawLabel = hasHeader ? String(header[index] ?? "").trim() : "";
    const baseLabel = rawLabel || `Column ${excelName}`;
    const seenCount = seen.get(baseLabel) ?? 0;
    seen.set(baseLabel, seenCount + 1);
    const label = seenCount === 0 ? baseLabel : `${baseLabel} (${seenCount + 1})`;
    const dataStart = hasHeader ? 1 : 0;
    const nonEmptyCount = rows
      .slice(dataStart)
      .filter((row) => String(row[index] ?? "").trim() !== "").length;

    return {
      index,
      label,
      sourceLabel: rawLabel,
      excelName,
      nonEmptyCount
    };
  });
}

export function defaultSelectedColumns(columns: ColumnMeta[]): number[] {
  const populated = columns.filter((column) => column.nonEmptyCount > 0).map((column) => column.index);
  return populated.length > 0 ? populated : columns.map((column) => column.index);
}

export function makeDedupeKey(row: string[], selectedColumns: number[], compare: CompareOptions): string {
  return selectedColumns.map((index) => normalizeCell(row[index], compare)).join(KEY_SEPARATOR);
}

export function analyzeRows(rows: string[][], options: AnalyzeOptions): DedupeAnalysis {
  const columns = columnMetadata(rows, options.hasHeader);
  const selectedColumns =
    options.selectedColumns.length > 0 ? options.selectedColumns : defaultSelectedColumns(columns);
  const headerOffset = options.hasHeader ? 1 : 0;
  const rowEntries: Array<{ sheetRowIndex: number; row: string[]; key: string }> = [];
  let emptyRows = 0;

  rows.forEach((row, sheetRowIndex) => {
    if (sheetRowIndex < headerOffset) return;
    if (isEmptyRow(row)) {
      emptyRows += 1;
      return;
    }
    rowEntries.push({
      sheetRowIndex,
      row,
      key: makeDedupeKey(row, selectedColumns, options.compare)
    });
  });

  const groups = new Map<string, Array<{ sheetRowIndex: number; row: string[] }>>();
  rowEntries.forEach((entry) => {
    const next = groups.get(entry.key) ?? [];
    next.push({ sheetRowIndex: entry.sheetRowIndex, row: entry.row });
    groups.set(entry.key, next);
  });

  const removeSet = new Set<number>();
  const keepSet = new Set<number>();
  const duplicateGroups: Array<[string, Array<{ sheetRowIndex: number; row: string[] }>]> = [];

  for (const [key, group] of groups) {
    if (group.length <= 1) {
      keepSet.add(group[0].sheetRowIndex);
      continue;
    }
    duplicateGroups.push([key, group]);
    if (options.strategy === "first") {
      group.forEach((entry, index) => (index === 0 ? keepSet.add(entry.sheetRowIndex) : removeSet.add(entry.sheetRowIndex)));
    } else if (options.strategy === "last") {
      group.forEach((entry, index) =>
        index === group.length - 1 ? keepSet.add(entry.sheetRowIndex) : removeSet.add(entry.sheetRowIndex)
      );
    } else {
      group.forEach((entry) => removeSet.add(entry.sheetRowIndex));
    }
  }

  const groupIndexByRow = new Map<number, number>();
  const groupPreviews: DuplicateGroupPreview[] = duplicateGroups.slice(0, 12).map(([key, group], index) => {
    const groupId = index + 1;
    group.forEach((entry) => groupIndexByRow.set(entry.sheetRowIndex, groupId));
    return {
      groupId,
      keyPreview: key.split(KEY_SEPARATOR).join(" | ").slice(0, 160) || "(blank key)",
      rowNumbers: group.map((entry) => entry.sheetRowIndex + 1),
      keptRowNumbers: group.filter((entry) => keepSet.has(entry.sheetRowIndex)).map((entry) => entry.sheetRowIndex + 1),
      removedRowNumbers: group.filter((entry) => removeSet.has(entry.sheetRowIndex)).map((entry) => entry.sheetRowIndex + 1)
    };
  });

  const previewRows: PreviewRow[] = [];
  if (options.hasHeader && rows[0]) {
    previewRows.push({
      sheetRowIndex: 0,
      rowNumber: 1,
      values: rows[0],
      key: "",
      groupId: null,
      action: "header",
      reason: "Header row is not compared"
    });
  }

  for (let sheetRowIndex = headerOffset; sheetRowIndex < rows.length && previewRows.length < options.previewLimit; sheetRowIndex += 1) {
    const row = rows[sheetRowIndex] ?? [];
    if (isEmptyRow(row)) {
      previewRows.push({
        sheetRowIndex,
        rowNumber: sheetRowIndex + 1,
        values: row,
        key: "",
        groupId: null,
        action: "empty",
        reason: "Empty row is kept and not compared"
      });
      continue;
    }
    const key = makeDedupeKey(row, selectedColumns, options.compare);
    const action = removeSet.has(sheetRowIndex) ? "remove" : "keep";
    previewRows.push({
      sheetRowIndex,
      rowNumber: sheetRowIndex + 1,
      values: row,
      key,
      groupId: groupIndexByRow.get(sheetRowIndex) ?? null,
      action,
      reason: action === "remove" ? "Will be removed on export" : "Will remain in the cleaned file"
    });
  }

  const totalRows = rows.length;
  const dataRows = Math.max(0, totalRows - headerOffset);
  const duplicateRows = duplicateGroups.reduce((count, [, group]) => count + group.length, 0);
  const rowsToRemove = removeSet.size;

  return {
    columns,
    selectedColumns,
    totalRows,
    dataRows,
    emptyRows,
    comparedRows: rowEntries.length,
    duplicateGroups: duplicateGroups.length,
    duplicateRows,
    rowsToRemove,
    rowsToKeep: totalRows - rowsToRemove,
    previewRows,
    duplicateGroupPreviews: groupPreviews,
    removeSheetRowIndexes: Array.from(removeSet).sort((a, b) => a - b),
    cleanedRowCount: totalRows - rowsToRemove
  };
}

export function buildCleanRows(rows: string[][], analysis: DedupeAnalysis): string[][] {
  const removeSet = new Set(analysis.removeSheetRowIndexes);
  return rows.filter((_, index) => !removeSet.has(index)).map((row) => [...row]);
}
