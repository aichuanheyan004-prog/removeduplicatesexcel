# Test Plan

## Fixtures

The project generates synthetic fixtures with `npm run prebuild`.

- `public/samples/remove-duplicates-excel-sample.xlsx`
- `public/samples/remove-duplicates-excel-sample.csv`
- `tests/fixtures/sample-workbook.xlsx`
- `tests/fixtures/sample.csv`

Fixture coverage:

- single-column duplicates
- multi-column duplicates
- keep first
- keep last
- remove all duplicate-group rows
- case and whitespace options
- blank cells and empty rows
- numeric and text values compared by displayed text
- dates with different displayed strings
- duplicate headers
- multiple worksheets
- formula cells flattened to displayed/cached values on export
- value-only output with no style/formula preservation claim
- second-file comparison by selected duplicate-key columns

## Automated Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run audit:static`

## Manual Browser Verification

Use browser control for:

- desktop first load
- 390 px mobile first load
- sample workbook load
- worksheet switch
- header toggle
- column selection
- keep first, keep last, and remove all strategies
- trim and case options
- preview row highlighting
- verified export and download filename
- second spreadsheet upload and cross-file match preview
- corrupted workbook error
- reset and object URL cleanup
- keyboard focus visibility
- console errors
- horizontal overflow
- indexable routes
- real 404
- canonical, robots, sitemap, favicon, and social image paths
