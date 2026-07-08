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
