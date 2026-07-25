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
          <ScrollArea className="h-[calc(100dvh-8rem)] pr-4"><DocsSidebar /></ScrollArea>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mb-6 md:hidden"><DocsSearch /></div>
          {isHome ? <DocsHome /> : <DocsPage route={pathname.replace(/\/$/, "")} />}
        </main>
      </div>
    </div>
  );
}
