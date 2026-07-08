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
