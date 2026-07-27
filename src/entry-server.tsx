import { renderToString } from "react-dom/server";
import { App } from "./App";
import { routeFromPath } from "./data/site";

export function renderPage(path: string) {
  const route = routeFromPath(path);
  const html = renderToString(<App path={path} />);
  return {
    html,
    route,
    jsonLd:
      route.key === "home"
        ? {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Remove Duplicates Excel",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: route.canonical,
            description:
              "A browser-based tool for previewing and removing duplicate rows from XLSX and CSV files.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD"
            }
          }
        : {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: route.h1,
            url: route.canonical,
            description: route.description
          }
  };
}
