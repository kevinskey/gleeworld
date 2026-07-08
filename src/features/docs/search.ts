import MiniSearch from "minisearch";
import { stripMarkdown } from "./content";
import type { DocPage } from "./registry";

function makeIndex(pages: DocPage[]) {
  const mini = new MiniSearch<DocPage & { text: string }>({
    fields: ["title", "summary", "text"],
    storeFields: ["path", "route", "title", "audience", "summary", "section", "body"],
    idField: "path",
    searchOptions: { boost: { title: 3, summary: 2 }, prefix: true, fuzzy: 0.2 },
  });
  mini.addAll(pages.map((p) => ({ ...p, text: stripMarkdown(p.body) })));
  return mini;
}

let cache: { pages: DocPage[]; mini: ReturnType<typeof makeIndex> } | null = null;

export function searchDocs(query: string, pages: DocPage[]): DocPage[] {
  if (!query.trim()) return [];
  if (!cache || cache.pages !== pages) cache = { pages, mini: makeIndex(pages) };
  return cache.mini.search(query).map((r) => r as unknown as DocPage);
}
