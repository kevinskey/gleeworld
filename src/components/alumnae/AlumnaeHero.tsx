import { GraduationCap } from "lucide-react";

export const AlumnaeHero = () => {
  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900">
      {/* Metallic shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
      
      {/* Metallic texture */}
      <div className="absolute inset-0 opacity-20" 
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.1) 2px,
            rgba(255,255,255,0.1) 4px
          )`
        }}
      />
      
      <div className="container mx-auto px-6 py-16 md:py-24 relative z-10">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Icon with metallic glow */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/30 via-yellow-300/30 to-amber-400/30 blur-xl rounded-full" />
            <div className="relative bg-gradient-to-br from-amber-200 via-yellow-100 to-amber-300 p-6 rounded-full shadow-2xl">
              <GraduationCap className="h-16 w-16 md:h-20 md:w-20 text-slate-800" />
            </div>
          </div>
          
          {/* Title with metallic gradient */}
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
            Spelman College Glee Club
          </h1>
          
          {/* Subtitle with metallic effect */}
          <p className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-slate-200 via-white to-slate-200 bg-clip-text text-transparent max-w-3xl">
            Alumnae Portal
          </p>
          
          {/* Decorative metallic line */}
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent rounded-full shadow-lg" />
          
          {/* Tagline */}
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl italic">
            "To Amaze and Inspire" - Celebrating 100+ Years of Musical Excellence
          </p>
        </div>
      </div>
      
      {/* Bottom metallic border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 shadow-lg" />
    </div>
  );
};
