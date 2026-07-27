import {
  AlertTriangle,
  Check,
  Download,
  FileDown,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  RotateCcw,
  Square,
  Trash2,
  UploadCloud
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AnalyzeOptions,
  ColumnMeta,
  CompareAgainstOptions,
  ComparisonAnalysis,
  CompareOptions,
  DedupeAnalysis,
  KeepStrategy,
  WorkbookSummary,
  WorkerInMessage,
  WorkerOutMessage
} from "../lib/types";

const defaultCompare: CompareOptions = {
  trimWhitespace: false,
  ignoreCase: false
};

type Status = "idle" | "parsing" | "ready" | "analyzing" | "comparing" | "exporting" | "success" | "error" | "cancelled";

interface DownloadState {
  url: string;
  fileName: string;
  message: string;
}

function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function defaultOptions(sheetName = ""): AnalyzeOptions {
  return {
    sheetName,
    hasHeader: true,
    selectedColumns: [],
    strategy: "first",
    compare: defaultCompare,
    previewLimit: 120
  };
}

function statusText(status: Status, progressLabel: string, error: string | null): string {
  if (status === "idle") return "Choose an XLSX workbook or UTF-8 CSV to start.";
  if (status === "parsing" || status === "analyzing" || status === "comparing" || status === "exporting") {
    return progressLabel || "Working in this browser.";
  }
  if (status === "success") return "Cleaned file verified and ready.";
  if (status === "cancelled") return "Processing cancelled. The worker was stopped and file memory was cleared.";
  if (status === "error") return error ?? "The file could not be processed.";
  return progressLabel || "Workbook ready.";
}

function createWorker(): Worker {
  return new Worker(new URL("../workers/spreadsheetWorker.ts", import.meta.url), { type: "module" });
}

export function DeduperTool() {
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const comparisonInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [summary, setSummary] = useState<WorkbookSummary | null>(null);
  const [comparisonSummary, setComparisonSummary] = useState<WorkbookSummary | null>(null);
  const [comparisonSheetName, setComparisonSheetName] = useState("");
  const [options, setOptions] = useState<AnalyzeOptions>(defaultOptions());
  const [analysis, setAnalysis] = useState<DedupeAnalysis | null>(null);
  const [comparisonAnalysis, setComparisonAnalysis] = useState<ComparisonAnalysis | null>(null);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [download, setDownload] = useState<DownloadState | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const busy = status === "parsing" || status === "analyzing" || status === "comparing" || status === "exporting";
  const selectedSheet = summary?.sheets.find((sheet) => sheet.name === options.sheetName);
  const columns = useMemo(() => analysis?.columns ?? [], [analysis]);
  const selectedColumns = useMemo(
    () => (options.selectedColumns.length > 0 ? options.selectedColumns : analysis?.selectedColumns ?? []),
    [analysis, options.selectedColumns]
  );
  const selectedColumnsKey = selectedColumns.join(",");
  const optionSelectedColumnsKey = options.selectedColumns.join(",");

  function revokeDownload() {
    if (download?.url) URL.revokeObjectURL(download.url);
    setDownload(null);
  }

  function resetWorker() {
    workerRef.current?.terminate();
    workerRef.current = null;
  }

  function ensureWorker() {
    if (workerRef.current) return workerRef.current;
    const worker = createWorker();
    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const message = event.data;
      if (message.type === "progress") {
        setProgressLabel(message.label);
        setProgressPercent(message.percent);
        return;
      }
      if (message.type === "parsed") {
        setSummary(message.summary);
        setComparisonSummary(null);
        setComparisonSheetName("");
        setOptions(defaultOptions(message.summary.sheets[0]?.name ?? ""));
        setAnalysis(null);
        setComparisonAnalysis(null);
        setStatus("ready");
        setProgressPercent(100);
        return;
      }
      if (message.type === "comparisonParsed") {
        setComparisonSummary(message.summary);
        setComparisonSheetName(message.summary.sheets[0]?.name ?? "");
        setComparisonAnalysis(null);
        setStatus("ready");
        setProgressLabel("Comparison file loaded");
        setProgressPercent(100);
        return;
      }
      if (message.type === "analysis") {
        setAnalysis(message.analysis);
        setStatus("ready");
        setProgressLabel("Duplicate preview ready");
        setProgressPercent(100);
        return;
      }
      if (message.type === "comparison") {
        setComparisonAnalysis(message.analysis);
        setStatus("ready");
        setProgressLabel("Comparison preview ready");
        setProgressPercent(100);
        return;
      }
      if (message.type === "exported") {
        revokeDownload();
        const blob = new Blob([message.result.arrayBuffer], { type: message.result.mimeType });
        const url = URL.createObjectURL(blob);
        const nextDownload = {
          url,
          fileName: message.result.fileName,
          message: `${message.result.verification.removedRows.toLocaleString("en-US")} rows removed from ${
            message.result.verification.selectedSheet
          }. Export verified by reparsing the generated file.`
        };
        setDownload(nextDownload);
        setStatus("success");
        setProgressPercent(100);

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = nextDownload.fileName;
        anchor.rel = "noopener";
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        return;
      }
      if (message.type === "error") {
        setError(message.error.message);
        setStatus("error");
        setProgressLabel(message.error.message);
      }
    };
    workerRef.current = worker;
    return worker;
  }

  async function loadFile(file: File) {
    revokeDownload();
    setError(null);
    setAnalysis(null);
    setComparisonAnalysis(null);
    setSummary(null);
    setComparisonSummary(null);
    setComparisonSheetName("");
    setStatus("parsing");
    setProgressLabel("Reading file into browser memory");
    setProgressPercent(5);
    resetWorker();
    const worker = ensureWorker();
    try {
      const arrayBuffer = await file.arrayBuffer();
      const message: WorkerInMessage = {
        type: "parse",
        fileName: file.name,
        fileSize: file.size,
        arrayBuffer
      };
      worker.postMessage(message, [arrayBuffer]);
    } catch {
      setStatus("error");
      setError("The browser could not read this file. Try a smaller workbook or another browser.");
    }
  }

  async function loadComparisonFile(file: File) {
    if (!summary) return;
    setError(null);
    setComparisonAnalysis(null);
    setStatus("comparing");
    setProgressLabel("Reading comparison file into browser memory");
    setProgressPercent(5);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const message: WorkerInMessage = {
        type: "parseComparison",
        fileName: file.name,
        fileSize: file.size,
        arrayBuffer
      };
      ensureWorker().postMessage(message, [arrayBuffer]);
    } catch {
      setStatus("error");
      setError("The browser could not read the comparison file. Try a smaller workbook or another browser.");
    }
  }

  async function loadSample() {
    setStatus("parsing");
    setProgressLabel("Loading sample workbook");
    try {
      const response = await fetch("/samples/remove-duplicates-excel-sample.xlsx");
      if (!response.ok) throw new Error("sample");
      const blob = await response.blob();
      const file = new File([blob], "remove-duplicates-excel-sample.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      await loadFile(file);
    } catch {
      setStatus("error");
      setError("The sample workbook is not available. Try choosing your own XLSX or CSV file.");
    }
  }

  function resetTool(nextStatus: Status = "idle") {
    revokeDownload();
    resetWorker();
    setSummary(null);
    setComparisonSummary(null);
    setComparisonSheetName("");
    setAnalysis(null);
    setComparisonAnalysis(null);
    setOptions(defaultOptions());
    setError(null);
    setStatus(nextStatus);
    setProgressLabel("");
    setProgressPercent(0);
    if (inputRef.current) inputRef.current.value = "";
    if (comparisonInputRef.current) comparisonInputRef.current.value = "";
  }

  function cancelProcessing() {
    resetTool("cancelled");
  }

  function postAnalyze(nextOptions = options) {
    if (!summary || !nextOptions.sheetName || status === "parsing" || status === "exporting") return;
    setStatus("analyzing");
    setProgressLabel("Checking duplicate groups");
    setProgressPercent(20);
    const message: WorkerInMessage = { type: "analyze", options: nextOptions };
    ensureWorker().postMessage(message);
  }

  function postComparison(nextOptions = options, nextComparisonSheetName = comparisonSheetName) {
    if (!summary || !analysis || !comparisonSummary || !nextComparisonSheetName || selectedColumns.length === 0) return;
    setStatus("comparing");
    setProgressLabel("Comparing duplicate keys across two files");
    setProgressPercent(25);
    const message: WorkerInMessage = {
      type: "compare",
      options: {
        baseSheetName: nextOptions.sheetName,
        compareSheetName: nextComparisonSheetName,
        hasHeader: nextOptions.hasHeader,
        selectedColumns,
        compare: nextOptions.compare,
        previewLimit: 120
      } satisfies CompareAgainstOptions
    };
    ensureWorker().postMessage(message);
  }

  function updateOptions(updater: (current: AnalyzeOptions) => AnalyzeOptions) {
    revokeDownload();
    setComparisonAnalysis(null);
    setOptions((current) => updater(current));
  }

  function toggleColumn(column: ColumnMeta) {
    const baseline = selectedColumns.length > 0 ? selectedColumns : columns.map((item) => item.index);
    const exists = baseline.includes(column.index);
    const next = exists ? baseline.filter((index) => index !== column.index) : [...baseline, column.index].sort((a, b) => a - b);
    updateOptions((current) => ({ ...current, selectedColumns: next }));
  }

  function setStrategy(strategy: KeepStrategy) {
    updateOptions((current) => ({ ...current, strategy }));
  }

  function setCompare(key: keyof CompareOptions, value: boolean) {
    updateOptions((current) => ({ ...current, compare: { ...current.compare, [key]: value } }));
  }

  function exportFile() {
    if (!summary || !analysis || selectedColumns.length === 0) return;
    setStatus("exporting");
    setProgressLabel("Creating and verifying cleaned file");
    setProgressPercent(35);
    const message: WorkerInMessage = {
      type: "export",
      options: { ...options, selectedColumns },
      timestamp: new Date().toISOString()
    };
    ensureWorker().postMessage(message);
  }

  useEffect(() => {
    if (!summary || !options.sheetName) return;
    const timer = window.setTimeout(() => postAnalyze({ ...options, selectedColumns }), 120);
    return () => window.clearTimeout(timer);
    // Worker analysis is deliberately debounced from primitive option keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, options.sheetName, options.hasHeader, options.strategy, options.compare.trimWhitespace, options.compare.ignoreCase, optionSelectedColumnsKey, selectedColumnsKey]);

  useEffect(() => {
    if (!summary || !comparisonSummary || !comparisonSheetName || !analysis) return;
    const timer = window.setTimeout(() => postComparison(options, comparisonSheetName), 160);
    return () => window.clearTimeout(timer);
    // Worker comparison is deliberately debounced from primitive option keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    summary,
    comparisonSummary,
    comparisonSheetName,
    analysis,
    options.sheetName,
    options.hasHeader,
    options.compare.trimWhitespace,
    options.compare.ignoreCase,
    optionSelectedColumnsKey,
    selectedColumnsKey
  ]);

  useEffect(() => {
    return () => {
      resetWorker();
      if (download?.url) URL.revokeObjectURL(download.url);
    };
  }, [download?.url]);

  const previewColumnIndexes = useMemo(() => {
    const indexes = selectedColumns.length > 0 ? selectedColumns : columns.map((column) => column.index);
    return indexes.slice(0, 10);
  }, [columns, selectedColumns]);

  return (
    <section className="tool-panel" aria-labelledby="tool-heading">
      <div className="tool-head">
        <div>
          <p className="eyebrow">Browser-local tool</p>
          <h2 id="tool-heading">Preview and delete duplicate rows</h2>
        </div>
        <FileSpreadsheet size={28} aria-hidden="true" />
      </div>

      <div
        className={`drop-zone${dragActive ? " is-active" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          const file = event.dataTransfer.files[0];
          if (file) void loadFile(file);
        }}
      >
        <UploadCloud size={30} aria-hidden="true" />
        <div>
          <strong>Drop an .xlsx or .csv file</strong>
          <span>Tested up to 8 MB, 50,000 rows per sheet, and 200 columns.</span>
        </div>
        <input
          ref={inputRef}
          className="sr-only"
          id="spreadsheet-file"
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadFile(file);
          }}
        />
        <div className="button-row">
          <label className="secondary-button" htmlFor="spreadsheet-file">
            <FolderOpen size={18} aria-hidden="true" /> Choose file
          </label>
          <button type="button" className="ghost-button" onClick={() => void loadSample()}>
            <FileDown size={18} aria-hidden="true" /> Load sample workbook
          </button>
        </div>
      </div>

      <div className="status-line" role="status" aria-live="polite">
        {busy ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
        <span>{statusText(status, progressLabel, error)}</span>
      </div>
      {busy ? (
        <div className="progress-track" aria-label="Processing progress">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      ) : null}

      {summary ? (
        <div className="workbook-area">
          <div className="summary-strip">
            <div>
              <span>File</span>
              <strong title={summary.fileName}>{summary.fileName}</strong>
            </div>
            <div>
              <span>Size</span>
              <strong>{fileSizeLabel(summary.fileSize)}</strong>
            </div>
            <div>
              <span>Sheets</span>
              <strong>{summary.sheets.length}</strong>
            </div>
            <div>
              <span>Rows in selected sheet</span>
              <strong>{selectedSheet?.rowCount.toLocaleString("en-US") ?? "0"}</strong>
            </div>
          </div>

          <div className="settings-grid">
            <label>
              Worksheet
              <select
                value={options.sheetName}
                onChange={(event) =>
                  updateOptions((current) => ({ ...current, sheetName: event.target.value, selectedColumns: [] }))
                }
              >
                {summary.sheets.map((sheet) => (
                  <option key={sheet.name} value={sheet.name}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={options.hasHeader}
                onChange={(event) =>
                  updateOptions((current) => ({ ...current, hasHeader: event.target.checked, selectedColumns: [] }))
                }
              />
              First row is header
            </label>
          </div>

          <fieldset className="option-group">
            <legend>Columns used to detect duplicates</legend>
            <div className="column-actions">
              <button
                type="button"
                className="mini-button"
                onClick={() => updateOptions((current) => ({ ...current, selectedColumns: columns.map((column) => column.index) }))}
              >
                Select all
              </button>
              <button type="button" className="mini-button" onClick={() => updateOptions((current) => ({ ...current, selectedColumns: [] }))}>
                Reset default
              </button>
            </div>
            <div className="column-grid">
              {columns.map((column) => (
                <label key={column.index} className="column-choice" title={`${column.excelName}: ${column.label}`}>
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.index)}
                    onChange={() => toggleColumn(column)}
                  />
                  <span>{column.label}</span>
                  <small>{column.excelName}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="option-group">
            <legend>Keep strategy</legend>
            <div className="segmented" role="radiogroup" aria-label="Keep strategy">
              <label>
                <input type="radio" name="strategy" checked={options.strategy === "first"} onChange={() => setStrategy("first")} />
                Keep first
              </label>
              <label>
                <input type="radio" name="strategy" checked={options.strategy === "last"} onChange={() => setStrategy("last")} />
                Keep last
              </label>
              <label>
                <input type="radio" name="strategy" checked={options.strategy === "none"} onChange={() => setStrategy("none")} />
                Remove all duplicates
              </label>
            </div>
          </fieldset>

          <fieldset className="option-group inline-options">
            <legend>Comparison options</legend>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={options.compare.trimWhitespace}
                onChange={(event) => setCompare("trimWhitespace", event.target.checked)}
              />
              Ignore leading and trailing spaces
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={options.compare.ignoreCase}
                onChange={(event) => setCompare("ignoreCase", event.target.checked)}
              />
              Ignore uppercase and lowercase
            </label>
          </fieldset>

          {analysis ? (
            <>
              <div className="metric-grid">
                <div>
                  <span>Total rows</span>
                  <strong>{analysis.totalRows.toLocaleString("en-US")}</strong>
                </div>
                <div>
                  <span>Compared rows</span>
                  <strong>{analysis.comparedRows.toLocaleString("en-US")}</strong>
                </div>
                <div>
                  <span>Duplicate groups</span>
                  <strong>{analysis.duplicateGroups.toLocaleString("en-US")}</strong>
                </div>
                <div>
                  <span>Rows to remove</span>
                  <strong>{analysis.rowsToRemove.toLocaleString("en-US")}</strong>
                </div>
              </div>

              {analysis.duplicateGroupPreviews.length > 0 ? (
                <div className="group-preview" aria-label="Duplicate group preview">
                  {analysis.duplicateGroupPreviews.map((group) => (
                    <div key={group.groupId} className="group-chip">
                      <strong>Group {group.groupId}</strong>
                      <span title={group.keyPreview}>{group.keyPreview}</span>
                      <small>Rows {group.rowNumbers.join(", ")}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No duplicate groups found with the current settings.</div>
              )}

              <div className="table-wrap" aria-label="Spreadsheet preview">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Status</th>
                      {previewColumnIndexes.map((index) => {
                        const column = columns.find((item) => item.index === index);
                        return <th key={index}>{column?.label ?? `Column ${index + 1}`}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.previewRows.map((row) => (
                      <tr key={row.sheetRowIndex} className={`row-${row.action}`}>
                        <td>{row.rowNumber}</td>
                        <td>
                          <span className="status-pill">{row.action}</span>
                        </td>
                        {previewColumnIndexes.map((index) => (
                          <td key={index} title={row.values[index] ?? ""}>
                            {row.values[index] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {analysis ? (
            <section className="compare-panel" aria-labelledby="compare-heading">
              <div>
                <p className="eyebrow">Optional cross-file check</p>
                <h3 id="compare-heading">Compare with a second spreadsheet</h3>
                <p>
                  Upload another XLSX or CSV to find rows in the current sheet whose selected-column key also appears in the
                  second file. The same header setting, column positions, trim rule, and case rule are used.
                </p>
              </div>
              <div className="compare-controls">
                <input
                  ref={comparisonInputRef}
                  className="sr-only"
                  id="comparison-file"
                  type="file"
                  accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void loadComparisonFile(file);
                  }}
                />
                <label className="secondary-button" htmlFor="comparison-file">
                  <FolderOpen size={18} aria-hidden="true" /> Choose second file
                </label>
                {comparisonSummary ? (
                  <label className="compare-sheet">
                    Comparison sheet
                    <select
                      value={comparisonSheetName}
                      onChange={(event) => {
                        setComparisonSheetName(event.target.value);
                        setComparisonAnalysis(null);
                      }}
                    >
                      {comparisonSummary.sheets.map((sheet) => (
                        <option key={sheet.name} value={sheet.name}>
                          {sheet.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {comparisonAnalysis ? (
                <>
                  <div className="metric-grid compare-metrics">
                    <div>
                      <span>Rows checked in current file</span>
                      <strong>{comparisonAnalysis.baseComparedRows.toLocaleString("en-US")}</strong>
                    </div>
                    <div>
                      <span>Rows checked in second file</span>
                      <strong>{comparisonAnalysis.comparisonRows.toLocaleString("en-US")}</strong>
                    </div>
                    <div>
                      <span>Rows also found</span>
                      <strong>{comparisonAnalysis.matchedRows.toLocaleString("en-US")}</strong>
                    </div>
                    <div>
                      <span>Rows not found</span>
                      <strong>{comparisonAnalysis.uniqueRows.toLocaleString("en-US")}</strong>
                    </div>
                  </div>
                  <div className="table-wrap" aria-label="Cross-file comparison preview">
                    <table>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Status</th>
                          {previewColumnIndexes.map((index) => {
                            const column = columns.find((item) => item.index === index);
                            return <th key={index}>{column?.label ?? `Column ${index + 1}`}</th>;
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonAnalysis.previewRows.map((row) => (
                          <tr key={row.sheetRowIndex} className={`row-${row.status}`}>
                            <td>{row.rowNumber}</td>
                            <td>
                              <span className="status-pill">{row.status}</span>
                            </td>
                            {previewColumnIndexes.map((index) => (
                              <td key={index} title={row.values[index] ?? ""}>
                                {row.values[index] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : comparisonSummary ? (
                <div className="empty-state">Comparison file loaded. Choose columns or a sheet to refresh the match preview.</div>
              ) : null}
            </section>
          ) : null}

          {summary.warnings.map((warning) => (
            <p className="warning-line" key={warning}>
              <AlertTriangle size={16} aria-hidden="true" /> {warning}
            </p>
          ))}

          <div className="tool-actions">
            {busy ? (
              <button type="button" className="secondary-button" onClick={cancelProcessing}>
                <Square size={17} aria-hidden="true" /> Cancel
              </button>
            ) : null}
            <button type="button" className="ghost-button" onClick={() => resetTool()}>
              <RotateCcw size={17} aria-hidden="true" /> Reset
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!analysis || selectedColumns.length === 0 || busy}
              onClick={exportFile}
            >
              <Download size={17} aria-hidden="true" /> Export cleaned file
            </button>
          </div>
        </div>
      ) : null}

      {status === "error" && error ? (
        <div className="error-box">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>File not processed</strong>
            <p>{error}</p>
            <button type="button" className="ghost-button" onClick={() => resetTool()}>
              <RotateCcw size={17} aria-hidden="true" /> Reset
            </button>
          </div>
        </div>
      ) : null}

      {download ? (
        <div className="success-box">
          <Check size={18} aria-hidden="true" />
          <div>
            <strong>{download.message}</strong>
            <a href={download.url} download={download.fileName}>
              <Trash2 size={16} aria-hidden="true" /> Download {download.fileName}
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
