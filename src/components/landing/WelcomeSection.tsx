import { Music } from "lucide-react";

export const WelcomeSection = () => {
  return (
    <section className="py-6 bg-gradient-to-r from-yellow-100/40 to-orange-100/40 border-b border-border/20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Music className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Welcome SCGC Class of 2029
            </h1>
            <Music className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Spelman College Glee Club
          </p>
        </div>
      </div>
    </section>
  );
};