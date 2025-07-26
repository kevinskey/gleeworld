import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useCameraImport } from "@/hooks/useCameraImport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Camera, Upload, Mic } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Navigate } from "react-router-dom";

const auditionSchema = z.object({
  // Basic info
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  
  // Musical background
  sangInMiddleSchool: z.boolean(),
  sangInHighSchool: z.boolean(),
  highSchoolYears: z.string().optional(),
  playsInstrument: z.boolean(),
  instrumentDetails: z.string().optional(),
  isSoloist: z.boolean(),
  soloistRating: z.string().optional(),
  highSchoolSection: z.string().optional(),
  
  // Music skills
  readsMusic: z.boolean(),
  interestedInVoiceLessons: z.boolean(),
  interestedInMusicFundamentals: z.boolean(),
  
  // Leadership and personality
  personalityDescription: z.string().min(10, "Please describe your personality"),
  interestedInLeadership: z.boolean(),
  additionalInfo: z.string().optional(),
  
  // Audition scheduling
  auditionDate: z.date({ required_error: "Please select an audition date" }),
  auditionTime: z.string({ required_error: "Please select an audition time" }),
});

type AuditionFormData = z.infer<typeof auditionSchema>;

export default function AuditionPage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isCapturing,
    isCameraReady,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    handleFileSelect
  } = useCameraImport({
    onSuccess: (file) => {
      uploadSelfie(file);
    },
    onError: (error) => {
      toast.error("Camera error: " + error);
    }
  });

  const form = useForm<AuditionFormData>({
    resolver: zodResolver(auditionSchema),
    defaultValues: {
      sangInMiddleSchool: false,
      sangInHighSchool: false,
      playsInstrument: false,
      isSoloist: false,
      readsMusic: false,
      interestedInVoiceLessons: false,
      interestedInMusicFundamentals: false,
      interestedInLeadership: false,
    },
  });

  const uploadSelfie = async (file: File) => {
    if (!user) return;

    try {
      const fileName = `audition-selfie-${user.id}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('user-files')
        .upload(`${user.id}/audition/${fileName}`, file);

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('user-files')
        .getPublicUrl(data.path);

      setCapturedImage(publicData.publicUrl);
      toast.success("Selfie captured successfully!");
    } catch (error) {
      console.error('Error uploading selfie:', error);
      toast.error("Failed to upload selfie");
    }
  };

  const handleTakePhoto = async () => {
    if (!isCameraReady) {
      await startCamera();
    } else {
      await capturePhoto();
      stopCamera();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event);
  };

  const onSubmit = async (data: AuditionFormData) => {
    if (!user) {
      toast.error("Please log in to submit your audition form");
      return;
    }

    if (!capturedImage) {
      toast.error("Please take a selfie before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      // Save audition data to database - using any type to bypass type check temporarily
      const { error } = await (supabase as any)
        .from('gw_auditions')
        .insert({
          user_id: user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          sang_in_middle_school: data.sangInMiddleSchool,
          sang_in_high_school: data.sangInHighSchool,
          high_school_years: data.highSchoolYears,
          plays_instrument: data.playsInstrument,
          instrument_details: data.instrumentDetails,
          is_soloist: data.isSoloist,
          soloist_rating: data.soloistRating ? parseInt(data.soloistRating) : null,
          high_school_section: data.highSchoolSection,
          reads_music: data.readsMusic,
          interested_in_voice_lessons: data.interestedInVoiceLessons,
          interested_in_music_fundamentals: data.interestedInMusicFundamentals,
          personality_description: data.personalityDescription,
          interested_in_leadership: data.interestedInLeadership,
          additional_info: data.additionalInfo,
          audition_date: data.auditionDate.toISOString(),
          audition_time: data.auditionTime,
          selfie_url: capturedImage,
        });

      if (error) throw error;

      toast.success("Audition application submitted successfully!");
      form.reset();
      setCapturedImage(null);
    } catch (error) {
      console.error('Error submitting audition:', error);
      toast.error("Failed to submit audition application");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const timeSlots = [
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <Mic className="w-16 h-16 mx-auto text-purple-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Audition Application</h1>
          <p className="text-xl text-gray-600">Join the Spelman College Glee Club Family</p>
        </div>

        <Card className="bg-white/80 backdrop-blur-md border-white/30 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">Tell Us About Yourself</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your first name" {...field} />
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
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
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
                            <Input placeholder="Enter your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Musical Background */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Musical Background</h3>
                  
                  <FormField
                    control={form.control}
                    name="sangInMiddleSchool"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Did you sing in middle school?
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sangInHighSchool"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Did you sing in high school?
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch("sangInHighSchool") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <FormField
                        control={form.control}
                        name="highSchoolYears"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>How many years?</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 4 years" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="highSchoolSection"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>What section did you sing?</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select section" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="soprano">Soprano</SelectItem>
                                <SelectItem value="alto">Alto</SelectItem>
                                <SelectItem value="tenor">Tenor</SelectItem>
                                <SelectItem value="bass">Bass</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="playsInstrument"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Do you play an instrument well enough to perform with it?
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch("playsInstrument") && (
                    <FormField
                      control={form.control}
                      name="instrumentDetails"
                      render={({ field }) => (
                        <FormItem className="ml-6">
                          <FormLabel>What instrument(s)?</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Piano, Guitar, Violin" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="isSoloist"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Are you a soloist?
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch("isSoloist") && (
                    <FormField
                      control={form.control}
                      name="soloistRating"
                      render={({ field }) => (
                        <FormItem className="ml-6">
                          <FormLabel>Rate yourself 1-10 (10 being best)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rating" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[1,2,3,4,5,6,7,8,9,10].map(num => (
                                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Music Skills */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Music Skills & Interests</h3>
                  
                  <FormField
                    control={form.control}
                    name="readsMusic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Do you read music?
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interestedInVoiceLessons"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Are you interested in taking voice lessons as a class?
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interestedInMusicFundamentals"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Want to take music fundamentals as a class?
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Personal Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">About You</h3>
                  
                  <FormField
                    control={form.control}
                    name="personalityDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How would you describe your personality?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about your personality, what makes you unique..."
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
                    name="interestedInLeadership"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Are you interested in being a leader in the glee club in the future?
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additionalInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anything we should know about you?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any additional information you'd like to share..."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Audition Scheduling */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Schedule Your Audition</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="auditionDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Audition Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
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
                                disabled={(date) =>
                                  date < new Date() || date.getDay() === 0 || date.getDay() === 6
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="auditionTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Audition Time</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timeSlots.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Selfie Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Take Your Audition Selfie</h3>
                  
                  <div className="flex flex-col items-center space-y-4">
                    {capturedImage ? (
                      <div className="relative">
                        <img 
                          src={capturedImage} 
                          alt="Audition selfie" 
                          className="w-48 h-48 object-cover rounded-full border-4 border-purple-200"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-0 right-0"
                          onClick={() => setCapturedImage(null)}
                        >
                          Retake
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        {isCapturing && (
                          <video
                            ref={videoRef}
                            className="w-48 h-48 object-cover rounded-full border-4 border-purple-200"
                            autoPlay
                            muted
                          />
                        )}
                        
                        <div className="flex gap-4 justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleTakePhoto}
                            disabled={isCapturing && !isCameraReady}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            {isCapturing ? "Capture Photo" : "Take Selfie"}
                          </Button>
                          
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Photo
                          </Button>
                          
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 text-lg"
                  disabled={isSubmitting || !capturedImage}
                >
                  {isSubmitting ? "Submitting..." : "Submit Audition Application"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}