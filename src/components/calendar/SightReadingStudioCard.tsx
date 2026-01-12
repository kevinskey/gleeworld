import { Music, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const SightReadingStudioCard = () => {
  const handleVisitStudio = () => {
    window.open("https://readmusic.gleeworld.org", "_blank");
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="bg-gradient-to-br from-[#003666] via-[#1a5a8a] to-[#2a7ab0] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-full">
            <Music className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">
            Sight Reading Studio
          </h3>
        </div>
        
        <p className="text-white/90 text-sm mb-5 leading-relaxed">
          Improve your sight-reading skills with our interactive studio. Practice anytime, anywhere!
        </p>
        
        <Button 
          onClick={handleVisitStudio}
          className="w-full bg-white text-[#003666] hover:bg-white/90 font-semibold py-3 flex items-center justify-center gap-2"
        >
          <span>Visit Studio</span>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
