import meta from "../../../docs/manual/_meta.json";
import { parseFrontmatter, pathToRoute } from "./content";

export type DocPage = {
  path: string; route: string; title: string;
  audience: string; summary: string; section: string; body: string;
};
export type NavItem = { title: string; path: string; route: string };
export type NavSection = { title: string; children: NavItem[] };

// Bundle only user-facing manual pages as raw strings at build time.
// Internal fact sheets and the style guide are excluded so they never ship in the
// public bundle (they carry code provenance and editorial notes).
const raw = import.meta.glob(
  [
    "../../../docs/manual/**/*.md",
    "!../../../docs/manual/_factsheets/**",
    "!../../../docs/manual/STYLE.md",
  ],
  { query: "?raw", import: "default", eager: true }
) as Record<string, string>;

// Map absolute glob keys to manual-relative paths (e.g. "tenants/program-setup.md").
const byManualPath = new Map<string, string>();
for (const [key, text] of Object.entries(raw)) {
  const m = key.match(/docs\/manual\/(.+\.md)$/);
  if (!m) continue;
  if (m[1].startsWith("_factsheets/") || m[1] === "STYLE.md") continue;
  byManualPath.set(m[1], text);
}

export const docNav: NavSection[] = [];
export const docPages: DocPage[] = [];
export const pageByRoute = new Map<string, DocPage>();

type RawSection = { title: string; children?: { title: string; path: string }[] };
for (const sec of (meta as { nav: RawSection[] }).nav) {
  const children: NavItem[] = [];
  for (const child of sec.children || []) {
    const text = byManualPath.get(child.path);
    if (!text) continue;
    const { fm, body } = parseFrontmatter(text);
    // Internal [VERIFY: ...] notes are for editorial review only — never render them to readers.
    const cleanBody = body
      .replace(/!\[VERIFY[^\]]*\]\([^)]*\)/g, "")
      .replace(/[ \t]*\[VERIFY[^\]]*\]/g, "")
      .replace(/[ \t]+$/gm, "");
    const route = pathToRoute(child.path);
    const page: DocPage = {
      path: child.path, route,
      title: fm.title || child.title,
      audience: fm.audience || "all",
      summary: fm.summary || "",
      section: sec.title,
      body: cleanBody,
    };
    docPages.push(page);
    pageByRoute.set(route, page);
    children.push({ title: page.title, path: child.path, route });
  }
  docNav.push({ title: sec.title, children });
}

export const manualTitle: string = (meta as { title?: string }).title || "GleeWorld User Manual";
