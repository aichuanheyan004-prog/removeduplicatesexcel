# Decision Record

Date checked: 2026-07-27

## Target Task

A US English spreadsheet user needs to identify, preview, and remove duplicate rows from an Excel XLSX workbook or CSV file, then download a cleaned copy without uploading sensitive table data.

## Historical Screenshot Notes

The user-provided 2025-09-18 screenshot is treated only as historical third-party research. It suggested: the keyword cluster around "remove duplicates excel" had meaningful search demand, current results mixed Microsoft/tutorial pages with smaller tool opportunities, long-tail tutorial phrases were useful, exact-match domains existed, and a Python/open-source spreadsheet library implementation was proposed. None of the screenshot's volume, KD, CPC, competitor traffic, or domain claims are treated as current 2026 facts.

## Current SERP Intent And Evidence

Target market/language: United States, English.

Current observed intent: mixed how-to and tool intent. Microsoft Support and tutorial pages satisfy the "how do I remove duplicates in Excel" portion, while active browser-local tools satisfy users who want to upload/open a spreadsheet and download a cleaned copy.

Observed current result types:

- Official Microsoft Support pages for Remove Duplicates, unique values, conditional formatting, UNIQUE, and Power Query.
- Spreadsheet/tutorial publishers explaining built-in Excel workflows.
- Browser-local duplicate remover tools for text, CSV, and Excel files.
- Exact-match and near-exact-match micro-sites with broad claims, some unsupported claims, or thin UX.

Primary sources used:

- Microsoft Support: https://support.microsoft.com/en-us/excel/get-started/filter-for-unique-values-or-remove-duplicate-values
- Microsoft Support: https://support.microsoft.com/en-us/excel/find-and-remove-duplicates
- Microsoft Support: https://support.microsoft.com/en-us/excel/keep-or-remove-duplicate-rows-power-query
- Microsoft Support: https://support.microsoft.com/en-us/excel/functions/unique-function
- SheetJS CE docs and license: https://docs.sheetjs.com/docs/ and https://docs.sheetjs.com/docs/miscellany/license/
- SheetJS installation: https://docs.sheetjs.com/docs/getting-started/installation/nodejs/
- PapaParse repository: https://github.com/mholt/PapaParse

## Verdict

Verdict: build.

Reason: the current SERP supports a combined tool plus guide page. The useful MVP is small, browser-local, and low-cost. Risk is manageable with precise privacy wording, conservative format claims, no uploads, no analytics, no account system, and no support for unauthorized files or protected documents.

## Current Competitors And Gaps

Competitors visible in current results include Microsoft Support, W3Schools-style tutorials, RemoveDuplicates.org, removeduplicatesexcel.com, excelremoveduplicates.com, deleteduplicatesexcel.com, CSV-focused tools, CleanMyExcel, and ExcelCleansing-style utilities.

Gaps this site can address:

- Combine Excel's official workflow guidance with a real tool above the fold.
- Show duplicate groups and row-level keep/remove preview before export.
- Offer explicit keep first, keep last, and remove all duplicate-group strategies.
- Offer browser-local comparison against a second uploaded spreadsheet when the user needs to find rows that already appear in another file.
- State exact tested file limits instead of broad unverified format or size claims.
- Verify the generated download by reparsing it before offering it.
- Keep no-analytics, no-upload privacy wording aligned with implementation.

## Product And Page Plan

Primary URL: /

- Page type: core browser-local tool plus concise support content.
- Keyword cluster: remove duplicates excel, remove duplicate rows in excel, delete duplicates in excel, excel duplicate remover, remove duplicates online, find duplicates in Excel.
- Index/canonical: 200, self-canonical to https://www.removeduplicatesexcel.org/

Guide URL: /how-to-remove-duplicates-in-excel/

- Page type: sourced how-to guide.
- Unique value: explains when to use Excel Remove Duplicates, Conditional Formatting, Advanced Filter, UNIQUE, Power Query, and this browser tool.
- Index/canonical: 200, self-canonical.

Privacy URL: /privacy/

- Page type: required trust/legal page.
- Index/canonical: 200, self-canonical.

Terms URL: /terms/

- Page type: required terms page.
- Index/canonical: 200, self-canonical.

404: /404.html

- Page type: real not-found page. Excluded from sitemap.

Deferred pages:

- find duplicates in Excel
- CSV duplicate remover
- Power Query remove duplicates
- formulas for duplicates
- VBA remove duplicates
- troubleshooting duplicate removal

Decision: postpone as separate pages until GSC queries or user testing show independent intent and the page can add unique depth beyond the homepage and guide.

Avoid:

- Doorway pages for slight wording variants.
- Multi-language launch without validated demand, full UX translation, and maintenance capacity.
- Public result pages, UGC, third-party URL fetching, password bypass, protected workbook recovery, or server uploads.

## MVP Acceptance Criteria

- Drag/drop and file picker.
- Built-in synthetic sample workbook and CSV with no real personal data.
- XLSX and UTF-8 CSV parsing in a Web Worker.
- Select worksheet, header mode, duplicate-key columns, keep strategy, trim, and case options.
- Show total rows, compared rows, duplicate groups, rows to remove, group preview, row status preview.
- Keep first, keep last, and remove all duplicate-group strategies.
- Optional second-file comparison using the same selected column positions and match options.
- Export a cleaned XLSX/CSV with predictable `base-deduped-YYYYMMDD-HHMMSS.ext` naming.
- Reparse and verify the generated file before creating a download URL.
- Reset clears worker state, large arrays, input value, and object URLs.
- Show invalid file, corrupted workbook, resource limit, cancellation, success, and empty states.
- Static pages include title, description, H1, canonical, sitemap, robots, favicon, social tags, and JSON-LD consistent with real features.

## Tested And Declared Limits

- Supported files: `.xlsx` and UTF-8 `.csv`.
- Maximum file size: 8 MB.
- Maximum rows: 50,000 per sheet.
- Maximum columns: 200 per sheet.
- Maximum parsed cells: 500,000.
- Browser support: modern browsers with File, Blob, URL, TextEncoder/TextDecoder, and Web Worker support.
- Export behavior: displayed-value snapshots only. Styles, formulas, macros, charts, images, comments, external links, pivot tables, and metadata are not preserved.

## Risk Decision

Feature/data/content: browser-local duplicate row cleanup for user-selected files.

Legitimate user and authorized task: a user cleaning spreadsheets they own or are authorized to process.

Potential harmful/prohibited use: processing unauthorized personal data, expecting password bypass, uploading protected third-party data, or relying on unverified output.

Rights/source/terms: no copied competitor content; UI and copy are original; Microsoft guidance is paraphrased and cited; sample data is synthetic using reserved `.test` emails.

Personal/sensitive data flow: selected file stays in browser memory and worker memory; no upload endpoint, no analytics, no intentional content logging; export uses temporary object URLs.

Public/indexable behavior: user files and outputs are never public pages.

Platform/payment/ad dependencies: none in version one.

Controls and residual risk: strict file limits, unsupported-format errors, clear value-snapshot limitations, terms requiring authorized use, no account/database/server upload, no analytics.

Outcome: allow with controls.

Reviewer and date: Codex, 2026-07-27.

Recheck trigger: adding analytics, server upload, larger file support, more formats, formulas/styles preservation, UGC, public results, ads, payments, or separate long-tail page clusters.

## Launch Metrics

- Search: GSC impressions, indexed canonical status, query/page/device/country split.
- Product: sample starts, file starts, valid parses, duplicate previews, verified exports, error reasons. Version one intentionally does not track analytics.
- Review: manual production smoke tests and GSC coverage first week, then decide whether privacy-preserving analytics are justified.

## Expansion/Stop Thresholds

Expand only if the homepage or guide earns relevant impressions, users complete exports in manual/observed tests, and new queries show independent intent. Stop or merge any proposed page that only repeats the main keyword with slight wording changes.
