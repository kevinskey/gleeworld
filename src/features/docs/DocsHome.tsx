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
