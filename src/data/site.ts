export const canonicalOrigin = "https://www.removeduplicatesexcel.org";

export type RouteKey = "home" | "guide" | "privacy" | "terms" | "not-found";

export interface RouteMeta {
  key: RouteKey;
  path: string;
  title: string;
  description: string;
  h1: string;
  canonical: string;
}

export const routes: Record<RouteKey, RouteMeta> = {
  home: {
    key: "home",
    path: "/",
    title: "Remove Duplicates Excel - Browser XLSX and CSV Duplicate Remover",
    description:
      "Remove duplicate rows from Excel XLSX and CSV files in your browser. Choose sheets, headers, columns, match rules, preview duplicate groups, and export a cleaned file.",
    h1: "Remove Duplicates Excel",
    canonical: `${canonicalOrigin}/`
  },
  guide: {
    key: "guide",
    path: "/how-to-remove-duplicates-in-excel/",
    title: "How to Remove Duplicates in Excel Without Losing Rows",
    description:
      "A practical guide to Excel Remove Duplicates, conditional formatting, Advanced Filter, UNIQUE, and Power Query, with backup and column-selection checks.",
    h1: "How to Remove Duplicates in Excel",
    canonical: `${canonicalOrigin}/how-to-remove-duplicates-in-excel/`
  },
  privacy: {
    key: "privacy",
    path: "/privacy/",
    title: "Privacy - Remove Duplicates Excel",
    description:
      "How Remove Duplicates Excel handles spreadsheet files, local browser memory, downloads, logs, and third-party dependencies.",
    h1: "Privacy",
    canonical: `${canonicalOrigin}/privacy/`
  },
  terms: {
    key: "terms",
    path: "/terms/",
    title: "Terms - Remove Duplicates Excel",
    description:
      "Terms for lawful use of the browser-based Excel and CSV duplicate remover.",
    h1: "Terms",
    canonical: `${canonicalOrigin}/terms/`
  },
  "not-found": {
    key: "not-found",
    path: "/404.html",
    title: "Page Not Found - Remove Duplicates Excel",
    description: "The requested page was not found.",
    h1: "Page Not Found",
    canonical: `${canonicalOrigin}/404.html`
  }
};

export function routeFromPath(pathname: string): RouteMeta {
  const clean = pathname.endsWith("/") ? pathname : `${pathname}/`;
  if (pathname === "/" || pathname === "") return routes.home;
  if (clean === routes.guide.path) return routes.guide;
  if (clean === routes.privacy.path) return routes.privacy;
  if (clean === routes.terms.path) return routes.terms;
  return routes["not-found"];
}
