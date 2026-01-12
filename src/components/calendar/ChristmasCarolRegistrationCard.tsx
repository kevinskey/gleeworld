import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Sparkles, ArrowRight, Music, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ChristmasCarolRegistrationCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleRegisterClick = () => {
    if (user) {
      // User is logged in, could navigate to a registration form
      navigate('/events/christmas-carol-registration');
    } else {
      // Not logged in, redirect to auth with return path
      navigate('/auth?returnTo=/events/christmas-carol-registration');
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#C04040] via-[#D06060] to-[#408040] rounded-xl overflow-hidden shadow-lg border border-white/30">
      {/* Decorative top */}
      <div className="relative h-2 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300" />
      
      <div className="p-5 text-center">
        {/* Sparkle icon */}
        <div className="flex justify-center mb-3">
          <div className="bg-white/25 rounded-full p-3">
            <Sparkles className="h-7 w-7 text-yellow-200" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-lg leading-tight mb-2">
          Register for the
        </h3>
        <h2 className="text-yellow-200 font-bold text-2xl leading-tight mb-3">
          100th Christmas Carol Weekend!
        </h2>

        {/* Date */}
        <div className="flex items-center justify-center gap-2 text-white/90 text-sm mb-4">
          <Calendar className="h-4 w-4" />
          <span>December 5-7, 2026</span>
        </div>

        {/* Description */}
        <p className="text-white/85 text-sm mb-5 leading-relaxed">
          Be part of history! Join us for the centennial celebration of the beloved Spelman Morehouse Christmas Carol tradition.
        </p>

        {/* CTA Button */}
        <Button 
          onClick={handleRegisterClick}
          className="w-full bg-yellow-300 hover:bg-yellow-400 text-[#8B0000] font-bold shadow-md transition-all hover:scale-[1.02] py-5"
        >
          Register Now
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>

        {/* Small note */}
        <p className="text-white/70 text-xs mt-3 mb-4">
          {user ? "Complete your registration" : "Create an account to register"}
        </p>

        {/* Sight Reading Studio Link */}
        <a
          href="https://readmusic.gleeworld.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-white/90 hover:text-white text-sm py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          <Music className="h-4 w-4" />
          <span>Sight Reading Studio</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Decorative bottom */}
      <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
    </div>
  );
};
