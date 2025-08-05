import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, Clock, MapPin, Users, Music, Settings, Plane } from 'lucide-react';
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
  event_date_start: z.date({ required_error: 'Event date is required' }),
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
  how_heard_about_us: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export const BookingForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      promotional_assets_requested: [],
    },
  });

  const watchSoundSystem = form.watch('sound_system_available');
  const watchLighting = form.watch('lighting_available');
  const watchPiano = form.watch('piano_available');
  const watchHonorarium = form.watch('honorarium_offered');
  const watchLodging = form.watch('lodging_provided');
  const watchMeals = form.watch('meals_provided');
  const watchRecording = form.watch('event_recorded_livestreamed');

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
        how_heard_about_us: data.how_heard_about_us,
      };

      const { error } = await supabase
        .from('gw_booking_requests')
        .insert([payload]);

      if (error) throw error;

      toast({
        title: 'Booking Request Submitted',
        description: 'Thank you for your interest! We will review your request and contact you soon.',
        variant: 'default',
      });

      form.reset();
    } catch (error: any) {
      console.error('Error submitting booking request:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Please try again or contact us directly.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-background to-brand-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-400/20 via-brand-600/10 to-brand-400/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-card/90 backdrop-blur-sm border-2 border-brand-300 rounded-3xl p-10 shadow-glass">
            <div className="mb-6">
              <h1 className="text-5xl font-dancing font-bold text-brand-600 mb-2">
                Spelman College Glee Club
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-brand-400 to-brand-600 mx-auto rounded-full"></div>
            </div>
            <h2 className="text-3xl font-bold text-brand-500 mb-6">Book Our Performance</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-lg">
              Thank you for your interest in booking the Spelman College Glee Club. 
              Please complete this form with as much detail as possible to help us 
              provide you with the best possible experience.
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Contact Information */}
            <Card className="border-brand-200 shadow-glass bg-card/95 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-brand-50 to-brand-100/50 border-b border-brand-200">
                <CardTitle className="flex items-center gap-2 text-brand-600">
                  <Users className="h-5 w-5 text-brand-500" />
                  Contact Information
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Primary contact details for this booking request
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="organization_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Organization/Institution Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Organization Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_person_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
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
                      <FormLabel>Title/Role</FormLabel>
                      <FormControl>
                        <Input placeholder="Event Coordinator" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@organization.org" {...field} />
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
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.organization.org" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Event Details */}
            <Card className="border-brand-200 shadow-glass bg-card/95 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-brand-50 to-brand-100/50 border-b border-brand-200">
                <CardTitle className="flex items-center gap-2 text-brand-600">
                  <Music className="h-5 w-5 text-brand-500" />
                  Event Details
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Information about your event and performance requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="event_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
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
                    <FormItem className="md:col-span-2">
                      <FormLabel>Event Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your event, its purpose, and atmosphere..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
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
                  name="event_date_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (if multi-day)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Optional end date</span>
                              )}
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
                  name="performance_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requested Performance Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="performance_duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Performance Duration *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="15-30 min">15–30 minutes</SelectItem>
                          <SelectItem value="30-60 min">30–60 minutes</SelectItem>
                          <SelectItem value="Full concert">Full concert (90+ minutes)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="venue_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select venue type" />
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
                    <FormItem className="md:col-span-2">
                      <FormLabel>Theme/Occasion</FormLabel>
                      <FormControl>
                        <Input placeholder="Holiday celebration, graduation, fundraiser..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Technical & Logistical Info */}
            <Card className="border-brand-200 shadow-glass bg-card/95 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-brand-50 to-brand-100/50 border-b border-brand-200">
                <CardTitle className="flex items-center gap-2 text-brand-600">
                  <Settings className="h-5 w-5 text-brand-500" />
                  Technical & Logistical Information
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Details about venue facilities and technical requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="sound_system_available"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Sound System Available?</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {watchSoundSystem && (
                      <FormField
                        control={form.control}
                        name="sound_system_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sound System Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe the sound system capabilities..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="lighting_available"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Lighting Available?</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {watchLighting && (
                      <FormField
                        control={form.control}
                        name="lighting_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lighting Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe the lighting setup..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="piano_available"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Piano/Keyboard Onsite?</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

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
                  </div>

                  <FormField
                    control={form.control}
                    name="dressing_rooms_available"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Dressing Rooms Available?</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="rehearsal_time_provided"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rehearsal Time Provided</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                </div>

                <FormField
                  control={form.control}
                  name="av_capabilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>A/V Capabilities</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe recording capabilities, live streaming setup, etc..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Hospitality & Travel */}
            <Card className="border-brand-200 shadow-glass bg-card/95 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-brand-50 to-brand-100/50 border-b border-brand-200">
                <CardTitle className="flex items-center gap-2 text-brand-600">
                  <Plane className="h-5 w-5 text-brand-500" />
                  Hospitality & Travel
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Information about compensation, travel, and accommodations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="honorarium_offered"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
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
                  </div>

                  <div className="space-y-4">
                    <FormLabel>Travel Expenses Covered</FormLabel>
                    <div className="space-y-3">
                      {['Airfare', 'Ground Transport', 'Per Diem', 'Not Covered'].map((expense) => (
                        <FormField
                          key={expense}
                          control={form.control}
                          name="travel_expenses_covered"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={expense}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(expense)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, expense])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== expense
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {expense}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="lodging_provided"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Lodging Provided?</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

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
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="meals_provided"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Meals Provided?</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {watchMeals && (
                      <FormField
                        control={form.control}
                        name="dietary_restrictions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dietary Restrictions Accommodation</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Vegetarian, vegan, gluten-free options available..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="preferred_arrival_point"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Point of Arrival</FormLabel>
                      <FormControl>
                        <Input placeholder="Hartsfield-Jackson Atlanta International Airport" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Permissions & Media */}
            <Card className="border-brand-200 shadow-glass bg-card/95 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-brand-50 to-brand-100/50 border-b border-brand-200">
                <CardTitle className="flex items-center gap-2 text-brand-600">
                  <MapPin className="h-5 w-5 text-brand-500" />
                  Permissions & Media
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Recording permissions and promotional material requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="event_recorded_livestreamed"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Event Being Recorded or Livestreamed?</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {watchRecording && (
                      <FormField
                        control={form.control}
                        name="recording_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recording Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe recording/streaming plans..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="photo_video_permission"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Permission to Use Photos/Videos for Promotion?</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="formal_contract_required"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Formal Contract Required?</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <FormLabel>Promotional Assets Requested</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {['Bio', 'Logo', 'Photos', 'Media Kit'].map((asset) => (
                      <FormField
                        key={asset}
                        control={form.control}
                        name="promotional_assets_requested"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={asset}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(asset)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, asset])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== asset
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {asset}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card className="border-brand-200 shadow-glass bg-card/95 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-brand-50 to-brand-100/50 border-b border-brand-200">
                <CardTitle className="flex items-center gap-2 text-brand-600">
                  <Clock className="h-5 w-5 text-brand-500" />
                  Additional Information
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Any additional details or special requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="notes_for_director"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes for the Director</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Special requests, preferred repertoire, specific themes..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes_for_choir"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes for Choir Members</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Dress code, arrival instructions, special considerations..."
                          className="min-h-[100px]"
                          {...field} 
                        />
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
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="text-center">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full md:w-auto px-8 py-3 text-lg bg-brand-600 hover:bg-brand-700 text-white border-0 shadow-glass-lg"
              >
                {isSubmitting ? 'Submitting Request...' : 'Submit Booking Request'}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                We will review your request and contact you within 5-7 business days.
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};