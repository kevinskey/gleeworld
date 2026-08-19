import { describe, it, expect } from "vitest";
import { sanitizeNextPath, isPlaceholderName } from "./WelcomeRegistration";

describe("sanitizeNextPath", () => {
  it("defaults to /academy when missing", () => {
    expect(sanitizeNextPath(null)).toBe("/academy");
    expect(sanitizeNextPath("")).toBe("/academy");
  });

  it("keeps in-app paths", () => {
    expect(sanitizeNextPath("/academy/c/mus070")).toBe("/academy/c/mus070");
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard");
  });

  it("rejects off-site and protocol-relative targets", () => {
    expect(sanitizeNextPath("https://evil.example")).toBe("/academy");
    expect(sanitizeNextPath("//evil.example")).toBe("/academy");
    expect(sanitizeNextPath("javascript:alert(1)")).toBe("/academy");
  });
});

describe("isPlaceholderName", () => {
  it("treats the trigger's email-derived name as a placeholder", () => {
    // handle_new_user_profile: "jane.doe@x.org" → "Jane Doe"
    expect(isPlaceholderName("Jane Doe", "jane.doe@x.org")).toBe(true);
    expect(isPlaceholderName("Kevinskey", "kevinskey@icloud.com")).toBe(true);
  });

  it("keeps a real name from the invite", () => {
    expect(isPlaceholderName("Kevin Phillip Johnson", "kevinskey@icloud.com")).toBe(false);
    expect(isPlaceholderName("Jane Smith", "jane.doe@x.org")).toBe(false);
  });

  it("treats missing names as placeholders", () => {
    expect(isPlaceholderName(null, "a@b.c")).toBe(true);
    expect(isPlaceholderName("", "a@b.c")).toBe(true);
  });
});
