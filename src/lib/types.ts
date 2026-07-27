export type FileKind = "xlsx" | "csv";
export type KeepStrategy = "first" | "last" | "none";

export interface CompareOptions {
  trimWhitespace: boolean;
  ignoreCase: boolean;
}

export interface SheetData {
  name: string;
  rows: string[][];
}

export interface ParsedWorkbook {
  fileName: string;
  fileKind: FileKind;
  fileSize: number;
  sheets: SheetData[];
  warnings: string[];
}

export interface SheetSummary {
  name: string;
  rowCount: number;
  dataRowCount: number;
  columnCount: number;
}

export interface WorkbookSummary {
  fileName: string;
  fileKind: FileKind;
  fileSize: number;
  sheets: SheetSummary[];
  warnings: string[];
}

export interface ColumnMeta {
  index: number;
  label: string;
  sourceLabel: string;
  excelName: string;
  nonEmptyCount: number;
}

export interface AnalyzeOptions {
  sheetName: string;
  hasHeader: boolean;
  selectedColumns: number[];
  strategy: KeepStrategy;
  compare: CompareOptions;
  previewLimit: number;
}

export interface PreviewRow {
  sheetRowIndex: number;
  rowNumber: number;
  values: string[];
  key: string;
  groupId: number | null;
  action: "header" | "keep" | "remove" | "empty";
  reason: string;
}

export interface DuplicateGroupPreview {
  groupId: number;
  keyPreview: string;
  rowNumbers: number[];
  keptRowNumbers: number[];
  removedRowNumbers: number[];
}

export interface DedupeAnalysis {
  columns: ColumnMeta[];
  selectedColumns: number[];
  totalRows: number;
  dataRows: number;
  emptyRows: number;
  comparedRows: number;
  duplicateGroups: number;
  duplicateRows: number;
  rowsToRemove: number;
  rowsToKeep: number;
  previewRows: PreviewRow[];
  duplicateGroupPreviews: DuplicateGroupPreview[];
  removeSheetRowIndexes: number[];
  cleanedRowCount: number;
}

export interface CompareAgainstOptions {
  baseSheetName: string;
  compareSheetName: string;
  hasHeader: boolean;
  selectedColumns: number[];
  compare: CompareOptions;
  previewLimit: number;
}

export interface ComparisonPreviewRow {
  sheetRowIndex: number;
  rowNumber: number;
  values: string[];
  key: string;
  status: "header" | "match" | "unique" | "empty";
  reason: string;
}

export interface ComparisonAnalysis {
  compareFileName: string;
  compareSheetName: string;
  baseRows: number;
  baseComparedRows: number;
  comparisonRows: number;
  matchedRows: number;
  uniqueRows: number;
  emptyRows: number;
  previewRows: ComparisonPreviewRow[];
}

export interface ExportResult {
  arrayBuffer: ArrayBuffer;
  fileName: string;
  mimeType: string;
  verification: {
    ok: true;
    sheetNames: string[];
    selectedSheet: string;
    originalRows: number;
    cleanedRows: number;
    removedRows: number;
    strategy: KeepStrategy;
  };
}

export interface WorkerErrorPayload {
  code: "invalid-file" | "unsupported-file" | "resource-limit" | "parse-failed" | "export-failed" | "internal";
  message: string;
}

export type WorkerInMessage =
  | { type: "parse"; fileName: string; fileSize: number; arrayBuffer: ArrayBuffer }
  | { type: "parseComparison"; fileName: string; fileSize: number; arrayBuffer: ArrayBuffer }
  | { type: "analyze"; options: AnalyzeOptions }
  | { type: "compare"; options: CompareAgainstOptions }
  | { type: "export"; options: AnalyzeOptions; timestamp: string }
  | { type: "reset" };

export type WorkerOutMessage =
  | { type: "progress"; label: string; percent: number }
  | { type: "parsed"; summary: WorkbookSummary }
  | { type: "comparisonParsed"; summary: WorkbookSummary }
  | { type: "analysis"; analysis: DedupeAnalysis }
  | { type: "comparison"; analysis: ComparisonAnalysis }
  | { type: "exported"; result: ExportResult }
  | { type: "error"; error: WorkerErrorPayload };
