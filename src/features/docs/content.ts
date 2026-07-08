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
