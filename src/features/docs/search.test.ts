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
