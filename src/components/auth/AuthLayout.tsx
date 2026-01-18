import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import gleeWorldLogoCircle from "@/assets/glee-world-logo-circle.png";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  theme?: "default" | "mus240";
}

export const AuthLayout = ({ children, title, subtitle, theme = "default" }: AuthLayoutProps) => {
  const navigate = useNavigate();

  // Different backgrounds and styling based on theme
  const themeConfig = {
    default: {
      background: "linear-gradient(180deg, #0056a6 0%, #0073c9 40%, #55bbee 100%)",
      overlay: "bg-black/10",
      cardBg: "bg-white/15 backdrop-blur-xl",
      homeRoute: "/",
    },
    mus240: {
      background:
        "linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #8b2c3d 100%)",
      overlay: "bg-gradient-to-br from-purple-900/20 via-blue-900/30 to-indigo-900/40",
      cardBg: "bg-gradient-to-br from-white/90 via-white/95 to-white/90",
      homeRoute: "/classes/mus240",
    },
  };

  const config = themeConfig[theme];

  return (
    <div
      className="min-h-screen w-full flex items-start md:items-center justify-center p-4 pt-16 md:pt-4 relative bg-cover bg-no-repeat bg-center md:bg-left-center"
      style={{
        background: config.background.startsWith("linear-gradient") ? config.background : `url(${config.background})`,
      }}
    >
      <div className={`absolute inset-0 ${config.overlay}`} />

      {/* Back to Home Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(config.homeRoute)}
        className="absolute top-4 left-4 z-20 text-white hover:bg-white/20 border border-white/30"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {theme === "mus240" ? "Back to Course" : "Back to Home"}
      </Button>
      <div className={`w-full max-w-md relative z-10 ${config.cardBg} border border-white/20 shadow-2xl overflow-hidden rounded-lg`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/3 to-transparent pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="text-center space-y-4 relative z-10 p-6">
          <div className="flex justify-center">
            <img
              src={gleeWorldLogoCircle}
              alt="GleeWorld.org logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className={`text-2xl font-bold drop-shadow-sm ${theme === "default" ? "text-white" : "text-foreground"}`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`drop-shadow-sm ${theme === "default" ? "text-white/80" : "text-muted-foreground"}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`relative z-10 p-6 pt-0 ${theme === "default" ? "text-white" : "text-foreground"}`}>{children}</div>
      </div>
    </div>
  );
};
