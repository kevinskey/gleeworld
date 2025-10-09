import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const GrandStaffClassroom = () => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  useEffect(() => {
    document.title = 'Grand Staff Classroom | GleeWorld Academy';
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Grand staff component
  const GrandStaff = () => (
    <svg viewBox="0 0 800 200" className="w-full h-auto">
      {/* Treble Clef Staff */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={`treble-${i}`}
          x1="0"
          y1={20 + i * 15}
          x2="800"
          y2={20 + i * 15}
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}
      
      {/* Bass Clef Staff */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={`bass-${i}`}
          x1="0"
          y1={120 + i * 15}
          x2="800"
          y2={120 + i * 15}
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}

      {/* Treble Clef Symbol (simplified) */}
      <text x="10" y="65" fontSize="80" fontFamily="serif" fill="currentColor">
        &amp;
      </text>

      {/* Bass Clef Symbol (simplified) */}
      <text x="10" y="165" fontSize="60" fontFamily="serif" fill="currentColor">
        ?
      </text>

      {/* Bar line at start */}
      <line x1="80" y1="20" x2="80" y2="80" stroke="currentColor" strokeWidth="3" />
      <line x1="80" y1="120" x2="80" y2="180" stroke="currentColor" strokeWidth="3" />

      {/* Connecting line between staves */}
      <line x1="80" y1="20" x2="80" y2="180" stroke="currentColor" strokeWidth="2" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <Link to="/music-theory-fundamentals">
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Fundamentals
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={toggleFullscreen} className="w-full sm:w-auto">
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 mr-2" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 mr-2" />
                Fullscreen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content - Grand Staves */}
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-4 sm:mb-8">
          Grand Staff Practice
        </h1>

        {/* Multiple Grand Staves for classroom use */}
        <div className="space-y-8 sm:space-y-16">
          <div className="bg-card rounded-lg p-3 sm:p-6 shadow-sm">
            <GrandStaff />
          </div>
          
          <div className="bg-card rounded-lg p-3 sm:p-6 shadow-sm">
            <GrandStaff />
          </div>
          
          <div className="bg-card rounded-lg p-3 sm:p-6 shadow-sm">
            <GrandStaff />
          </div>
          
          <div className="bg-card rounded-lg p-3 sm:p-6 shadow-sm">
            <GrandStaff />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrandStaffClassroom;
