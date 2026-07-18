import { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { UniversalFooter } from "./UniversalFooter";
import { DemoBackToGleeWorldBanner } from "@/components/demo/DemoBackToGleeWorldBanner";

interface PublicLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
}

export const PublicLayout = ({
  children,
  showHeader = true,
  showFooter = true,
  className = ""
}: PublicLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-[hsl(40,10%,96%)]">
      {/* No-op on every tenant except the 5 showcase demo tenants. */}
      <DemoBackToGleeWorldBanner />
      {showHeader && <PublicHeader />}
      <main className={`flex-1 ${className}`}>
        {children}
      </main>
      {showFooter && <UniversalFooter />}
    </div>
  );
};
