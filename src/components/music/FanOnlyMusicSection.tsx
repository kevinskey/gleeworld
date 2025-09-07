import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Music, Heart, Users, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FanOnlyMusicSectionProps {
  children: React.ReactNode;
  albumCount?: number;
}

export const FanOnlyMusicSection: React.FC<FanOnlyMusicSectionProps> = ({ 
  children, 
  albumCount = 0 
}) => {
  const { user } = useAuth();
  const { isFan, isAdmin, isSuperAdmin, isMember } = useUserRole();

  // Allow access for fans, members, admins, and super admins
  const hasAccess = user && (isFan() || isMember() || isAdmin() || isSuperAdmin());

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show invitation to become a fan
  return (
    <section className="relative z-30 py-[27.5px] sm:py-16 md:py-20 px-4 sm:px-4 md:px-6 lg:px-8 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-4">
            <Music className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-secondary animate-pulse" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground font-['Bebas_Neue']">
              Our Music
            </h2>
            <Music className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
            Exclusive music collection available to our fan community
          </p>
        </div>

        <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all duration-300">
          <CardContent className="p-6 sm:p-8 md:p-12 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Lock Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <Lock className="h-16 w-16 sm:h-20 sm:w-20 text-primary/60" />
                  <Heart className="h-6 w-6 text-secondary absolute -top-1 -right-1 animate-pulse" />
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Become a Fan to Access Our Music
                </h3>
                <p className="text-muted-foreground text-base sm:text-lg">
                  Join thousands of fans with exclusive access to our complete album collection, 
                  behind-the-scenes content, and more.
                </p>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap justify-center gap-4 sm:gap-8 py-4">
                {albumCount > 0 && (
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-primary">{albumCount}</div>
                    <div className="text-sm text-muted-foreground">Albums</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-secondary">100+</div>
                  <div className="text-sm text-muted-foreground">Songs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-accent">1000+</div>
                  <div className="text-sm text-muted-foreground">Fans</div>
                </div>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="flex items-start space-x-3">
                  <Music className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm">Full Album Access</div>
                    <div className="text-xs text-muted-foreground">Complete discography</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm">Exclusive Content</div>
                    <div className="text-xs text-muted-foreground">Behind-the-scenes videos</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Heart className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm">Fan Community</div>
                    <div className="text-xs text-muted-foreground">Connect with other fans</div>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button asChild size="lg" className="text-white bg-primary hover:bg-primary/90">
                  <Link to="/auth?mode=signup&role=fan">
                    <Heart className="mr-2 h-5 w-5" />
                    Become a Fan - Free
                  </Link>
                </Button>
                
                {user ? (
                  <Button asChild variant="outline" size="lg">
                    <Link to="/dashboard/fan">
                      Go to Fan Dashboard
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="lg">
                    <Link to="/auth?mode=signin">
                      Already a Fan? Sign In
                    </Link>
                  </Button>
                )}
              </div>

              {/* Trust signals */}
              <p className="text-xs text-muted-foreground mt-4">
                Join for free • No spam • Cancel anytime • 100+ years of musical excellence
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};