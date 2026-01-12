import { Music, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SightReadingStudioCard = () => {
  const handleVisitStudio = () => {
    window.open("https://readmusic.gleeworld.org", "_blank");
  };

  return (
    <div className="bg-gradient-to-r from-[#003666] via-[#1a5a8a] to-[#2a7ab0] rounded-xl overflow-hidden shadow-lg">
      <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full shrink-0">
            <Music className="h-8 w-8 text-white" />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold text-white">
              Sight Reading Studio
            </h3>
            <p className="text-white/80 text-sm">
              Improve your sight-reading skills with our interactive studio
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleVisitStudio}
          className="bg-white text-[#003666] hover:bg-white/90 font-semibold px-6 py-3 flex items-center gap-2 shrink-0"
        >
          <span>Visit Studio</span>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
