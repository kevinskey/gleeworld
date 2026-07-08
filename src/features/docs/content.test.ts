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
