import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, Users, Award, ArrowRight } from 'lucide-react';

interface OnboardingHeroProps {
  onGetStarted: () => void;
}

export const OnboardingHero = ({ onGetStarted }: OnboardingHeroProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardContent className="p-8 md:p-12">
          <div className="text-center space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Music className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Welcome to GleeWorld
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join 100+ years of musical excellence at the Spelman College Glee Club. 
                Let's complete your profile to get you started on this incredible journey.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 my-12">
              <div className="text-center space-y-3">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <Music className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Musical Excellence</h3>
                <p className="text-sm text-muted-foreground">
                  Access exclusive sheet music, recordings, and practice materials
                </p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <Users className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="font-semibold text-lg">Sisterhood</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with current members, alumnae, and build lifelong friendships
                </p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <Award className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-semibold text-lg">Legacy</h3>
                <p className="text-sm text-muted-foreground">
                  Become part of a century-old tradition of "Amazing and Inspiring"
                </p>
              </div>
            </div>

            {/* Call to Action */}
            <div className="space-y-6">
              <div className="bg-muted/30 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">What's Next?</h3>
                <div className="text-sm text-muted-foreground space-y-2 max-w-2xl mx-auto">
                  <p>• Complete your personal profile and contact information</p>
                  <p>• Upload uniform measurements and photos for our records</p>
                  <p>• Review and sign important agreements and waivers</p>
                  <p>• Finalize your membership and join the sisterhood</p>
                </div>
              </div>

              <Button 
                onClick={onGetStarted} 
                size="lg" 
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-8 py-6 text-lg font-semibold"
              >
                Begin Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <p className="text-xs text-muted-foreground">
                This should take about 5-10 minutes to complete
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};