import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Music, 
  CreditCard,
  Globe,
  Save,
  Shield,
  Heart,
  Shirt,
  Home,
  Book
} from "lucide-react";
import { ALL_DIETARY_OPTIONS } from "@/constants/dietaryOptions";

// Enhanced schema with all new fields
const profileSetupSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  bio: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal("")),
  phone_number: z.string().optional(),
  student_number: z.string().optional(),
  workplace: z.string().optional(),
  school_address: z.string().optional(),
  home_address: z.string().optional(),
  voice_part: z.enum(["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"]).optional().or(z.literal("")),
  can_dance: z.boolean().default(false),
  preferred_payment_method: z.enum(["zelle", "cashapp", "venmo", "apple_pay", "check"]).optional().or(z.literal("")),
  
  // New Wardrobe & Identity fields
  dress_size: z.string().optional(),
  shoe_size: z.string().optional(),
  hair_color: z.string().optional(),
  has_tattoos: z.boolean().default(false),
  visible_piercings: z.boolean().default(false),
  
  // Academic & Personal fields
  academic_major: z.string().optional(),
  pronouns: z.string().optional(),
  class_year: z.number().min(1900).max(2050).optional().or(z.literal("")),
  
  // Health & Safety fields
  emergency_contact: z.string().optional(),
  allergies: z.string().optional(),
  parent_guardian_contact: z.string().optional(),
  
  // Social media
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  youtube: z.string().optional(),
});

type ProfileSetupFormData = z.infer<typeof profileSetupSchema>;

const instruments = [
  "Piano", "Guitar", "Violin", "Cello", "Flute", "Clarinet", "Saxophone", "Trumpet", 
  "Trombone", "French Horn", "Tuba", "Drums", "Bass Guitar", "Harp", "Oboe", "Bassoon",
  "Percussion", "Accordion", "Banjo", "Mandolin", "Ukulele", "Organ", "Synthesizer"
];

const paymentMethods = [
  { value: "zelle", label: "Zelle" },
  { value: "cashapp", label: "Cash App" },
  { value: "venmo", label: "Venmo" },
  { value: "apple_pay", label: "Apple Pay" },
  { value: "check", label: "Check" },
];

const voiceParts = [
  { value: "S1", label: "Soprano 1" },
  { value: "S2", label: "Soprano 2" },
  { value: "A1", label: "Alto 1" },
  { value: "A2", label: "Alto 2" },
  { value: "T1", label: "Tenor 1" },
  { value: "T2", label: "Tenor 2" },
  { value: "B1", label: "Bass 1" },
  { value: "B2", label: "Bass 2" },
];

const dressSizes = ["XS", "S", "M", "L", "XL", "XXL", "2", "4", "6", "8", "10", "12", "14", "16", "18", "20"];
const shoeSizes = ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"];
const pronounOptions = ["She/Her", "He/Him", "They/Them", "Other"];

const ProfileSetup = () => {
  const { user } = useAuth();
  const { profile: userRole, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] = useState<string[]>([]);
  const [profileProgress, setProfileProgress] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileSetupFormData>({
    resolver: zodResolver(profileSetupSchema),
  });

  const watchedFields = watch();

  // Calculate profile completion
  useEffect(() => {
    const totalRequiredFields = getRoleRequiredFieldCount();
    const completedFields = getCompletedFieldCount();
    const progress = Math.min((completedFields / totalRequiredFields) * 100, 100);
    setProfileProgress(progress);
  }, [watchedFields, userRole?.role]);

  const getRoleRequiredFieldCount = () => {
    const role = userRole?.role || 'user';
    switch (role) {
      case 'super-admin':
      case 'admin':
        return 15; // All important fields
      case 'user': // Members
        return 12; // Most fields including wardrobe and health
      default: // Fans
        return 5; // Basic fields only
    }
  };

  const getCompletedFieldCount = () => {
    const role = userRole?.role || 'user';
    let count = 0;
    
    // Basic fields (required for all roles)
    if (watchedFields.full_name) count++;
    if (watchedFields.phone_number) count++;
    if (watchedFields.bio) count++;
    
    // Additional fields for members and above
    if (role !== 'fan') {
      if (watchedFields.voice_part) count++;
      if (watchedFields.academic_major) count++;
      if (watchedFields.class_year) count++;
      if (watchedFields.emergency_contact) count++;
      
      // Full member fields
      if (role === 'user' || role === 'admin' || role === 'super-admin') {
        if (watchedFields.dress_size) count++;
        if (watchedFields.shoe_size) count++;
        if (watchedFields.pronouns) count++;
        if (watchedFields.home_address) count++;
        if (selectedInstruments.length > 0) count++;
      }
      
      // Admin fields
      if (role === 'admin' || role === 'super-admin') {
        if (watchedFields.workplace) count++;
        if (watchedFields.student_number) count++;
        if (watchedFields.preferred_payment_method) count++;
      }
    }
    
    return count;
  };

  const shouldShowField = (fieldType: string) => {
    const role = userRole?.role || 'user';
    
    switch (fieldType) {
      case 'basic':
        return true; // All roles see basic info
      case 'academic':
        return role !== 'fan'; // All except fans
      case 'wardrobe':
        return ['user', 'admin', 'super-admin'].includes(role); // Members and above
      case 'health':
        return ['user', 'admin', 'super-admin'].includes(role); // Members and above
      case 'professional':
        return ['admin', 'super-admin'].includes(role); // Admin and above
      case 'social':
        return true; // All roles
      default:
        return true;
    }
  };

  const handleInstrumentChange = (instrument: string, checked: boolean) => {
    if (checked) {
      setSelectedInstruments([...selectedInstruments, instrument]);
    } else {
      setSelectedInstruments(selectedInstruments.filter(i => i !== instrument));
    }
  };

  const handleDietaryRestrictionChange = (restriction: string, checked: boolean) => {
    if (checked) {
      setSelectedDietaryRestrictions([...selectedDietaryRestrictions, restriction]);
    } else {
      setSelectedDietaryRestrictions(selectedDietaryRestrictions.filter(r => r !== restriction));
    }
  };

  const onSubmit = async (data: ProfileSetupFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const socialMediaLinks = {
        instagram: data.instagram,
        twitter: data.twitter,
        facebook: data.facebook,
        youtube: data.youtube,
      };

      const { error } = await supabase
        .from("gw_profiles")
        .update({
          full_name: data.full_name,
          bio: data.bio,
          website_url: data.website_url,
          phone_number: data.phone_number,
          student_number: data.student_number,
          workplace: data.workplace,
          school_address: data.school_address,
          home_address: data.home_address,
          voice_part: data.voice_part === "" ? null : data.voice_part,
          can_dance: data.can_dance,
          preferred_payment_method: data.preferred_payment_method === "" ? null : data.preferred_payment_method,
          instruments_played: selectedInstruments,
          social_media_links: socialMediaLinks,
          
          // New fields
          dress_size: data.dress_size,
          shoe_size: data.shoe_size,
          hair_color: data.hair_color,
          has_tattoos: data.has_tattoos,
          visible_piercings: data.visible_piercings,
          academic_major: data.academic_major,
          pronouns: data.pronouns,
          class_year: data.class_year === "" ? null : Number(data.class_year),
          emergency_contact: data.emergency_contact,
          dietary_restrictions: selectedDietaryRestrictions,
          allergies: data.allergies,
          parent_guardian_contact: data.parent_guardian_contact,
          
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile setup completed successfully!",
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error("Error setting up profile:", error);
      toast({
        title: "Error",
        description: "Failed to complete profile setup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Please sign in to set up your profile.</p>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to GleeWorld!</h1>
          <p className="text-white/80 mb-4">
            Let's set up your profile to get you started. Complete your profile to unlock all features.
          </p>
          
          {/* Profile Progress */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm text-gray-600">{Math.round(profileProgress)}%</span>
              </div>
              <Progress value={profileProgress} className="h-2" />
              <p className="text-xs text-gray-500 mt-2">
                Complete more fields to unlock all GleeWorld features
              </p>
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          {shouldShowField('basic') && (
            <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>Tell us about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    {...register("full_name")}
                    className="mt-1"
                    placeholder="Enter your full name"
                  />
                  {errors.full_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    {...register("bio")}
                    className="mt-1"
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      {...register("phone_number")}
                      className="mt-1"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pronouns">Pronouns</Label>
                    <Select
                      value={watch("pronouns") || ""}
                      onValueChange={(value) => setValue("pronouns", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select pronouns" />
                      </SelectTrigger>
                      <SelectContent>
                        {pronounOptions.map((pronoun) => (
                          <SelectItem key={pronoun} value={pronoun}>
                            {pronoun}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Academic Information */}
          {shouldShowField('academic') && (
            <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Info
                </CardTitle>
                <CardDescription>Your academic background</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="academic_major">Academic Major</Label>
                  <Input
                    id="academic_major"
                    {...register("academic_major")}
                    className="mt-1"
                    placeholder="e.g., Music, Business, Biology"
                  />
                </div>
                <div>
                  <Label htmlFor="class_year">Class Year</Label>
                  <Input
                    id="class_year"
                    type="number"
                    {...register("class_year", { valueAsNumber: true })}
                    className="mt-1"
                    placeholder="2024"
                    min="1900"
                    max="2050"
                  />
                </div>
                <div>
                  <Label htmlFor="student_number">Student Number</Label>
                  <Input
                    id="student_number"
                    {...register("student_number")}
                    className="mt-1"
                    placeholder="Your student ID"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Musical Information */}
          {shouldShowField('academic') && (
            <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Musical Information
                </CardTitle>
                <CardDescription>Your musical background and abilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="voice_part">Voice Part</Label>
                    <Select
                      value={watch("voice_part") || ""}
                      onValueChange={(value) => setValue("voice_part", value as any)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select voice part" />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceParts.map((part) => (
                          <SelectItem key={part.value} value={part.value}>
                            {part.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <Checkbox
                      id="can_dance"
                      checked={watch("can_dance")}
                      onCheckedChange={(checked) => setValue("can_dance", checked as boolean)}
                    />
                    <Label htmlFor="can_dance">Can Dance</Label>
                  </div>
                </div>

                <div>
                  <Label>Instruments Played</Label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {instruments.map((instrument) => (
                      <div key={instrument} className="flex items-center space-x-2">
                        <Checkbox
                          id={instrument}
                          checked={selectedInstruments.includes(instrument)}
                          onCheckedChange={(checked) =>
                            handleInstrumentChange(instrument, checked as boolean)
                          }
                        />
                        <Label htmlFor={instrument} className="text-sm">
                          {instrument}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wardrobe & Wellness */}
          {shouldShowField('wardrobe') && (
            <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="h-5 w-5" />
                  Wardrobe & Wellness
                </CardTitle>
                <CardDescription>Information for performances and health requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="dress_size">Dress/Top Size</Label>
                    <Select
                      value={watch("dress_size") || ""}
                      onValueChange={(value) => setValue("dress_size", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {dressSizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shoe_size">Shoe Size</Label>
                    <Select
                      value={watch("shoe_size") || ""}
                      onValueChange={(value) => setValue("shoe_size", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {shoeSizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hair_color">Hair Color</Label>
                    <Input
                      id="hair_color"
                      {...register("hair_color")}
                      className="mt-1"
                      placeholder="e.g., Brown, Black, Blonde"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_tattoos"
                      checked={watch("has_tattoos")}
                      onCheckedChange={(checked) => setValue("has_tattoos", checked as boolean)}
                    />
                    <Label htmlFor="has_tattoos">Has Tattoos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visible_piercings"
                      checked={watch("visible_piercings")}
                      onCheckedChange={(checked) => setValue("visible_piercings", checked as boolean)}
                    />
                    <Label htmlFor="visible_piercings">Has Visible Piercings</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Health & Safety */}
          {shouldShowField('health') && (
            <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Health & Safety
                </CardTitle>
                <CardDescription>Emergency contacts and health information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergency_contact">Emergency Contact</Label>
                    <Input
                      id="emergency_contact"
                      {...register("emergency_contact")}
                      className="mt-1"
                      placeholder="Name and phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="parent_guardian_contact">Parent/Guardian Contact</Label>
                    <Input
                      id="parent_guardian_contact"
                      {...register("parent_guardian_contact")}
                      className="mt-1"
                      placeholder="If applicable"
                    />
                  </div>
                </div>

                <div>
                  <Label>Dietary Restrictions</Label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {ALL_DIETARY_OPTIONS.map((restriction) => (
                      <div key={restriction} className="flex items-center space-x-2">
                        <Checkbox
                          id={restriction}
                          checked={selectedDietaryRestrictions.includes(restriction)}
                          onCheckedChange={(checked) =>
                            handleDietaryRestrictionChange(restriction, checked as boolean)
                          }
                        />
                        <Label htmlFor={restriction} className="text-sm">
                          {restriction}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="allergies">Allergies & Medical Notes</Label>
                  <Textarea
                    id="allergies"
                    {...register("allergies")}
                    className="mt-1"
                    rows={2}
                    placeholder="List any allergies or important medical information..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Professional Information - Admin Only */}
          {shouldShowField('professional') && (
            <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Professional Information
                </CardTitle>
                <CardDescription>Work and contact details</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workplace">Where do you work?</Label>
                  <Input
                    id="workplace"
                    {...register("workplace")}
                    className="mt-1"
                    placeholder="Your workplace"
                  />
                </div>
                <div>
                  <Label htmlFor="preferred_payment_method">Preferred Payment Method</Label>
                  <Select
                    value={watch("preferred_payment_method") || ""}
                    onValueChange={(value) => setValue("preferred_payment_method", value as any)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Address Information */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Address Information
              </CardTitle>
              <CardDescription>Where can we reach you?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="home_address">Home Address</Label>
                <Textarea
                  id="home_address"
                  {...register("home_address")}
                  className="mt-1"
                  rows={2}
                  placeholder="Your home address"
                />
              </div>
              <div>
                <Label htmlFor="school_address">School Address</Label>
                <Textarea
                  id="school_address"
                  {...register("school_address")}
                  className="mt-1"
                  rows={2}
                  placeholder="Your school address"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media Links */}
          {shouldShowField('social') && (
            <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Social Media & Website
                </CardTitle>
                <CardDescription>Connect your social profiles</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website_url">Website</Label>
                  <Input
                    id="website_url"
                    {...register("website_url")}
                    className="mt-1"
                    placeholder="https://"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    {...register("instagram")}
                    className="mt-1"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    {...register("twitter")}
                    className="mt-1"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    {...register("facebook")}
                    className="mt-1"
                    placeholder="Profile URL"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Profile {Math.round(profileProgress)}% complete
                  </p>
                  <p className="text-xs text-gray-500">
                    You can always update your profile later
                  </p>
                </div>
                <Button 
                  type="submit"
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  {loading ? "Saving..." : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </UniversalLayout>
  );
};

export default ProfileSetup;