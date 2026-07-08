# GleeWorld Manual (Phase B — Native `/docs` Route) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Render the Phase A manual (`docs/manual/`) as a native, searchable `/docs` section inside the existing GleeWorld React/Vite SPA, matching the app's branding and deploy.

**Architecture:** Markdown is bundled at build time via `import.meta.glob` (raw), keyed by the `_meta.json` nav so only real manual pages ship (fact sheets/STYLE excluded). Pure helpers (frontmatter parse, relative-link resolution, search indexing) are unit-tested with vitest; React components render via `react-markdown` + `remark-gfm` styled with the installed `@tailwindcss/typography` `prose` classes; client-side search uses `minisearch`. A single public route `/docs/*` drives a layout with sidebar nav, search, and content.

**Tech Stack:** React 18, React Router 6, Vite 5, Tailwind + shadcn/ui, `@tailwindcss/typography`, vitest. New deps: `react-markdown`, `remark-gfm`, `minisearch`.

## Global Constraints

- Content source of truth stays `docs/manual/` (Phase A). Phase B only reads it; it does not edit page content.
- `/docs` is **public** (no auth) — anyone can read the manual.
- Do not break the existing `/docs/architecture` route (more specific; keep it).
- Match app conventions: `@/` alias = `src/`, shadcn/ui primitives from `@/components/ui/*`, Tailwind theme tokens (`bg-background`, `text-primary`, `text-muted-foreground`, `border`, `container`), lucide-react icons, theme-aware (light/dark via tokens). Header respects `var(--gw-safe-top)`.
- Package manager: use `bun` (repo has `bun.lockb`); `npm` is an acceptable fallback.
- Nav/page URLs: a manual path `tenants/program-setup.md` maps to route `/docs/tenants/program-setup`; `glossary.md` maps to `/docs/glossary`; `/docs` (empty) is the manual home.

---

## File Structure

```
src/features/docs/
├── content.ts          # PURE: parseFrontmatter, resolveDocLink, pathToRoute, stripMarkdown
├── content.test.ts     # vitest unit tests for content.ts
├── registry.ts         # import.meta.glob + _meta.json → typed pages[] and nav[]
├── search.ts           # minisearch index over pages; searchDocs()
├── search.test.ts      # vitest unit tests for search
├── MarkdownView.tsx    # react-markdown + remark-gfm, link/anchor overrides
├── DocsSidebar.tsx     # nav tree from registry.nav
├── DocsSearch.tsx      # search input + results
├── DocsHome.tsx        # /docs landing (section cards)
├── DocsPage.tsx        # renders one page + prev/next + breadcrumb
└── DocsApp.tsx         # layout shell; reads splat, routes to Home/Page

src/App.tsx             # + lazy DocsApp, + <Route path="/docs/*">
```

---

### Task 1: Add dependencies

**Files:** `package.json`, lockfile.

- [ ] **Step 1: Install deps**

Run: `bun add react-markdown remark-gfm minisearch`
Expected: three packages added, lockfile updated, exit 0. (Fallback: `npm install react-markdown remark-gfm minisearch`.)

- [ ] **Step 2: Verify they resolve**

Run: `node -e "require.resolve('minisearch'); console.log('ok')"`
Expected: `ok`. (react-markdown/remark-gfm are ESM-only; verified indirectly by the build in later tasks.)

- [ ] **Step 3: Commit** — `git add package.json bun.lock* package-lock.json; git commit -m "chore(docs): add react-markdown, remark-gfm, minisearch"`

---

### Task 2: Pure content helpers (`content.ts`) — TDD

**Files:** Create `src/features/docs/content.ts`, `src/features/docs/content.test.ts`

**Interfaces:**
- Produces:
  - `parseFrontmatter(raw: string): { fm: Record<string,string>; body: string }`
  - `pathToRoute(manualPath: string): string` — `"tenants/x.md"` → `"/docs/tenants/x"`, `"glossary.md"` → `"/docs/glossary"`
  - `resolveDocLink(currentManualPath: string, href: string): { internal: string } | { external: string }` — resolves a relative `.md` href against the current page's directory to a `/docs/...` route; passes through external/anchor hrefs
  - `stripMarkdown(md: string): string` — plain text for search indexing

- [ ] **Step 1: Write failing tests** `src/features/docs/content.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { parseFrontmatter, pathToRoute, resolveDocLink, stripMarkdown } from "./content";

describe("parseFrontmatter", () => {
  it("splits frontmatter and body", () => {
    const raw = `---\ntitle: "Hello"\naudience: all\n---\n# Hi\n\nBody`;
    const { fm, body } = parseFrontmatter(raw);
    expect(fm.title).toBe("Hello");
    expect(fm.audience).toBe("all");
    expect(body.trim()).toBe("# Hi\n\nBody");
  });
  it("returns empty fm when none", () => {
    const { fm, body } = parseFrontmatter("# No fm");
    expect(fm).toEqual({});
    expect(body).toBe("# No fm");
  });
});

describe("pathToRoute", () => {
  it("maps section page", () => { expect(pathToRoute("tenants/program-setup.md")).toBe("/docs/tenants/program-setup"); });
  it("maps root page", () => { expect(pathToRoute("glossary.md")).toBe("/docs/glossary"); });
});

describe("resolveDocLink", () => {
  it("resolves ../ link from a section page", () => {
    const r = resolveDocLink("students/studio-basics.md", "../tenants/billing-and-plans.md");
    expect(r).toEqual({ internal: "/docs/tenants/billing-and-plans" });
  });
  it("resolves root-relative link from glossary", () => {
    const r = resolveDocLink("glossary.md", "tenants/activating-add-ons.md");
    expect(r).toEqual({ internal: "/docs/tenants/activating-add-ons" });
  });
  it("passes through external", () => {
    const r = resolveDocLink("faq/x.md", "https://gleeworld.org");
    expect(r).toEqual({ external: "https://gleeworld.org" });
  });
  it("passes through anchors", () => {
    expect(resolveDocLink("faq/x.md", "#top")).toEqual({ external: "#top" });
  });
});

describe("stripMarkdown", () => {
  it("removes markdown syntax", () => {
    expect(stripMarkdown("# Title\n\n**bold** and [link](x.md)")).toContain("Title");
    expect(stripMarkdown("**bold**")).toBe("bold");
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `bunx vitest run src/features/docs/content.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/features/docs/content.ts`**

```ts
export function parseFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: raw };
  const fm: Record<string, string> = {};
  for (const line of raw.slice(3, end).trim().split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { fm, body: raw.slice(end + 4).replace(/^\n+/, "") };
}

export function pathToRoute(manualPath: string): string {
  return "/docs/" + manualPath.replace(/\.md$/, "");
}

export function resolveDocLink(
  currentManualPath: string,
  href: string
): { internal: string } | { external: string } {
  if (!href || /^(https?:|mailto:|#|\/)/i.test(href)) return { external: href };
  if (!href.endsWith(".md")) return { external: href };
  const dir = currentManualPath.includes("/")
    ? currentManualPath.slice(0, currentManualPath.lastIndexOf("/"))
    : "";
  const stack = dir ? dir.split("/") : [];
  for (const part of href.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return { internal: pathToRoute(stack.join("/")) };
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

- [ ] **Step 4: Run — expect pass**

Run: `bunx vitest run src/features/docs/content.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit** — `git add src/features/docs/content.*; git commit -m "feat(docs): pure content helpers with tests"`

---

### Task 3: Content registry (`registry.ts`)

**Files:** Create `src/features/docs/registry.ts`

**Interfaces:**
- Consumes: `parseFrontmatter`, `pathToRoute` from `content.ts`; `docs/manual/_meta.json`; raw `.md` via glob.
- Produces:
  - `type DocPage = { path: string; route: string; title: string; audience: string; summary: string; section: string; body: string }`
  - `type NavSection = { title: string; children: { title: string; path: string; route: string }[] }`
  - `export const docPages: DocPage[]`, `export const docNav: NavSection[]`, `export const pageByRoute: Map<string, DocPage>`

- [ ] **Step 1: Implement**

```ts
import meta from "../../../docs/manual/_meta.json";
import { parseFrontmatter, pathToRoute } from "./content";

export type DocPage = {
  path: string; route: string; title: string;
  audience: string; summary: string; section: string; body: string;
};
export type NavItem = { title: string; path: string; route: string };
export type NavSection = { title: string; children: NavItem[] };

// Bundle every manual markdown file as a raw string at build time.
const raw = import.meta.glob("../../../docs/manual/**/*.md", {
  query: "?raw", import: "default", eager: true,
}) as Record<string, string>;

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

for (const sec of (meta as any).nav as { title: string; children: { title: string; path: string }[] }[]) {
  const children: NavItem[] = [];
  for (const child of sec.children || []) {
    const text = byManualPath.get(child.path);
    if (!text) continue;
    const { fm, body } = parseFrontmatter(text);
    const route = pathToRoute(child.path);
    const page: DocPage = {
      path: child.path, route,
      title: fm.title || child.title,
      audience: fm.audience || "all",
      summary: fm.summary || "",
      section: sec.title,
      body,
    };
    docPages.push(page);
    pageByRoute.set(route, page);
    children.push({ title: page.title, path: child.path, route });
  }
  docNav.push({ title: sec.title, children });
}

export const manualTitle: string = (meta as any).title || "GleeWorld User Manual";
```

- [ ] **Step 2: Typecheck the module compiles (via build in Task 7).** No standalone test — glob requires the Vite pipeline; it is exercised by the render smoke in Task 8.

- [ ] **Step 3: Commit** — `git add src/features/docs/registry.ts; git commit -m "feat(docs): build-time content registry from _meta.json"`

---

### Task 4: Search (`search.ts`) — TDD

**Files:** Create `src/features/docs/search.ts`, `src/features/docs/search.test.ts`

**Interfaces:**
- Consumes: `DocPage` shape, `stripMarkdown`.
- Produces: `buildIndex(pages: DocPage[])` and `searchDocs(query: string, pages: DocPage[]): DocPage[]` (ranked; empty query → []).

- [ ] **Step 1: Write failing test** `search.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { searchDocs } from "./search";

const pages = [
  { path: "a.md", route: "/docs/a", title: "Buying tickets", audience: "fan", summary: "Purchase tickets", section: "Fans", body: "Pay by card through Stripe checkout." },
  { path: "b.md", route: "/docs/b", title: "Studio basics", audience: "student", summary: "Record", section: "Students", body: "Use the practice studio to record." },
];

describe("searchDocs", () => {
  it("finds by title", () => {
    const r = searchDocs("tickets", pages as any);
    expect(r[0].route).toBe("/docs/a");
  });
  it("finds by body", () => {
    const r = searchDocs("record", pages as any);
    expect(r[0].route).toBe("/docs/b");
  });
  it("empty query returns nothing", () => {
    expect(searchDocs("", pages as any)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect fail.** Run: `bunx vitest run src/features/docs/search.test.ts` → FAIL.

- [ ] **Step 3: Implement `search.ts`**

```ts
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
```

- [ ] **Step 4: Run — expect pass.** Run: `bunx vitest run src/features/docs/search.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add src/features/docs/search.*; git commit -m "feat(docs): client-side search with minisearch + tests"`

---

### Task 5: MarkdownView (`MarkdownView.tsx`)

**Files:** Create `src/features/docs/MarkdownView.tsx`

**Interfaces:**
- Consumes: `resolveDocLink`. Props: `{ body: string; currentPath: string }`.
- Produces: default export `MarkdownView`.

- [ ] **Step 1: Implement**

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { resolveDocLink } from "./content";

export default function MarkdownView({ body, currentPath }: { body: string; currentPath: string }) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-primary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...rest }) => {
            const resolved = resolveDocLink(currentPath, href || "");
            if ("internal" in resolved) return <Link to={resolved.internal}>{children}</Link>;
            const ext = resolved.external;
            const isHttp = /^https?:/i.test(ext);
            return (
              <a href={ext} {...(isHttp ? { target: "_blank", rel: "noreferrer" } : {})} {...rest}>
                {children}
              </a>
            );
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 2: Commit** — `git add src/features/docs/MarkdownView.tsx; git commit -m "feat(docs): markdown renderer with internal link resolution"`

---

### Task 6: Layout, sidebar, search UI, home, page

**Files:** Create `DocsSidebar.tsx`, `DocsSearch.tsx`, `DocsHome.tsx`, `DocsPage.tsx`, `DocsApp.tsx`

**Interfaces:**
- Consumes: `docNav`, `docPages`, `pageByRoute`, `manualTitle` (registry); `searchDocs`; `MarkdownView`.
- Produces: default export `DocsApp` (the `/docs/*` element).

- [ ] **Step 1: `DocsSidebar.tsx`** — nav tree; active link highlighted.

```tsx
import { NavLink } from "react-router-dom";
import { docNav } from "./registry";

export default function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-6 text-sm">
      {docNav.map((sec) => (
        <div key={sec.title}>
          <div className="mb-2 font-semibold text-foreground">{sec.title}</div>
          <ul className="space-y-1 border-l border-border">
            {sec.children.map((item) => (
              <li key={item.route}>
                <NavLink
                  to={item.route}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `-ml-px block border-l-2 pl-3 py-1 ${
                      isActive
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`
                  }
                >
                  {item.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: `DocsSearch.tsx`** — input + results dropdown.

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { docPages } from "./registry";
import { searchDocs } from "./search";

export default function DocsSearch() {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const results = searchDocs(q, docPages).slice(0, 8);
  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the manual…"
          className="pl-9"
          aria-label="Search the manual"
        />
      </div>
      {q && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          {results.map((r) => (
            <li key={r.route}>
              <button
                className="block w-full px-3 py-2 text-left hover:bg-accent"
                onMouseDown={() => { nav(r.route); setQ(""); }}
              >
                <div className="text-sm font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.section} — {r.summary}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          No results for “{q}”.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `DocsHome.tsx`** — landing with section cards.

```tsx
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { docNav, manualTitle } from "./registry";

export default function DocsHome() {
  return (
    <div>
      <h1 className="text-3xl font-bold">{manualTitle}</h1>
      <p className="mt-2 text-muted-foreground">
        Everything you need to run and use your program on GleeWorld. Choose a section, or search above.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {docNav.map((sec) => (
          <Card key={sec.title}>
            <CardContent className="pt-6">
              <h2 className="font-semibold">{sec.title}</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {sec.children.slice(0, 5).map((c) => (
                  <li key={c.route}>
                    <Link to={c.route} className="text-primary hover:underline">{c.title}</Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `DocsPage.tsx`** — one page + breadcrumb + prev/next.

```tsx
import { Link } from "react-router-dom";
import { docPages, pageByRoute } from "./registry";
import MarkdownView from "./MarkdownView";

export default function DocsPage({ route }: { route: string }) {
  const page = pageByRoute.get(route);
  if (!page) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          That page doesn’t exist. <Link to="/docs" className="text-primary hover:underline">Back to the manual home</Link>.
        </p>
      </div>
    );
  }
  const idx = docPages.findIndex((p) => p.route === route);
  const prev = idx > 0 ? docPages[idx - 1] : null;
  const next = idx < docPages.length - 1 ? docPages[idx + 1] : null;
  return (
    <article>
      <div className="mb-4 text-sm text-muted-foreground">{page.section}</div>
      <MarkdownView body={page.body} currentPath={page.path} />
      <div className="mt-12 flex justify-between border-t border-border pt-6 text-sm">
        {prev ? <Link to={prev.route} className="text-primary hover:underline">← {prev.title}</Link> : <span />}
        {next ? <Link to={next.route} className="text-primary hover:underline">{next.title} →</Link> : <span />}
      </div>
    </article>
  );
}
```

- [ ] **Step 5: `DocsApp.tsx`** — shell: header, sidebar, content by splat.

```tsx
import { useLocation, Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import DocsSidebar from "./DocsSidebar";
import DocsSearch from "./DocsSearch";
import DocsHome from "./DocsHome";
import DocsPage from "./DocsPage";

export default function DocsApp() {
  const { pathname } = useLocation();
  const isHome = pathname === "/docs" || pathname === "/docs/";
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur" style={{ paddingTop: "var(--gw-safe-top)" }}>
        <div className="container flex h-16 items-center justify-between gap-4 px-4">
          <Link to="/docs" className="flex items-center gap-2 font-bold">
            <BookOpen className="h-5 w-5 text-primary" /> GleeWorld Help
          </Link>
          <div className="hidden w-full max-w-sm md:block"><DocsSearch /></div>
          <a href="/" className="whitespace-nowrap text-sm text-muted-foreground hover:text-primary">← GleeWorld</a>
        </div>
      </header>
      <div className="container flex gap-8 px-4 py-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <ScrollArea className="h-[calc(100vh-8rem)] pr-4"><DocsSidebar /></ScrollArea>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mb-6 md:hidden"><DocsSearch /></div>
          {isHome ? <DocsHome /> : <DocsPage route={pathname.replace(/\/$/, "")} />}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit** — `git add src/features/docs; git commit -m "feat(docs): docs layout, sidebar, search UI, home, and page views"`

---

### Task 7: Wire the route into `App.tsx`

**Files:** Modify `src/App.tsx`

**Interfaces:** Consumes `DocsApp`.

- [ ] **Step 1: Add the lazy import** near the other page lazy imports (e.g., after line 155's `DocsArchitecture`):

```tsx
const DocsApp = lazy(() => import("./features/docs/DocsApp"));
```

- [ ] **Step 2: Add a public route.** Immediately after the existing `/docs/architecture` `<Route .../>` block, add:

```tsx
<Route path="/docs/*" element={<DocsApp />} />
```

(React Router 6 ranks `/docs/architecture` above `/docs/*`, so the architecture page still wins. `/docs/*` is public — do not wrap it in an auth guard.)

- [ ] **Step 3: Typecheck.** Run: `bunx tsc -p tsconfig.app.json --noEmit` → expect no new errors in `src/features/docs` or `src/App.tsx`.

- [ ] **Step 4: Commit** — `git add src/App.tsx; git commit -m "feat(docs): mount /docs manual route (public)"`

---

### Task 8: Verify build + render smoke

**Files:** none (verification).

- [ ] **Step 1: Full unit suite for docs**

Run: `bunx vitest run src/features/docs`
Expected: all content/search tests PASS.

- [ ] **Step 2: Production build**

Run: `bun run build`
Expected: build succeeds; a docs chunk is emitted. Confirm manual content bundled:
Run: `grep -rl "Run your music program" dist/assets/*.js | head` (or any known manual phrase) → at least one hit, proving pages were bundled.

- [ ] **Step 3: Render smoke via preview**

Run: `bun run preview --port 4173 &` then load `http://localhost:4173/docs` and `http://localhost:4173/docs/tenants/program-setup` in the browser tool. Verify: home shows section cards; a page renders formatted markdown; sidebar highlights the active page; search returns results; an internal `See also` link navigates client-side. Capture a screenshot.

- [ ] **Step 4: Report** — summarize what rendered, any `[VERIFY]`-driven content gaps, and how to deploy (build locally + rsync `dist/`, matching the existing GleeWorld web deploy). This closes Phase B for user review before deploying.

---

## Self-Review

**Spec coverage:** native `/docs` route → Tasks 6–7 · build-time bundling of `docs/manual` → Task 3 (`import.meta.glob`) · client-side search → Task 4 + `DocsSearch` · branding/theme match → shadcn primitives + tokens + `prose` in Tasks 5–6 · preserves `/docs/architecture` → Task 7 · public access → Task 7. Phase A content is read-only here.

**Placeholder scan:** No TBDs; every component and helper has complete code. Verification commands are concrete with expected output.

**Type consistency:** `DocPage`/`NavSection` defined in `registry.ts` and consumed unchanged by `search.ts`, `DocsPage`, `DocsHome`, `DocsSidebar`. `resolveDocLink`'s `{internal}|{external}` union is produced in `content.ts` and consumed identically in `MarkdownView`. `pageByRoute`/`docPages`/`docNav` names match across producer and consumers.
