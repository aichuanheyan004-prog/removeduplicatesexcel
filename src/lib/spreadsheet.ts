import Papa from "papaparse";
import * as XLSX from "xlsx";
import { analyzeRows, buildCleanRows, isEmptyRow } from "./dedupe";
import type { AnalyzeOptions, ExportResult, FileKind, ParsedWorkbook, SheetData, WorkbookSummary } from "./types";

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_ROWS_PER_SHEET = 50000;
export const MAX_COLUMNS_PER_SHEET = 200;
export const MAX_TOTAL_CELLS = 500000;

export class SpreadsheetError extends Error {
  code: "invalid-file" | "unsupported-file" | "resource-limit" | "parse-failed" | "export-failed";

  constructor(
    code: SpreadsheetError["code"],
    message: string
  ) {
    super(message);
    this.name = "SpreadsheetError";
    this.code = code;
  }
}

export function detectFileKind(fileName: string): FileKind {
  const lower = fileName.toLocaleLowerCase("en-US");
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".csv")) return "csv";
  throw new SpreadsheetError("unsupported-file", "This version supports .xlsx and UTF-8 .csv files.");
}

export function normalizeSheetRows(input: unknown[][]): string[][] {
  return input.map((row) => row.map((cell) => String(cell ?? "")));
}

function trimTrailingEmptyRows(rows: string[][]): string[][] {
  let end = rows.length;
  while (end > 0 && isEmptyRow(rows[end - 1])) end -= 1;
  return rows.slice(0, end);
}

function validateWorkbook(workbook: ParsedWorkbook): void {
  if (workbook.fileSize > MAX_FILE_BYTES) {
    throw new SpreadsheetError("resource-limit", "The file is larger than the tested 8 MB limit for this browser tool.");
  }

  let totalCells = 0;
  workbook.sheets.forEach((sheet) => {
    const rowCount = sheet.rows.length;
    const columnCount = sheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
    totalCells += rowCount * Math.max(1, columnCount);
    if (rowCount > MAX_ROWS_PER_SHEET) {
      throw new SpreadsheetError(
        "resource-limit",
        `The sheet "${sheet.name}" has more than ${MAX_ROWS_PER_SHEET.toLocaleString("en-US")} rows.`
      );
    }
    if (columnCount > MAX_COLUMNS_PER_SHEET) {
      throw new SpreadsheetError(
        "resource-limit",
        `The sheet "${sheet.name}" has more than ${MAX_COLUMNS_PER_SHEET.toLocaleString("en-US")} columns.`
      );
    }
  });

  if (totalCells > MAX_TOTAL_CELLS) {
    throw new SpreadsheetError(
      "resource-limit",
      `This workbook has more than ${MAX_TOTAL_CELLS.toLocaleString("en-US")} cells in the tested range.`
    );
  }
}

function parseXlsx(fileName: string, fileSize: number, arrayBuffer: ArrayBuffer): ParsedWorkbook {
  const signature = new Uint8Array(arrayBuffer.slice(0, 2));
  if (signature[0] !== 0x50 || signature[1] !== 0x4b) {
    throw new SpreadsheetError("parse-failed", "The workbook could not be read. It may be corrupted or password protected.");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: true,
      cellFormula: false,
      cellNF: false,
      cellStyles: false,
      dense: false,
      raw: false
    });
  } catch {
    throw new SpreadsheetError("parse-failed", "The workbook could not be read. It may be corrupted or password protected.");
  }

  if (workbook.SheetNames.length === 0) {
    throw new SpreadsheetError("invalid-file", "The workbook does not contain any worksheets.");
  }

  const sheets: SheetData[] = workbook.SheetNames.map((name) => {
    const worksheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true,
      dateNF: "yyyy-mm-dd"
    });
    return { name, rows: trimTrailingEmptyRows(normalizeSheetRows(rows)) };
  });

  const parsed: ParsedWorkbook = {
    fileName,
    fileKind: "xlsx",
    fileSize,
    sheets,
    warnings: [
      "XLSX export is a value snapshot. Styles, formulas, macros, external links, comments, and workbook metadata are not preserved."
    ]
  };
  validateWorkbook(parsed);
  return parsed;
}

function parseCsv(fileName: string, fileSize: number, arrayBuffer: ArrayBuffer): ParsedWorkbook {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: false
  });

  const seriousError = result.errors.find((error) => error.code !== "TooFewFields" && error.code !== "TooManyFields");
  if (seriousError) {
    throw new SpreadsheetError("parse-failed", `The CSV could not be parsed: ${seriousError.message}`);
  }

  const rows = trimTrailingEmptyRows(
    result.data.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [String(row ?? "")]))
  );
  const parsed: ParsedWorkbook = {
    fileName,
    fileKind: "csv",
    fileSize,
    sheets: [{ name: "CSV", rows }],
    warnings: ["CSV files are read and exported as UTF-8 text. Formatting, formulas, and workbook features do not apply."]
  };
  validateWorkbook(parsed);
  return parsed;
}

export function parseWorkbookBuffer(fileName: string, fileSize: number, arrayBuffer: ArrayBuffer): ParsedWorkbook {
  const kind = detectFileKind(fileName);
  if (kind === "xlsx") return parseXlsx(fileName, fileSize, arrayBuffer);
  return parseCsv(fileName, fileSize, arrayBuffer);
}

export function summarizeWorkbook(workbook: ParsedWorkbook): WorkbookSummary {
  return {
    fileName: workbook.fileName,
    fileKind: workbook.fileKind,
    fileSize: workbook.fileSize,
    sheets: workbook.sheets.map((sheet) => ({
      name: sheet.name,
      rowCount: sheet.rows.length,
      dataRowCount: Math.max(0, sheet.rows.length - 1),
      columnCount: sheet.rows.reduce((max, row) => Math.max(max, row.length), 0)
    })),
    warnings: workbook.warnings
  };
}

export function sheetByName(workbook: ParsedWorkbook, sheetName: string): SheetData {
  const sheet = workbook.sheets.find((candidate) => candidate.name === sheetName);
  if (!sheet) throw new SpreadsheetError("invalid-file", "The selected worksheet is no longer available.");
  return sheet;
}

export function safeExportFileName(inputName: string, timestamp: string, kind: FileKind): string {
  const extension = kind === "xlsx" ? ".xlsx" : ".csv";
  const base = inputName.replace(/\.[^.]+$/, "").toLocaleLowerCase("en-US");
  const safeBase = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "spreadsheet";
  const date = new Date(timestamp);
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "-",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ].join("");
  return `${safeBase}-deduped-${stamp}${extension}`;
}

function normalizeForVerification(rows: string[][]): string[][] {
  return trimTrailingEmptyRows(rows).map((row) => {
    let end = row.length;
    while (end > 0 && String(row[end - 1] ?? "") === "") end -= 1;
    return row.slice(0, end).map((cell) => String(cell ?? ""));
  });
}

function rowsEqual(left: string[][], right: string[][]): boolean {
  const a = normalizeForVerification(left);
  const b = normalizeForVerification(right);
  if (a.length !== b.length) return false;
  return a.every((row, rowIndex) => {
    const other = b[rowIndex] ?? [];
    if (row.length !== other.length) return false;
    return row.every((cell, cellIndex) => cell === other[cellIndex]);
  });
}

export function exportCleanWorkbook(workbook: ParsedWorkbook, options: AnalyzeOptions, timestamp: string): ExportResult {
  const sheet = sheetByName(workbook, options.sheetName);
  const analysis = analyzeRows(sheet.rows, options);
  const cleanRows = buildCleanRows(sheet.rows, analysis);
  const fileName = safeExportFileName(workbook.fileName, timestamp, workbook.fileKind);
  let arrayBuffer: ArrayBuffer;
  let mimeType: string;

  if (workbook.fileKind === "xlsx") {
    const outputWorkbook = XLSX.utils.book_new();
    workbook.sheets.forEach((candidate) => {
      const rows = candidate.name === sheet.name ? cleanRows : candidate.rows;
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(outputWorkbook, worksheet, candidate.name);
    });
    arrayBuffer = XLSX.write(outputWorkbook, {
      bookType: "xlsx",
      type: "array",
      compression: true
    }) as ArrayBuffer;
    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else {
    const text = Papa.unparse(cleanRows, {
      newline: "\r\n"
    });
    arrayBuffer = new TextEncoder().encode(text).buffer;
    mimeType = "text/csv;charset=utf-8";
  }

  const verified = parseWorkbookBuffer(fileName, arrayBuffer.byteLength, arrayBuffer);
  const verifiedSheet = sheetByName(verified, workbook.fileKind === "csv" ? "CSV" : sheet.name);
  const selectedMatches = rowsEqual(cleanRows, verifiedSheet.rows);
  const sheetOrderMatches =
    workbook.fileKind === "csv" ||
    workbook.sheets.map((candidate) => candidate.name).join("\u001f") === verified.sheets.map((candidate) => candidate.name).join("\u001f");

  if (!selectedMatches || !sheetOrderMatches || arrayBuffer.byteLength === 0) {
    throw new SpreadsheetError("export-failed", "The cleaned file failed verification, so no download was created.");
  }

  return {
    arrayBuffer,
    fileName,
    mimeType,
    verification: {
      ok: true,
      sheetNames: verified.sheets.map((candidate) => candidate.name),
      selectedSheet: sheet.name,
      originalRows: sheet.rows.length,
      cleanedRows: cleanRows.length,
      removedRows: analysis.rowsToRemove,
      strategy: options.strategy
    }
  };
}
