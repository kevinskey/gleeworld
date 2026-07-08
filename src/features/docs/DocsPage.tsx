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
