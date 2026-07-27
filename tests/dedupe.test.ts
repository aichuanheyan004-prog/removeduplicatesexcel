import { describe, expect, it } from "vitest";
import { compareRowsAgainst } from "../src/lib/compare";
import { analyzeRows, buildCleanRows, columnMetadata } from "../src/lib/dedupe";
import type { AnalyzeOptions } from "../src/lib/types";

function options(partial: Partial<AnalyzeOptions> = {}): AnalyzeOptions {
  return {
    sheetName: "Sheet1",
    hasHeader: true,
    selectedColumns: [0],
    strategy: "first",
    compare: { trimWhitespace: false, ignoreCase: false },
    previewLimit: 50,
    ...partial
  };
}

describe("dedupe engine", () => {
  it("removes later rows for a single-column duplicate with keep first", () => {
    const rows = [["Email"], ["a@example.test"], ["b@example.test"], ["a@example.test"]];
    const analysis = analyzeRows(rows, options());
    expect(analysis.duplicateGroups).toBe(1);
    expect(analysis.removeSheetRowIndexes).toEqual([3]);
    expect(buildCleanRows(rows, analysis)).toEqual([["Email"], ["a@example.test"], ["b@example.test"]]);
  });

  it("uses multi-column keys", () => {
    const rows = [
      ["Email", "Region"],
      ["a@example.test", "West"],
      ["a@example.test", "East"],
      ["a@example.test", "West"]
    ];
    const analysis = analyzeRows(rows, options({ selectedColumns: [0, 1] }));
    expect(analysis.removeSheetRowIndexes).toEqual([3]);
  });

  it("keeps the last row when requested", () => {
    const rows = [["Email"], ["a@example.test"], ["b@example.test"], ["a@example.test"]];
    const analysis = analyzeRows(rows, options({ strategy: "last" }));
    expect(analysis.removeSheetRowIndexes).toEqual([1]);
    expect(buildCleanRows(rows, analysis)).toEqual([["Email"], ["b@example.test"], ["a@example.test"]]);
  });

  it("removes all rows that belong to duplicate groups", () => {
    const rows = [["Email"], ["a@example.test"], ["b@example.test"], ["a@example.test"]];
    const analysis = analyzeRows(rows, options({ strategy: "none" }));
    expect(analysis.removeSheetRowIndexes).toEqual([1, 3]);
    expect(buildCleanRows(rows, analysis)).toEqual([["Email"], ["b@example.test"]]);
  });

  it("applies trim and case-insensitive options", () => {
    const rows = [["Email"], [" Test@Example.test "], ["test@example.test"], ["other@example.test"]];
    const analysis = analyzeRows(rows, options({ compare: { trimWhitespace: true, ignoreCase: true } }));
    expect(analysis.duplicateGroups).toBe(1);
    expect(analysis.removeSheetRowIndexes).toEqual([2]);
  });

  it("keeps empty rows out of duplicate comparison", () => {
    const rows = [["Email"], [""], [""], ["a@example.test"], ["a@example.test"]];
    const analysis = analyzeRows(rows, options());
    expect(analysis.emptyRows).toBe(2);
    expect(analysis.removeSheetRowIndexes).toEqual([4]);
    expect(buildCleanRows(rows, analysis)).toEqual([["Email"], [""], [""], ["a@example.test"]]);
  });

  it("disambiguates duplicate headers", () => {
    const columns = columnMetadata(
      [
        ["ID", "Email", "Email"],
        ["1", "a@example.test", "b@example.test"]
      ],
      true
    );
    expect(columns.map((column) => column.label)).toEqual(["ID", "Email", "Email (2)"]);
  });

  it("compares displayed cell text, including dates and numeric text", () => {
    const rows = [
      ["Value"],
      ["100"],
      ["100"],
      ["2026-01-10"],
      ["1/10/2026"]
    ];
    const analysis = analyzeRows(rows, options());
    expect(analysis.removeSheetRowIndexes).toEqual([2]);
  });

  it("compares selected row keys against a second table", () => {
    const baseRows = [["Email"], ["a@example.test"], ["b@example.test"], [""], ["C@example.test"]];
    const comparisonRows = [["Email"], ["A@example.test"], ["x@example.test"]];
    const comparison = compareRowsAgainst(baseRows, comparisonRows, "second.csv", {
      baseSheetName: "Sheet1",
      compareSheetName: "CSV",
      hasHeader: true,
      selectedColumns: [0],
      compare: { trimWhitespace: true, ignoreCase: true },
      previewLimit: 20
    });
    expect(comparison.matchedRows).toBe(1);
    expect(comparison.uniqueRows).toBe(2);
    expect(comparison.emptyRows).toBe(1);
    expect(comparison.previewRows.map((row) => row.status)).toEqual(["header", "match", "unique", "empty", "unique"]);
  });
});
