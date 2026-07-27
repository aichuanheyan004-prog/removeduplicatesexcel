import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { analyzeRows } from "../src/lib/dedupe";
import { exportCleanWorkbook, parseWorkbookBuffer, sheetByName } from "../src/lib/spreadsheet";
import type { AnalyzeOptions } from "../src/lib/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readFixture(name: string): Buffer {
  return fs.readFileSync(path.join(root, "tests", "fixtures", name));
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return Uint8Array.from(buffer).buffer;
}

function options(partial: Partial<AnalyzeOptions> = {}): AnalyzeOptions {
  return {
    sheetName: "Orders",
    hasHeader: true,
    selectedColumns: [0, 1, 2, 3, 4, 5],
    strategy: "first",
    compare: { trimWhitespace: false, ignoreCase: false },
    previewLimit: 80,
    ...partial
  };
}

beforeAll(() => {
  execFileSync(process.execPath, [path.join(root, "scripts", "generate-fixtures.mjs")], { cwd: root });
});

describe("spreadsheet parsing and verified export", () => {
  it("parses and exports a multi-sheet XLSX while preserving sheet order and selected-sheet row order", () => {
    const input = readFixture("sample-workbook.xlsx");
    const workbook = parseWorkbookBuffer("sample-workbook.xlsx", input.byteLength, toArrayBuffer(input));
    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual(["Orders", "Duplicate Headers", "Reference"]);

    const analysis = analyzeRows(sheetByName(workbook, "Orders").rows, options());
    expect(analysis.rowsToRemove).toBe(2);

    const exported = exportCleanWorkbook(workbook, options(), "2026-07-27T10:15:30.000Z");
    expect(exported.fileName).toBe("sample-workbook-deduped-20260727-181530.xlsx");
    expect(exported.arrayBuffer.byteLength).toBeGreaterThan(1000);
    expect(exported.verification.sheetNames).toEqual(["Orders", "Duplicate Headers", "Reference"]);
    expect(exported.verification.cleanedRows).toBe(sheetByName(workbook, "Orders").rows.length - 2);
  });

  it("supports keep last and remove all strategies for CSV exports", () => {
    const input = readFixture("sample.csv");
    const workbook = parseWorkbookBuffer("sample.csv", input.byteLength, toArrayBuffer(input));
    const base = { ...options({ sheetName: "CSV", selectedColumns: [0], compare: { trimWhitespace: true, ignoreCase: true } }) };

    const keepLast = exportCleanWorkbook(workbook, { ...base, strategy: "last" }, "2026-07-27T00:00:00.000Z");
    expect(keepLast.fileName).toBe("sample-deduped-20260727-080000.csv");
    expect(keepLast.arrayBuffer.byteLength).toBeGreaterThan(50);
    expect(keepLast.verification.removedRows).toBe(3);

    const removeAll = exportCleanWorkbook(workbook, { ...base, strategy: "none" }, "2026-07-27T00:00:00.000Z");
    expect(removeAll.verification.removedRows).toBe(6);
  });

  it("rejects unsupported and corrupted files", () => {
    expect(() => parseWorkbookBuffer("legacy.xls", 3, new Uint8Array([1, 2, 3]).buffer)).toThrow(/supports/);
    expect(() => parseWorkbookBuffer("broken.xlsx", 11, new TextEncoder().encode("not a zip").buffer)).toThrow(/could not be read/);
  });
});
