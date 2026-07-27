import { analyzeRows } from "../lib/dedupe";
import { compareRowsAgainst } from "../lib/compare";
import {
  exportCleanWorkbook,
  parseWorkbookBuffer,
  sheetByName,
  SpreadsheetError,
  summarizeWorkbook
} from "../lib/spreadsheet";
import type { ParsedWorkbook, WorkerInMessage, WorkerOutMessage } from "../lib/types";

let workbook: ParsedWorkbook | null = null;
let comparisonWorkbook: ParsedWorkbook | null = null;

function post(message: WorkerOutMessage, transfer?: Transferable[]): void {
  self.postMessage(message, { transfer });
}

function handleError(error: unknown): void {
  if (error instanceof SpreadsheetError) {
    post({ type: "error", error: { code: error.code, message: error.message } });
    return;
  }
  post({
    type: "error",
    error: {
      code: "internal",
      message: "Something went wrong while processing this file. Reset and try again with a smaller workbook."
    }
  });
}

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const message = event.data;
  try {
    if (message.type === "reset") {
      workbook = null;
      comparisonWorkbook = null;
      post({ type: "progress", label: "Reset complete", percent: 0 });
      return;
    }

    if (message.type === "parse") {
      post({ type: "progress", label: "Reading workbook in this browser", percent: 10 });
      workbook = parseWorkbookBuffer(message.fileName, message.fileSize, message.arrayBuffer);
      post({ type: "progress", label: "Workbook loaded", percent: 70 });
      post({ type: "parsed", summary: summarizeWorkbook(workbook) });
      return;
    }

    if (message.type === "parseComparison") {
      post({ type: "progress", label: "Reading comparison file in this browser", percent: 10 });
      comparisonWorkbook = parseWorkbookBuffer(message.fileName, message.fileSize, message.arrayBuffer);
      post({ type: "comparisonParsed", summary: summarizeWorkbook(comparisonWorkbook) });
      return;
    }

    if (!workbook) {
      throw new SpreadsheetError("invalid-file", "Choose a spreadsheet before running duplicate detection.");
    }

    if (message.type === "analyze") {
      post({ type: "progress", label: "Checking duplicate groups", percent: 35 });
      const sheet = sheetByName(workbook, message.options.sheetName);
      const analysis = analyzeRows(sheet.rows, message.options);
      post({ type: "analysis", analysis });
      return;
    }

    if (message.type === "compare") {
      if (!comparisonWorkbook) {
        throw new SpreadsheetError("invalid-file", "Choose a second spreadsheet before comparing files.");
      }
      post({ type: "progress", label: "Comparing rows with the second file", percent: 35 });
      const baseSheet = sheetByName(workbook, message.options.baseSheetName);
      const comparisonSheet = sheetByName(comparisonWorkbook, message.options.compareSheetName);
      const analysis = compareRowsAgainst(baseSheet.rows, comparisonSheet.rows, comparisonWorkbook.fileName, message.options);
      post({ type: "comparison", analysis });
      return;
    }

    if (message.type === "export") {
      post({ type: "progress", label: "Building cleaned file", percent: 40 });
      const result = exportCleanWorkbook(workbook, message.options, message.timestamp);
      post({ type: "progress", label: "Verified cleaned export", percent: 90 });
      post({ type: "exported", result }, [result.arrayBuffer]);
    }
  } catch (error) {
    handleError(error);
  }
};
