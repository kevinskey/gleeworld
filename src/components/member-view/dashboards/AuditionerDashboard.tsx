import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, FileText, ArrowRight } from "lucide-react";
import { AuditionDocuments } from "@/components/audition/AuditionDocuments";

interface AuditionerDashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
}

export const AuditionerDashboard = ({ user }: AuditionerDashboardProps) => {
  const firstName = (user?.full_name || "").split(" ")[0] || "Welcome";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="container mx-auto px-4 pt-8 pb-6 sm:pt-12 sm:pb-8">
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur shadow-sm p-5 sm:p-8 animate-fade-in">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
              <Mic className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                Auditions: Join the Spelman College Glee Club
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                {`Hi ${firstName !== "" ? firstName : "there"}!`} Explore the required music and start or continue your application. One page. Clear steps. "To Amaze and Inspire."
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/auditions" aria-label="Start or manage your audition application">
                    Start/Manage Application
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/about" aria-label="Learn more about the Glee Club and auditions">
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-12 space-y-6">
        {/* PDF Viewer Section */}
        <section aria-labelledby="required-piece" className="animate-fade-in">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 id="required-piece" className="text-lg sm:text-xl font-semibold">
                  Required Piece: Come Thou Fount — Audition Edition
                </h2>
              </div>
              <AuditionDocuments />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};
