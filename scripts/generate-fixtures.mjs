import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sampleDir = path.join(root, "public", "samples");
const fixtureDir = path.join(root, "tests", "fixtures");
fs.mkdirSync(sampleDir, { recursive: true });
fs.mkdirSync(fixtureDir, { recursive: true });

const salesRows = [
  ["Customer ID", "Email", "City", "Order Date", "Amount", "Status", "Notes", "Cached Formula"],
  ["C-1001", "ava@example.test", "Austin", "2026-01-05", 125, "Paid", "exact duplicate row", 250],
  ["C-1001", "ava@example.test", "Austin", "2026-01-05", 125, "Paid", "exact duplicate row", 250],
  ["C-1002", "ben@example.test", "Boston", "2026-01-06", "125", "Paid", "text amount that displays like number", 250],
  ["C-1003", "CASE@example.test", "Chicago", "2026-01-07", 75, "Open", "case example", 150],
  ["C-1003", "case@example.test", "Chicago", "2026-01-07", 75, "Open", "case example lower", 150],
  ["C-1004", " trim@example.test ", "Denver", "2026-01-08", 60, "Open", "leading and trailing spaces", 120],
  ["C-1004", "trim@example.test", "Denver", "2026-01-08", 60, "Open", "trimmed duplicate candidate", 120],
  ["", "", "", "", "", "", "", ""],
  ["C-1005", "", "Erie", "2026-01-09", 40, "Paid", "blank email duplicate", 80],
  ["C-1005", "", "Erie", "2026-01-09", 40, "Paid", "blank email duplicate", 80],
  ["C-1006", "fran@example.test", "Fresno", "1/10/2026", 90, "Paid", "date display differs from ISO text", 180]
];

const duplicateHeaderRows = [
  ["ID", "Email", "Email", "Segment"],
  ["D-1", "first@example.test", "first@example.test", "A"],
  ["D-1", "first@example.test", "first@example.test", "A"],
  ["D-2", "second@example.test", "alt@example.test", "B"]
];

const referenceRows = [
  ["Code", "Meaning"],
  ["Paid", "Payment received"],
  ["Open", "Needs review"],
  ["Cancelled", "Not included in sample"]
];

const workbook = XLSX.utils.book_new();
const salesSheet = XLSX.utils.aoa_to_sheet(salesRows);
salesSheet.H2 = { t: "n", f: "E2*2", v: 250, w: "250" };
salesSheet.H3 = { t: "n", f: "E3*2", v: 250, w: "250" };
XLSX.utils.book_append_sheet(workbook, salesSheet, "Orders");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(duplicateHeaderRows), "Duplicate Headers");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(referenceRows), "Reference");

const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true });
fs.writeFileSync(path.join(sampleDir, "remove-duplicates-excel-sample.xlsx"), xlsxBuffer);
fs.writeFileSync(path.join(fixtureDir, "sample-workbook.xlsx"), xlsxBuffer);

const csvRows = [
  ["Email", "Name", "Plan"],
  ["ada@example.test", "Ada", "Free"],
  ["ada@example.test", "Ada", "Free"],
  ["max@example.test", "Max", "Pro"],
  ["MAX@example.test", "Max", "Pro"],
  [" trim@example.test ", "Trim", "Team"],
  ["trim@example.test", "Trim", "Team"]
];
const csvText = Papa.unparse(csvRows, { newline: "\r\n" });
fs.writeFileSync(path.join(sampleDir, "remove-duplicates-excel-sample.csv"), csvText, "utf8");
fs.writeFileSync(path.join(fixtureDir, "sample.csv"), csvText, "utf8");
