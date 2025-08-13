import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useToast } from '@/hooks/use-toast';
import { Music, Clock, User, Mail, Phone, GraduationCap } from 'lucide-react';
import { fromZonedTime } from 'date-fns-tz';

export default function AuditionApplicationPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    student_id: '',
    academic_year: '',
    major: '',
    minor: '',
    gpa: '',
    voice_part_preference: '',
    years_of_vocal_training: 0,
    previous_choir_experience: '',
    sight_reading_level: '',
    instruments_played: [] as string[],
    music_theory_background: '',
    why_glee_club: '',
    vocal_goals: '',
    availability_conflicts: '',
    prepared_pieces: '',
    notes: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to auth if not logged in
      window.location.href = '/auth';
      return;
    }

    if (user) {
      // Pre-fill with user data
      setFormData(prev => ({
        ...prev,
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone_number: user.user_metadata?.phone || ''
      }));

      // Check for saved time slot
      const savedTimeSlot = localStorage.getItem('selectedAuditionTimeSlot');
      if (savedTimeSlot) {
        try {
          const timeSlotData = JSON.parse(savedTimeSlot);
          setSelectedTimeSlot(timeSlotData);
        } catch (error) {
          console.error('Error parsing saved time slot:', error);
        }
      }
    }
  }, [user, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let auditionTimeSlot = null;

      // If there's a selected time slot, convert it to the proper format
      if (selectedTimeSlot) {
        const easternTimeZone = 'America/New_York';
        const [hours, minutes] = selectedTimeSlot.time.split(':');
        const selectedDate = new Date(selectedTimeSlot.date);
        const easternDateTime = new Date(selectedDate);
        easternDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Convert Eastern Time to UTC for storage
        const utcDateTime = fromZonedTime(easternDateTime, easternTimeZone);
        auditionTimeSlot = utcDateTime.toISOString();
      }

      // Check if user already has an application
      const { data: existingApp, error: checkError } = await supabase
        .from('audition_applications')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      const applicationData = {
        ...formData,
        user_id: user?.id,
        audition_time_slot: auditionTimeSlot,
        session_id: '00000000-0000-0000-0000-000000000000', // Default session
        status: 'submitted',
        application_date: new Date().toISOString(),
        gpa: formData.gpa ? parseFloat(formData.gpa) : null,
        years_of_vocal_training: parseInt(formData.years_of_vocal_training.toString()) || 0
      };

      if (existingApp) {
        // Update existing application
        const { error } = await supabase
          .from('audition_applications')
          .update(applicationData)
          .eq('id', existingApp.id);

        if (error) throw error;

        toast({
          title: "Application Updated!",
          description: selectedTimeSlot 
            ? `Your audition application has been updated with your selected time: ${selectedTimeSlot.displayDate} at ${selectedTimeSlot.displayTime} EST`
            : "Your audition application has been updated successfully.",
        });
      } else {
        // Create new application
        const { error } = await supabase
          .from('audition_applications')
          .insert(applicationData);

        if (error) throw error;

        toast({
          title: "Application Submitted!",
          description: selectedTimeSlot 
            ? `Your audition is scheduled for ${selectedTimeSlot.displayDate} at ${selectedTimeSlot.displayTime} EST`
            : "Your audition application has been submitted successfully.",
        });
      }

      // Clean up localStorage
      localStorage.removeItem('selectedAuditionTimeSlot');

      // Redirect to success page or home
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Music className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-8">
        <div className="max-w-4xl mx-auto px-4">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
              <Music className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Audition Application
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Complete your application for the Spelman College Glee Club
            </p>
            {selectedTimeSlot && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg inline-block">
                <div className="flex items-center text-primary">
                  <Clock className="h-5 w-5 mr-2" />
                  <span className="font-medium">
                    Selected Time: {selectedTimeSlot.displayDate} at {selectedTimeSlot.displayTime} EST
                  </span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Full Name *</label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Phone Number *</label>
                  <Input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Date of Birth</label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Academic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GraduationCap className="h-5 w-5 mr-2" />
                  Academic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Student ID</label>
                  <Input
                    value={formData.student_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Academic Year *</label>
                  <Select
                    value={formData.academic_year}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, academic_year: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freshman">Freshman</SelectItem>
                      <SelectItem value="sophomore">Sophomore</SelectItem>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="graduate">Graduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Major</label>
                  <Input
                    value={formData.major}
                    onChange={(e) => setFormData(prev => ({ ...prev, major: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Minor</label>
                  <Input
                    value={formData.minor}
                    onChange={(e) => setFormData(prev => ({ ...prev, minor: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">GPA</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.0"
                    value={formData.gpa}
                    onChange={(e) => setFormData(prev => ({ ...prev, gpa: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Musical Background */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Music className="h-5 w-5 mr-2" />
                  Musical Background
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Voice Part Preference</label>
                    <Select
                      value={formData.voice_part_preference}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, voice_part_preference: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select voice part" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soprano">Soprano</SelectItem>
                        <SelectItem value="alto">Alto</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Years of Vocal Training</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.years_of_vocal_training}
                      onChange={(e) => setFormData(prev => ({ ...prev, years_of_vocal_training: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sight Reading Level</label>
                    <Select
                      value={formData.sight_reading_level}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, sight_reading_level: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Previous Choir Experience</label>
                  <Textarea
                    value={formData.previous_choir_experience}
                    onChange={(e) => setFormData(prev => ({ ...prev, previous_choir_experience: e.target.value }))}
                    placeholder="Describe your previous choir or ensemble experience..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Why do you want to join the Glee Club?</label>
                  <Textarea
                    value={formData.why_glee_club}
                    onChange={(e) => setFormData(prev => ({ ...prev, why_glee_club: e.target.value }))}
                    placeholder="Tell us what motivates you to join..."
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.href = '/'}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-32"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}