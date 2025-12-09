import { useState, useEffect } from "react";
import { Music, Music2, Music3, Music4 } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const musicNotes = [Music, Music2, Music3, Music4];

interface FloatingNote {
  id: number;
  Icon: typeof Music;
  angle: number;
  delay: number;
  size: number;
}

export const SplashScreen = ({ onComplete, duration = 3500 }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [notes, setNotes] = useState<FloatingNote[]>([]);

  // Generate floating notes periodically
  useEffect(() => {
    let noteId = 0;
    const interval = setInterval(() => {
      const newNote: FloatingNote = {
        id: noteId++,
        Icon: musicNotes[Math.floor(Math.random() * musicNotes.length)],
        angle: Math.random() * 360,
        delay: Math.random() * 0.3,
        size: 16 + Math.random() * 12,
      };
      setNotes(prev => [...prev.slice(-15), newNote]); // Keep max 15 notes
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Handle fade out and completion
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 800);

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 transition-opacity duration-700 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Starfield background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animationDelay: Math.random() * 2 + "s",
              animationDuration: 2 + Math.random() * 2 + "s",
              opacity: 0.3 + Math.random() * 0.7,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center">
        {/* Spinning Globe Container */}
        <div className="relative w-48 h-48 md:w-64 md:h-64">
          {/* Outer glow rings */}
          <div className="absolute inset-0 rounded-full animate-spin-slow opacity-30"
            style={{
              background: "conic-gradient(from 0deg, transparent, hsl(200 80% 60%), transparent, hsl(200 80% 60%), transparent)",
              animationDuration: "8s",
            }}
          />
          
          {/* Globe glow effect */}
          <div className="absolute inset-4 rounded-full blur-xl bg-blue-500/40 animate-pulse" />
          
          {/* Main globe */}
          <div 
            className="absolute inset-6 rounded-full overflow-hidden animate-spin-slow"
            style={{
              background: "radial-gradient(circle at 30% 30%, hsl(200 90% 70%), hsl(210 80% 50%) 40%, hsl(220 70% 30%) 80%, hsl(230 60% 15%))",
              boxShadow: `
                0 0 60px hsl(200 80% 50% / 0.6),
                0 0 100px hsl(200 80% 50% / 0.4),
                0 0 140px hsl(200 80% 50% / 0.2),
                inset -20px -20px 60px hsl(220 70% 20% / 0.8),
                inset 10px 10px 40px hsl(200 90% 80% / 0.3)
              `,
              animationDuration: "6s",
            }}
          >
            {/* Globe surface details - latitude lines */}
            {[...Array(5)].map((_, i) => (
              <div
                key={`lat-${i}`}
                className="absolute w-full border-t border-blue-300/20"
                style={{ top: `${20 + i * 15}%` }}
              />
            ))}
            
            {/* Globe surface details - longitude lines */}
            <div className="absolute inset-0 animate-spin-reverse" style={{ animationDuration: "12s" }}>
              {[...Array(6)].map((_, i) => (
                <div
                  key={`lon-${i}`}
                  className="absolute h-full w-0 border-l border-blue-300/15 left-1/2"
                  style={{ transform: `rotate(${i * 30}deg)` }}
                />
              ))}
            </div>
            
            {/* Continent-like shapes */}
            <div className="absolute top-1/4 left-1/4 w-1/3 h-1/4 rounded-full bg-blue-400/20 blur-sm" />
            <div className="absolute bottom-1/3 right-1/4 w-1/4 h-1/5 rounded-full bg-blue-400/20 blur-sm" />
          </div>

          {/* Floating music notes */}
          {notes.map((note) => {
            const radians = (note.angle * Math.PI) / 180;
            const startX = Math.cos(radians) * 60;
            const startY = Math.sin(radians) * 60;
            
            return (
              <div
                key={note.id}
                className="absolute left-1/2 top-1/2 animate-note-float pointer-events-none"
                style={{
                  "--start-x": `${startX}px`,
                  "--start-y": `${startY}px`,
                  "--end-x": `${startX * 3}px`,
                  "--end-y": `${startY * 3 - 50}px`,
                  animationDelay: `${note.delay}s`,
                } as React.CSSProperties}
              >
                <note.Icon
                  size={note.size}
                  className="text-yellow-300 drop-shadow-[0_0_8px_hsl(50_100%_60%)]"
                  style={{
                    filter: "drop-shadow(0 0 6px hsl(50 100% 70%))",
                  }}
                />
              </div>
            );
          })}

          {/* Sparkle particles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
              className="absolute w-2 h-2 rounded-full bg-yellow-200 animate-sparkle"
              style={{
                left: "50%",
                top: "50%",
                animationDelay: `${i * 0.3}s`,
                "--sparkle-angle": `${i * 45}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Title */}
        <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 drop-shadow-lg">
            GleeWorld
          </h1>
          <p className="mt-2 text-blue-200/80 text-sm md:text-base tracking-widest uppercase">
            To Amaze & Inspire
          </p>
        </div>

        {/* Loading dots */}
        <div className="mt-6 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
