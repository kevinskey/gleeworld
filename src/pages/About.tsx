
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-4xl font-bold text-center">About Spelman Glee Club</h1>
          <div className="prose prose-lg mx-auto">
            <p>
              The Spelman College Glee Club has been a cornerstone of musical excellence for over 100 years, 
              inspiring audiences and nurturing the talents of countless young women.
            </p>
            <p>
              Our motto: "To Amaze and Inspire" - reflecting our commitment to musical excellence and 
              cultural uplift through the power of song.
            </p>
          </div>
          <div className="text-center">
            <Button asChild>
              <Link to="/join">Join Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
