import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { UniversalFooter } from '@/components/layout/UniversalFooter';
import { Heart, Users, FileText, Clock, Shield, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const OnboardingInfo = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UniversalHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur px-4 py-2 text-sm font-medium">
            <Heart className="h-4 w-4 text-primary" />
            Welcome to the Family
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Your Onboarding Journey
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We're absolutely thrilled that you've decided to join the Spelman College Glee Club family! 
            Here's everything you need to know about getting started.
          </p>
        </div>

        {/* What is Onboarding Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              What is the Onboarding Process?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The onboarding process is your gateway to becoming a full member of our incredible musical community. 
              It's designed to help us get to know you better, understand your musical background, and ensure you 
              have everything you need to thrive in the Glee Club.
            </p>
            <p className="text-muted-foreground">
              This process helps us place you in the right voice section, connect you with mentors, and provide 
              you with all the resources and information you'll need for your journey with us.
            </p>
          </CardContent>
        </Card>

        {/* How It Works Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              How Does It Work?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">Step 1: Personal Information</h4>
                <p className="text-sm text-muted-foreground">
                  Complete your basic profile with contact information and personal details.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">Step 2: Musical Background</h4>
                <p className="text-sm text-muted-foreground">
                  Share your musical experience, training, and voice part preferences.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">Step 3: Academic Information</h4>
                <p className="text-sm text-muted-foreground">
                  Provide your academic details and class schedule for planning purposes.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">Step 4: Commitment & Goals</h4>
                <p className="text-sm text-muted-foreground">
                  Tell us about your goals and commitment level with the Glee Club.
                </p>
              </div>
            </div>
            <Separator />
            <div className="bg-primary/5 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Estimated Time:</strong> The entire process takes about 15-20 minutes to complete. 
                You can save your progress and return to finish it later if needed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What We Collect Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-semibold">Personal Details</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Full name and pronouns</li>
                  <li>• Contact information</li>
                  <li>• Emergency contacts</li>
                  <li>• Dietary restrictions</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Musical Background</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Voice part and range</li>
                  <li>• Previous choir experience</li>
                  <li>• Musical training</li>
                  <li>• Performance experience</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Academic Information</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Class year and major</li>
                  <li>• Course schedule</li>
                  <li>• Availability preferences</li>
                  <li>• Study abroad plans</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Your Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your information is completely secure and will only be used by Glee Club leadership for:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Voice part placement and section assignments</li>
              <li>• Emergency contact and safety purposes</li>
              <li>• Scheduling rehearsals and performances</li>
              <li>• Connecting you with mentors and section leaders</li>
              <li>• Planning tours and travel arrangements</li>
            </ul>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>We never share your personal information</strong> with third parties without your explicit consent.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Welcome Message */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Users className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-2xl font-bold">Welcome to 100+ Years of Excellence!</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                You're not just joining a choir – you're becoming part of a legacy that spans over a century. 
                The Spelman College Glee Club has been inspiring audiences and transforming lives since 1915. 
                We're honored that you've chosen to add your voice to our story.
              </p>
              <p className="text-lg font-medium text-primary">
                "To Amaze and Inspire" – our motto that guides everything we do.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold">Ready to Begin?</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We can't wait to learn more about you and welcome you officially into the Glee Club family. 
            Click below to start your onboarding journey!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90" asChild>
              <Link to="/onboarding">Start Onboarding</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/dashboard">Return to Dashboard</Link>
            </Button>
          </div>
        </div>
      </main>

      <UniversalFooter />
    </div>
  );
};

export default OnboardingInfo;