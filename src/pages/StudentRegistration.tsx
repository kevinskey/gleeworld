import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Music, Users, BookOpen } from "lucide-react";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  studentId: z.string().min(1, "Student ID (900#) is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  musicHistory: z.string().min(10, "Please tell us about your musical background (minimum 10 characters)"),
  africanAmericanMusicInterests: z.string().min(10, "Please share what you'd like to study (minimum 10 characters)"),
});

type FormData = z.infer<typeof formSchema>;

export default function StudentRegistration() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      studentId: "",
      email: "",
      phone: "",
      musicHistory: "",
      africanAmericanMusicInterests: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      // First, sign up the user without email confirmation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: `temp_${data.studentId}_${Date.now()}`, // Temporary password
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: `${data.firstName} ${data.lastName}`,
            role: 'student'
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Get the default cohort for music class
        const { data: cohort, error: cohortError } = await supabase
          .from('cohorts')
          .select('id')
          .eq('name', 'Music Class 2024')
          .eq('is_active', true)
          .single();

        if (cohortError) {
          console.error('Error fetching cohort:', cohortError);
        }

        // Create profile in gw_profiles with student role
        const { error: profileError } = await supabase
          .from('gw_profiles')
          .insert({
            user_id: authData.user.id,
            email: data.email,
            role: 'student',
            full_name: `${data.firstName} ${data.lastName}`,
            first_name: data.firstName,
            middle_name: data.middleName || null,
            last_name: data.lastName,
            verified: true
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }

        // Create student registration record
        const { error: registrationError } = await supabase
          .from('student_registrations')
          .insert({
            user_id: authData.user.id,
            first_name: data.firstName,
            middle_name: data.middleName || null,
            last_name: data.lastName,
            student_id: data.studentId,
            email: data.email,
            phone: data.phone || null,
            music_history: data.musicHistory,
            african_american_music_interests: data.africanAmericanMusicInterests,
            cohort_id: cohort?.id || null,
            status: 'registered'
          });

        if (registrationError) throw registrationError;

        toast({
          title: "Registration Successful!",
          description: "Welcome to the African American Music class. You can now explore the public resources.",
        });

        // Redirect to home page
        navigate('/');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center items-center gap-3 mb-6">
              <Music className="h-8 w-8 text-primary" />
              <BookOpen className="h-8 w-8 text-primary" />
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              African American Music Class
            </h1>
            <h2 className="text-2xl text-muted-foreground mb-4">
              Student Registration
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join our exploration of African American musical traditions, history, and culture. 
              Register to access course materials and participate in class discussions.
            </p>
          </div>

          {/* Registration Form */}
          <Card className="shadow-xl border-2">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl">Student Information</CardTitle>
              <CardDescription>
                Please provide your information to register for the course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="middleName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Middle Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your middle name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="studentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student ID (900#) *</FormLabel>
                          <FormControl>
                            <Input placeholder="900XXXXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(xxx) xxx-xxxx" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your.email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Musical Background */}
                  <FormField
                    control={form.control}
                    name="musicHistory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Musical Background *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about your musical background... Do you play any instruments? What genres do you enjoy? Do you have a favorite artist? Any formal training or experience?"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Course Interests */}
                  <FormField
                    control={form.control}
                    name="africanAmericanMusicInterests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What would you like to study in African American music? *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share what specific aspects of African American music you're interested in learning about... (e.g., spirituals, blues, jazz, hip-hop, gospel, civil rights era music, contemporary R&B, etc.)"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <div className="flex justify-center pt-6">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3 text-lg"
                      size="lg"
                    >
                      {isSubmitting ? "Registering..." : "Register for Class"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-12 text-muted-foreground">
            <p>Questions about registration? Contact your instructor for assistance.</p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}