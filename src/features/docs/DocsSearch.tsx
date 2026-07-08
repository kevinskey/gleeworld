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
