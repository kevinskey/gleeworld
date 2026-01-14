import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { 
  CalendarIcon, 
  Users, 
  Music, 
  Settings, 
  Plane,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const bookingFormSchema = z.object({
  // Contact Information
  organization_name: z.string().min(1, 'Organization name is required'),
  contact_person_name: z.string().min(1, 'Contact person name is required'),
  contact_title: z.string().optional(),
  contact_email: z.string().email('Invalid email format'),
  contact_phone: z.string().min(1, 'Phone number is required'),
  website: z.string().optional(),
  // Event Details
  event_name: z.string().min(1, 'Event name is required'),
  event_description: z.string().optional(),
  event_date_start: z.date({
    required_error: 'Event date is required'
  }),
  event_date_end: z.date().optional(),
  performance_time: z.string().optional(),
  performance_duration: z.enum(['15-30 min', '30-60 min', 'Full concert']),
  venue_name: z.string().min(1, 'Venue name is required'),
  venue_address: z.string().min(1, 'Venue address is required'),
  venue_type: z.enum(['Auditorium', 'Church', 'Stadium', 'Outdoor', 'Other']),
  expected_attendance: z.number().optional(),
  theme_occasion: z.string().optional(),
  // Technical & Logistical Info
  stage_dimensions: z.string().optional(),
  sound_system_available: z.boolean().default(false),
  sound_system_description: z.string().optional(),
  lighting_available: z.boolean().default(false),
  lighting_description: z.string().optional(),
  piano_available: z.boolean().default(false),
  piano_type: z.enum(['Acoustic Grand', 'Digital', 'Upright']).optional(),
  dressing_rooms_available: z.boolean().default(false),
  rehearsal_time_provided: z.string().optional(),
  load_in_soundcheck_time: z.string().optional(),
  av_capabilities: z.string().optional(),
  // Hospitality & Travel
  honorarium_offered: z.boolean().default(false),
  honorarium_amount: z.number().optional(),
  travel_expenses_covered: z.array(z.string()).default([]),
  lodging_provided: z.boolean().default(false),
  lodging_nights: z.number().optional(),
  meals_provided: z.boolean().default(false),
  dietary_restrictions: z.string().optional(),
  preferred_arrival_point: z.string().optional(),
  // Permissions & Media
  event_recorded_livestreamed: z.boolean().default(false),
  recording_description: z.string().optional(),
  photo_video_permission: z.boolean().default(false),
  promotional_assets_requested: z.array(z.string()).default([]),
  formal_contract_required: z.boolean().default(false),
  // Additional
  notes_for_director: z.string().optional(),
  notes_for_choir: z.string().optional(),
  how_heard_about_us: z.string().optional()
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

const STEPS = [
  { id: 1, title: 'Contact', icon: Users, description: 'Your information' },
  { id: 2, title: 'Event', icon: Music, description: 'Event details' },
  { id: 3, title: 'Technical', icon: Settings, description: 'Venue & logistics' },
  { id: 4, title: 'Hospitality', icon: Plane, description: 'Travel & compensation' },
  { id: 5, title: 'Review', icon: Check, description: 'Confirm & submit' },
];

export const BookingFormWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      sound_system_available: false,
      lighting_available: false,
      piano_available: false,
      dressing_rooms_available: false,
      honorarium_offered: false,
      lodging_provided: false,
      meals_provided: false,
      event_recorded_livestreamed: false,
      photo_video_permission: false,
      formal_contract_required: false,
      travel_expenses_covered: [],
      promotional_assets_requested: []
    }
  });

  const watchSoundSystem = form.watch('sound_system_available');
  const watchLighting = form.watch('lighting_available');
  const watchPiano = form.watch('piano_available');
  const watchHonorarium = form.watch('honorarium_offered');
  const watchLodging = form.watch('lodging_provided');
  const watchMeals = form.watch('meals_provided');
  const watchRecording = form.watch('event_recorded_livestreamed');

  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof BookingFormData)[] = [];
    
    switch (step) {
      case 1:
        fieldsToValidate = ['organization_name', 'contact_person_name', 'contact_email', 'contact_phone'];
        break;
      case 2:
        fieldsToValidate = ['event_name', 'event_date_start', 'performance_duration', 'venue_name', 'venue_address', 'venue_type'];
        break;
      case 3:
      case 4:
        return true; // Optional fields
      case 5:
        return true;
    }

    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else if (!isValid) {
      toast({
        title: 'Please complete required fields',
        description: 'Some required information is missing. Please check the highlighted fields.',
        variant: 'destructive'
      });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        organization_name: data.organization_name,
        contact_person_name: data.contact_person_name,
        contact_title: data.contact_title,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        website: data.website,
        event_name: data.event_name,
        event_description: data.event_description,
        event_date_start: data.event_date_start.toISOString().split('T')[0],
        event_date_end: data.event_date_end ? data.event_date_end.toISOString().split('T')[0] : null,
        performance_time: data.performance_time,
        performance_duration: data.performance_duration,
        venue_name: data.venue_name,
        venue_address: data.venue_address,
        venue_type: data.venue_type,
        expected_attendance: data.expected_attendance,
        theme_occasion: data.theme_occasion,
        stage_dimensions: data.stage_dimensions,
        sound_system_available: data.sound_system_available,
        sound_system_description: data.sound_system_description,
        lighting_available: data.lighting_available,
        lighting_description: data.lighting_description,
        piano_available: data.piano_available,
        piano_type: data.piano_type,
        dressing_rooms_available: data.dressing_rooms_available,
        rehearsal_time_provided: data.rehearsal_time_provided ? new Date(data.rehearsal_time_provided).toISOString() : null,
        load_in_soundcheck_time: data.load_in_soundcheck_time,
        av_capabilities: data.av_capabilities,
        honorarium_offered: data.honorarium_offered,
        honorarium_amount: data.honorarium_amount,
        travel_expenses_covered: data.travel_expenses_covered,
        lodging_provided: data.lodging_provided,
        lodging_nights: data.lodging_nights,
        meals_provided: data.meals_provided,
        dietary_restrictions: data.dietary_restrictions,
        preferred_arrival_point: data.preferred_arrival_point,
        event_recorded_livestreamed: data.event_recorded_livestreamed,
        recording_description: data.recording_description,
        photo_video_permission: data.photo_video_permission,
        promotional_assets_requested: data.promotional_assets_requested,
        formal_contract_required: data.formal_contract_required,
        notes_for_director: data.notes_for_director,
        notes_for_choir: data.notes_for_choir,
        how_heard_about_us: data.how_heard_about_us
      };

      const { error } = await supabase.from('gw_booking_requests').insert([payload]);
      if (error) throw error;

      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            organization_name: data.organization_name,
            contact_person_name: data.contact_person_name,
            contact_email: data.contact_email,
            contact_phone: data.contact_phone || '',
            event_name: data.event_name,
            event_date: data.event_date_start.toLocaleDateString(),
            venue_name: data.venue_name,
            honorarium_amount: data.honorarium_amount,
          }
        });
      } catch (notificationError) {
        console.error('Failed to send booking notification:', notificationError);
      }

      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting booking request:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Please try again or contact us directly.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = (currentStep / STEPS.length) * 100;

  // Success screen after submission
  if (isSubmitted) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-muted/30 to-background py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-lg bg-card">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Booking Request Submitted!
              </h1>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Thank you for your interest in the Spelman College Glee Club! We have received your booking request and will review it shortly.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                A confirmation email will be sent to you, and our team will reach out within 3-5 business days.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                >
                  Return to Home
                </Button>
                <Button
                  onClick={() => {
                    setIsSubmitted(false);
                    setCurrentStep(1);
                    form.reset();
                  }}
                >
                  Submit Another Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-muted/30 to-background py-4 md:py-8 px-4 relative">
      {/* Subtle gradient fade at the bottom */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Book Our Performance
          </h1>
          <p className="text-base md:text-lg text-foreground/80">
            Spelman College Glee Club
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-6 md:mb-8">
          <Progress value={progressPercent} className="h-2 mb-4" />
          <div className="flex justify-between">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <button
                  key={step.id}
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all",
                    isActive && "text-primary",
                    isCompleted && "text-primary cursor-pointer",
                    !isActive && !isCompleted && "text-foreground/40"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isCompleted && "border-primary bg-primary/10 text-primary",
                    !isActive && !isCompleted && "border-foreground/30"
                  )}>
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className="text-xs md:text-sm font-medium hidden sm:block">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="border-0 shadow-lg bg-card">
              <CardContent className="p-5 md:p-8 lg:p-10">
                {/* Step 1: Contact Information */}
                {currentStep === 1 && (
                  <div className="space-y-5 md:space-y-6">
                    <div className="mb-4">
                      <h2 className="text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Contact Information
                      </h2>
                      <p className="text-sm md:text-base text-foreground/70 mt-1">
                        Tell us about your organization and how to reach you
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="organization_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm md:text-base text-foreground">Organization Name *</FormLabel>
                          <FormControl>
                            <Input className="text-base md:text-lg" placeholder="Your Organization" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      <FormField
                        control={form.control}
                        name="contact_person_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm md:text-base text-foreground">Contact Name *</FormLabel>
                            <FormControl>
                              <Input className="text-base md:text-lg" placeholder="John Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contact_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm md:text-base text-foreground">Title/Role</FormLabel>
                            <FormControl>
                              <Input className="text-base md:text-lg" placeholder="Event Coordinator" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      <FormField
                        control={form.control}
                        name="contact_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm md:text-base text-foreground">Email *</FormLabel>
                            <FormControl>
                              <Input className="text-base md:text-lg" type="email" placeholder="you@organization.org" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contact_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm md:text-base text-foreground">Phone *</FormLabel>
                            <FormControl>
                              <Input className="text-base md:text-lg" placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm md:text-base text-foreground">Website</FormLabel>
                          <FormControl>
                            <Input className="text-base md:text-lg" placeholder="https://www.organization.org" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Event Details */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="mb-3">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Music className="h-4 w-4 text-primary" />
                        Event Details
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tell us about your event and performance needs
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="event_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Annual Charity Gala" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="event_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe your event..." className="min-h-[60px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="event_date_start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Date *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                  >
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="performance_duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="15-30 min">15–30 minutes</SelectItem>
                                <SelectItem value="30-60 min">30–60 minutes</SelectItem>
                                <SelectItem value="Full concert">Full concert (90+ min)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="venue_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Venue Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Atlanta Symphony Hall" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="venue_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Venue Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Auditorium">Auditorium</SelectItem>
                                <SelectItem value="Church">Church</SelectItem>
                                <SelectItem value="Stadium">Stadium</SelectItem>
                                <SelectItem value="Outdoor">Outdoor</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="venue_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venue Address *</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St, Atlanta, GA 30309" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="expected_attendance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expected Attendance</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="500"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="theme_occasion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Theme/Occasion</FormLabel>
                            <FormControl>
                              <Input placeholder="Holiday, fundraiser..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Technical & Logistics */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="mb-3">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Settings className="h-4 w-4 text-primary" />
                        Technical & Logistics
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tell us about your venue facilities
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="stage_dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stage Dimensions</FormLabel>
                          <FormControl>
                            <Input placeholder="20ft x 15ft" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="sound_system_available"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0 p-3 border rounded-lg">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Sound System</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lighting_available"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0 p-3 border rounded-lg">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Stage Lighting</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="piano_available"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0 p-3 border rounded-lg">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Piano Onsite</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dressing_rooms_available"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0 p-3 border rounded-lg">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Dressing Rooms</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    {watchPiano && (
                      <FormField
                        control={form.control}
                        name="piano_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Piano Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select piano type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Acoustic Grand">Acoustic Grand</SelectItem>
                                <SelectItem value="Digital">Digital</SelectItem>
                                <SelectItem value="Upright">Upright</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="load_in_soundcheck_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Load-in & Soundcheck Time</FormLabel>
                          <FormControl>
                            <Input placeholder="2 hours before performance" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="av_capabilities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>A/V Capabilities</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Recording, streaming capabilities..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 4: Hospitality & Travel */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="mb-3">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Plane className="h-4 w-4 text-primary" />
                        Hospitality & Travel
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Compensation and travel arrangements
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="honorarium_offered"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0 p-3 border rounded-lg bg-muted/30">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div>
                            <FormLabel>Honorarium or Fee Offered?</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {watchHonorarium && (
                      <FormField
                        control={form.control}
                        name="honorarium_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Honorarium Amount ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="5000"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div>
                      <FormLabel className="mb-3 block">Travel Expenses Covered</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {['Airfare', 'Ground Transport', 'Per Diem', 'Not Covered'].map((expense) => (
                          <FormField
                            key={expense}
                            control={form.control}
                            name="travel_expenses_covered"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0 p-2 border rounded-lg">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(expense)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, expense])
                                        : field.onChange(field.value?.filter((value) => value !== expense));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm">{expense}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="lodging_provided"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0 p-3 border rounded-lg">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Lodging Provided</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="meals_provided"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0 p-3 border rounded-lg">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Meals Provided</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    {watchLodging && (
                      <FormField
                        control={form.control}
                        name="lodging_nights"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nights Covered</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="notes_for_director"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes for the Director</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Special requests, preferred repertoire..." className="min-h-[60px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="how_heard_about_us"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How Did You Hear About Us?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Referral">Referral</SelectItem>
                              <SelectItem value="Website">Website</SelectItem>
                              <SelectItem value="Social Media">Social Media</SelectItem>
                              <SelectItem value="Glee Club Member">Glee Club Member</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 5: Review */}
                {currentStep === 5 && (
                  <div className="space-y-4">
                    <div className="mb-3">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Review Your Request
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Please review your information before submitting
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <h3 className="font-medium text-sm text-muted-foreground mb-2">Organization</h3>
                        <p className="font-semibold">{form.getValues('organization_name')}</p>
                        <p className="text-sm">{form.getValues('contact_person_name')} • {form.getValues('contact_email')}</p>
                      </div>

                      <div className="p-3 bg-muted/30 rounded-lg">
                        <h3 className="font-medium text-sm text-muted-foreground mb-2">Event</h3>
                        <p className="font-semibold">{form.getValues('event_name')}</p>
                        <p className="text-sm">
                          {form.getValues('event_date_start') ? format(form.getValues('event_date_start'), 'PPP') : 'No date'} • {form.getValues('performance_duration')}
                        </p>
                        <p className="text-sm">{form.getValues('venue_name')}, {form.getValues('venue_type')}</p>
                      </div>

                      {form.getValues('honorarium_offered') && (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h3 className="font-medium text-sm text-muted-foreground mb-2">Compensation</h3>
                          <p className="font-semibold">
                            ${form.getValues('honorarium_amount')?.toLocaleString() || 'TBD'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 border border-primary/20 rounded-lg bg-primary/5">
                      <p className="text-sm text-muted-foreground">
                        By submitting this request, you agree that we will review your booking request and contact you within 5-7 business days.
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-6 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>

                  {currentStep < STEPS.length ? (
                    <Button type="button" onClick={nextStep} className="gap-2">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting} className="gap-2">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Request
                          <Check className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
};
