import { AlertCircle, ArrowRight, CheckCircle2, FileSpreadsheet, Github, ShieldCheck } from "lucide-react";
import { DeduperTool } from "./components/DeduperTool";
import { routeFromPath, routes, type RouteMeta } from "./data/site";

interface AppProps {
  path?: string;
}

function Layout({ route, children }: { route: RouteMeta; children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Remove Duplicates Excel home">
          <span className="brand-mark" aria-hidden="true">
            <FileSpreadsheet size={22} />
          </span>
          <span>Remove Duplicates Excel</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="/">Tool</a>
          <a href="/how-to-remove-duplicates-in-excel/">Guide</a>
          <a href="/blog/">Blog</a>
          <a href="/privacy/">Privacy</a>
          <a href="/terms/">Terms</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <strong>Remove Duplicates Excel</strong>
          <p>Browser-based XLSX and CSV duplicate row cleanup. No accounts, no server uploads, no analytics in version one.</p>
        </div>
        <div className="footer-links">
          <a href={routes.guide.path}>Excel guide</a>
          <a href={routes.privacy.path}>Privacy</a>
          <a href={routes.terms.path}>Terms</a>
          <a href="https://github.com/aichuanheyan004-prog/removeduplicatesexcel" rel="noopener noreferrer">
            <Github size={16} aria-hidden="true" /> GitHub
          </a>
        </div>
        <span className="sr-only">{route.title}</span>
      </footer>
    </div>
  );
}

function HomePage() {
  return (
    <Layout route={routes.home}>
      <section className="hero-band">
        <div className="hero-copy">
          <p className="eyebrow">XLSX and CSV duplicate row cleaner</p>
          <h1>Remove Duplicates Excel</h1>
          <p>
            Open an Excel workbook or CSV, choose the sheet, confirm the header row, select the columns that define a
            duplicate, preview what will be kept or removed, compare against a second file when needed, then download a
            cleaned file.
          </p>
          <ul className="trust-list" aria-label="Tool scope">
            <li>
              <ShieldCheck size={18} aria-hidden="true" /> Runs in browser memory after the page loads
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" /> Tested for .xlsx and UTF-8 .csv files up to 8 MB
            </li>
            <li>
              <AlertCircle size={18} aria-hidden="true" /> Exports value snapshots, not formulas or workbook styling
            </li>
          </ul>
        </div>
        <DeduperTool />
      </section>

      <section className="content-band">
        <div className="content-grid">
          <article>
            <h2>What This Excel Duplicate Remover Does</h2>
            <p>
              This tool removes duplicate rows from a selected worksheet or CSV table. It can match an entire row or a
              chosen set of columns, which is useful when a customer ID, email address, SKU, invoice number, or multi-column
              key should decide whether rows are duplicates.
            </p>
            <p>
              It can also compare the selected rows with a second spreadsheet in the same browser session. That comparison
              uses the same column positions and match rules, so align the files before relying on cross-file matches.
            </p>
            <p>
              For Excel workbooks, every worksheet is exported in the original sheet order. The selected sheet is cleaned;
              other sheets are copied as displayed values. The download is verified by parsing the generated file before a
              link is created.
            </p>
          </article>
          <article>
            <h2>Matching Rules</h2>
            <ul className="plain-list">
              <li>Default matching uses the displayed cell text. Values that display the same compare as duplicates.</li>
              <li>Choose one or more columns for a combined duplicate key.</li>
              <li>Optional trim ignores leading and trailing spaces while comparing.</li>
              <li>Optional case-insensitive matching treats values like APPLE and apple as the same key.</li>
              <li>Completely empty rows are kept and are not counted as duplicate groups.</li>
              <li>Blank cells inside selected columns compare as blank values.</li>
            </ul>
          </article>
          <article>
            <h2>Export Limits</h2>
            <p>
              Version one supports `.xlsx` and UTF-8 `.csv`. It does not support password-protected files, `.xls`, `.xlsm`,
              `.ods`, macros, comments, external links, pivot tables, charts, images, formulas, or cell styling preservation.
              Formula cells are read from their cached displayed value when the workbook includes one.
            </p>
          </article>
          <article>
            <h2>Need Excel's Built-In Tool?</h2>
            <p>
              Excel's own Remove Duplicates command is still the best choice when you need to edit the original workbook
              inside Excel. Use this web tool when you want a browser-local preview, alternate keep strategies, or a quick
              cleaned copy without changing the source file.
            </p>
            <a className="text-link" href="/how-to-remove-duplicates-in-excel/">
              Read the Excel guide <ArrowRight size={16} aria-hidden="true" />
            </a>
          </article>
        </div>
      </section>
    </Layout>
  );
}

function GuidePage() {
  return (
    <Layout route={routes.guide}>
      <article className="article-page">
        <p className="eyebrow">Excel duplicate removal guide</p>
        <h1>How to Remove Duplicates in Excel</h1>
        <p className="lede">
          The safest workflow is to find duplicates first, copy or save the original data, then remove rows only after you
          understand which columns define a duplicate.
        </p>

        <h2>Use Excel Remove Duplicates</h2>
        <ol>
          <li>Make a backup copy of the range, sheet, or workbook before deleting rows.</li>
          <li>Select a cell in the range or Excel table that contains the duplicate rows.</li>
          <li>Open the Data tab and choose Remove Duplicates.</li>
          <li>Confirm whether the first row contains headers.</li>
          <li>Select the columns that should define a duplicate. Excel removes the entire row when the selected columns match.</li>
          <li>Review the count Excel reports after removal, then save the cleaned copy only if the result is expected.</li>
        </ol>
        <p>
          Microsoft documents that Remove Duplicates keeps the first matching row and deletes later matching rows. It also
          recommends checking or copying data before removal because deletion is permanent unless you undo before saving.
        </p>

        <h2>Find Duplicates Before Deleting</h2>
        <p>
          Conditional Formatting is useful when you want to highlight duplicate values first. It is a review step, not the
          same as row-level deletion across selected columns. Use it when a visible check is safer than immediate removal.
        </p>

        <h2>Filter Unique Values Instead</h2>
        <p>
          Advanced Filter can show or copy unique records without deleting the original list. Use it when the source data
          should remain unchanged and you only need a unique output range.
        </p>

        <h2>Use UNIQUE or Power Query</h2>
        <p>
          The UNIQUE function is helpful in Microsoft 365 and recent Excel versions when you want a dynamic unique list.
          Power Query is better when the same cleanup should be repeatable on refreshed data. In Power Query, you can select
          columns and remove or keep duplicate rows as part of the query steps.
        </p>

        <h2>How This Browser Tool Differs</h2>
        <p>
          The tool on this site creates a cleaned copy instead of editing the original workbook. It lets you preview
          duplicate groups, choose keep first, keep last, or remove all rows in duplicate groups, and export after verifying
          the generated file can be parsed again.
        </p>

        <h2>Common Edge Cases</h2>
        <ul className="plain-list">
          <li>Different date formats can compare differently if their displayed text is different.</li>
          <li>Spaces matter unless a trim option is enabled.</li>
          <li>Case matters unless a case-insensitive option is enabled.</li>
          <li>Blank cells can be part of a duplicate key.</li>
          <li>Duplicate header names should be disambiguated before selecting columns.</li>
          <li>Password-protected or damaged workbooks need to be repaired or unlocked before browser tools can process them.</li>
        </ul>

        <h2>Sources</h2>
        <ul className="source-list">
          <li>
            <a href="https://support.microsoft.com/en-us/excel/get-started/filter-for-unique-values-or-remove-duplicate-values" rel="noopener noreferrer">
              Microsoft Support: Filter for unique values or remove duplicate values
            </a>
          </li>
          <li>
            <a href="https://support.microsoft.com/en-us/excel/find-and-remove-duplicates" rel="noopener noreferrer">
              Microsoft Support: Find and remove duplicates
            </a>
          </li>
          <li>
            <a href="https://support.microsoft.com/en-us/excel/keep-or-remove-duplicate-rows-power-query" rel="noopener noreferrer">
              Microsoft Support: Keep or remove duplicate rows in Power Query
            </a>
          </li>
          <li>
            <a href="https://support.microsoft.com/en-us/excel/functions/unique-function" rel="noopener noreferrer">
              Microsoft Support: UNIQUE function
            </a>
          </li>
        </ul>
      </article>
    </Layout>
  );
}

function PrivacyPage() {
  return (
    <Layout route={routes.privacy}>
      <article className="article-page">
        <h1>Privacy</h1>
        <p className="lede">
          Remove Duplicates Excel is designed for local spreadsheet cleanup. Version one has no account system, no database,
          no analytics, and no server upload endpoint for your files.
        </p>
        <h2>Your Files</h2>
        <p>
          When you choose a file, the browser reads it into memory and sends it to a Web Worker in the same page. The
          workbook is not uploaded by this site, not stored on a server, and not made public. Closing or resetting the page
          clears the in-memory workbook state.
        </p>
        <h2>Downloads</h2>
        <p>
          The cleaned file is created as a temporary object URL in your browser. The page revokes old object URLs when you
          reset, load another file, or leave the page. Your original file is never overwritten.
        </p>
        <h2>Third-Party Code</h2>
        <p>
          The site uses React for the interface, SheetJS Community Edition for XLSX parsing and writing, and PapaParse for
          CSV parsing and writing. These libraries are bundled into the static site. The hosted page and static assets are
          delivered by Vercel after deployment.
        </p>
        <h2>Logs</h2>
        <p>
          Version one does not intentionally send file names, sheet names, column names, cell contents, duplicate keys, or
          exported data to analytics or error logging. Static hosting providers may process ordinary request metadata such
          as IP address, user agent, URL path, and timestamp to deliver the site and protect the service.
        </p>
      </article>
    </Layout>
  );
}

function TermsPage() {
  return (
    <Layout route={routes.terms}>
      <article className="article-page">
        <h1>Terms</h1>
        <p className="lede">Use this site only with files you own or are authorized to process.</p>
        <h2>Allowed Use</h2>
        <p>
          You may use Remove Duplicates Excel for lawful personal or commercial spreadsheet cleanup. You are responsible for
          reviewing the preview and downloaded output before relying on it.
        </p>
        <h2>Not Supported</h2>
        <p>
          Do not use the site to process files you are not allowed to access, bypass protection on documents, scrape third
          party URLs, publish someone else's private data, or interfere with the service. The tool does not recover
          passwords or remove workbook protection.
        </p>
        <h2>No Warranty</h2>
        <p>
          The tool is provided as-is. Always keep a copy of the original workbook and verify the cleaned file in your own
          workflow before deleting or replacing source data.
        </p>
      </article>
    </Layout>
  );
}

function NotFoundPage() {
  return (
    <Layout route={routes["not-found"]}>
      <section className="article-page not-found">
        <h1>Page Not Found</h1>
        <p>The page you requested is not available. The duplicate remover and guide are linked below.</p>
        <div className="button-row">
          <a className="primary-link" href="/">
            Open the tool
          </a>
          <a className="secondary-link" href="/how-to-remove-duplicates-in-excel/">
            Read the guide
          </a>
        </div>
      </section>
    </Layout>
  );
}

export function App({ path = "/" }: AppProps) {
  const route = routeFromPath(path);
  if (route.key === "guide") return <GuidePage />;
  if (route.key === "privacy") return <PrivacyPage />;
  if (route.key === "terms") return <TermsPage />;
  if (route.key === "not-found") return <NotFoundPage />;
  return <HomePage />;
}
