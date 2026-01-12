import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Sparkles, ArrowRight } from "lucide-react";
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
    <div className="bg-gradient-to-br from-[#8B0000] via-[#A52A2A] to-[#006400] rounded-xl overflow-hidden shadow-lg border border-white/20">
      {/* Decorative top */}
      <div className="relative h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      
      <div className="p-4 text-center">
        {/* Sparkle icon */}
        <div className="flex justify-center mb-2">
          <div className="bg-white/20 rounded-full p-2">
            <Sparkles className="h-6 w-6 text-yellow-300" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-lg leading-tight mb-1">
          Register for the
        </h3>
        <h2 className="text-yellow-300 font-bold text-xl leading-tight mb-2">
          100th Christmas Carol Weekend!
        </h2>

        {/* Date */}
        <div className="flex items-center justify-center gap-2 text-white/90 text-sm mb-3">
          <Calendar className="h-4 w-4" />
          <span>December 5-7, 2026</span>
        </div>

        {/* Description */}
        <p className="text-white/80 text-xs mb-4">
          Be part of history! Join us for the centennial celebration of the beloved Spelman Morehouse Christmas Carol tradition.
        </p>

        {/* CTA Button */}
        <Button 
          onClick={handleRegisterClick}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-[#8B0000] font-bold shadow-md transition-all hover:scale-[1.02]"
        >
          Register Now
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>

        {/* Small note */}
        <p className="text-white/60 text-[10px] mt-2">
          {user ? "Complete your registration" : "Create an account to register"}
        </p>
      </div>

      {/* Decorative bottom */}
      <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
    </div>
  );
};
