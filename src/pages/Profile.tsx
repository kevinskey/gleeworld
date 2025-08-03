import { useState, useEffect } from "react";
import { convertHeicToJpeg, createFileFromBase64, isHeicFile } from "@/utils/heicConverter";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
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
  Camera,
  Save,
  Edit,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Music2,
  DollarSign,
  Shirt,
  Heart,
  Home,
  Shield
} from "lucide-react";
import { AvatarCropDialog } from "@/components/shared/AvatarCropDialog";
import { ALL_DIETARY_OPTIONS } from "@/constants/dietaryOptions";

const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
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
  graduation_year: z.number().min(1900).max(2050).optional().or(z.literal("")),
  
  // Health & Safety fields
  emergency_contact: z.string().optional(),
  allergies: z.string().optional(),
  parent_guardian_contact: z.string().optional(),
  
  // Glee Club specific fields
  join_date: z.string().optional(),
  mentor_opt_in: z.boolean().default(false),
  reunion_rsvp: z.boolean().default(false),
  
  // Social media
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  youtube: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const instruments = [
  "Piano", "Guitar", "Violin", "Cello", "Flute", "Clarinet", "Saxophone", "Trumpet", 
  "Trombone", "French Horn", "Tuba", "Drums", "Bass Guitar", "Harp", "Oboe", "Bassoon",
  "Percussion", "Accordion", "Banjo", "Mandolin", "Ukulele", "Organ", "Synthesizer"
];

const dressSizes = ["XS", "S", "M", "L", "XL", "XXL", "2", "4", "6", "8", "10", "12", "14", "16", "18", "20"];
const shoeSizes = ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"];
const pronounOptions = ["She/Her", "He/Him", "They/Them", "Other"];

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

const Profile = () => {
  const { user } = useAuth();
  const { profile: userRole } = useUserRole();
  const { toast } = useToast();
  const { profile, loading: profileLoading, updateAvatarUrl } = useProfile();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] = useState<string[]>([]);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<string>("");
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const canDance = watch("can_dance");

  useEffect(() => {
    if (profile) {
      // Set form values from profile data - split full_name if exists
      if (profile.full_name) {
        const nameParts = profile.full_name.split(' ');
        setValue("first_name", nameParts[0] || "");
        setValue("middle_name", nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : "");
        setValue("last_name", nameParts.length > 1 ? nameParts[nameParts.length - 1] : "");
      } else {
        setValue("first_name", profile.first_name || "");
        setValue("middle_name", profile.middle_name || "");
        setValue("last_name", profile.last_name || "");
      }
      
      setValue("bio", profile.bio || "");
      setValue("website_url", profile.website_url || "");
      setValue("phone_number", profile.phone_number || "");
      setValue("student_number", profile.student_number || "");
      setValue("workplace", profile.workplace || "");
      setValue("school_address", profile.school_address || "");
      setValue("home_address", profile.home_address || "");
      setValue("voice_part", profile.voice_part || "");
      setValue("can_dance", profile.can_dance || false);
      setValue("preferred_payment_method", profile.preferred_payment_method || "");
      
      // New fields
      setValue("dress_size", profile.dress_size || "");
      setValue("shoe_size", profile.shoe_size || "");
      setValue("hair_color", profile.hair_color || "");
      setValue("has_tattoos", profile.has_tattoos || false);
      setValue("visible_piercings", profile.visible_piercings || false);
      setValue("academic_major", profile.academic_major || "");
      setValue("pronouns", profile.pronouns || "");
      setValue("class_year", profile.class_year || "");
      setValue("graduation_year", profile.graduation_year || "");
      setValue("emergency_contact", profile.emergency_contact || "");
      setValue("allergies", profile.allergies || "");
      setValue("parent_guardian_contact", profile.parent_guardian_contact || "");
      setValue("join_date", profile.join_date || "");
      setValue("mentor_opt_in", profile.mentor_opt_in || false);
      setValue("reunion_rsvp", profile.reunion_rsvp || false);
      
      // Set social media links
      const socialLinks = profile.social_media_links || {};
      setValue("instagram", socialLinks.instagram || "");
      setValue("twitter", socialLinks.twitter || "");
      setValue("facebook", socialLinks.facebook || "");
      setValue("youtube", socialLinks.youtube || "");

      // Set instruments and dietary restrictions
      setSelectedInstruments(profile.instruments_played || []);
      setSelectedDietaryRestrictions(profile.dietary_restrictions || []);
    }
  }, [profile, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    console.log("🚀 Form submitted with data:", data);
    console.log("🚀 Form errors:", errors);
    console.log("🚀 Is editing:", isEditing);
    console.log("🚀 Loading state:", loading);
    
    if (!user) {
      console.log("❌ No user found, cannot save profile");
      return;
    }

    setLoading(true);
    try {
      const socialMediaLinks = {
        instagram: data.instagram,
        twitter: data.twitter,
        facebook: data.facebook,
        youtube: data.youtube,
      };

      console.log("Attempting to update profile with:", {
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
        bio: data.bio,
        website_url: data.website_url,
        phone_number: data.phone_number,
        student_number: data.student_number,
        workplace: data.workplace,
        school_address: data.school_address,
        home_address: data.home_address,
        voice_part: data.voice_part,
        can_dance: data.can_dance,
        preferred_payment_method: data.preferred_payment_method,
        instruments_played: selectedInstruments,
        social_media_links: socialMediaLinks,
      });

      // Create full_name from separate fields for backward compatibility
      const fullName = [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ');

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: data.first_name,
          middle_name: data.middle_name,
          last_name: data.last_name,
          full_name: fullName,
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
          graduation_year: data.graduation_year === "" ? null : Number(data.graduation_year),
          emergency_contact: data.emergency_contact,
          dietary_restrictions: selectedDietaryRestrictions,
          allergies: data.allergies,
          parent_guardian_contact: data.parent_guardian_contact,
          join_date: data.join_date,
          mentor_opt_in: data.mentor_opt_in,
          reunion_rsvp: data.reunion_rsvp,
          
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // Also sync with gw_profiles table to keep data consistent
      const { error: gwError } = await supabase
        .from("gw_profiles")
        .update({
          first_name: data.first_name,
          middle_name: data.middle_name,
          last_name: data.last_name,
          full_name: fullName,
          phone: data.phone_number,
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
          graduation_year: data.graduation_year === "" ? null : Number(data.graduation_year),
          emergency_contact: data.emergency_contact,
          dietary_restrictions: selectedDietaryRestrictions,
          allergies: data.allergies,
          parent_guardian_contact: data.parent_guardian_contact,
          join_date: data.join_date,
          mentor_opt_in: data.mentor_opt_in,
          reunion_rsvp: data.reunion_rsvp,
          
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (gwError) {
        console.warn("Error syncing with gw_profiles:", gwError);
        // Don't throw error since main profiles update succeeded
      }

      console.log("Profile updated successfully");
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type - now including HEIC
    const isValidImage = file.type.startsWith('image/') || isHeicFile(file);
    if (!isValidImage) {
      toast({
        title: "Error",
        description: "Please select a valid image file",
        variant: "destructive",
      });
      return;
    }

    try {
      let processedFile = file;
      
      // Check if it's a HEIC file and convert if needed
      if (isHeicFile(file)) {
        toast({
          title: "Processing HEIC",
          description: "Converting HEIC file to JPEG...",
        });

        const conversionResult = await convertHeicToJpeg(file);
        
        if (!conversionResult.success) {
          toast({
            title: "HEIC Conversion Failed",
            description: conversionResult.error || "Could not convert HEIC file",
            variant: "destructive",
          });
          return;
        }

        // Use the converted file
        processedFile = conversionResult.file!;
        
        toast({
          title: "HEIC Converted",
          description: "Successfully converted to JPEG format",
        });
      }

      // Create object URL for the processed file (converted or original)
      const imageUrl = URL.createObjectURL(processedFile);
      setSelectedImageForCrop(imageUrl);
      setIsCropDialogOpen(true);

    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Error",
        description: "Failed to process image file",
        variant: "destructive",
      });
    }
  };

  const handleCroppedImageUpload = async (croppedImageFile: File) => {
    if (!user) return;

    setIsAvatarUploading(true);
    try {
      const fileExt = croppedImageFile.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, croppedImageFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      // Use the updateAvatarUrl method from useProfile hook for immediate update
      const success = await updateAvatarUrl(data.publicUrl);
      
      if (success) {
        setIsCropDialogOpen(false);
        
        // Clean up the object URL
        if (selectedImageForCrop) {
          URL.revokeObjectURL(selectedImageForCrop);
          setSelectedImageForCrop("");
        }

        toast({
          title: "Success",
          description: "Avatar updated successfully",
        });

        // Force a page refresh to update the header avatar
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleCropDialogClose = () => {
    setIsCropDialogOpen(false);
    // Clean up the object URL
    if (selectedImageForCrop) {
      URL.revokeObjectURL(selectedImageForCrop);
      setSelectedImageForCrop("");
    }
  };

  if (!user) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Please sign in to view your profile.</p>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Profile</h1>
            <p className="text-lg text-muted-foreground">{isEditing ? "Make changes to your profile information" : ""}</p>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
          >
            {isEditing ? (
              "Cancel Editing"
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </>
            )}
          </Button>
        </div>


        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Profile Picture & Basic Info */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-border shadow-lg">
                    <AvatarImage src={profile?.avatar_url || ""} className="object-cover" />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors">
                      <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        onChange={handleAvatarUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        {...register("first_name")}
                        disabled={!isEditing}
                        className="mt-1"
                      />
                      {errors.first_name && (
                        <p className="text-destructive text-sm mt-1">{errors.first_name.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        {...register("last_name")}
                        disabled={!isEditing}
                        className="mt-1"
                      />
                      {errors.last_name && (
                        <p className="text-destructive text-sm mt-1">{errors.last_name.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="middle_name">Middle Name</Label>
                    <Input
                      id="middle_name"
                      {...register("middle_name")}
                      disabled={!isEditing}
                      className="mt-1"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pronouns">Pronouns</Label>
                    <Select
                      value={watch("pronouns") || ""}
                      onValueChange={(value) => setValue("pronouns", value)}
                      disabled={!isEditing}
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
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      {...register("bio")}
                      disabled={!isEditing}
                      className="mt-1"
                      rows={3}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  {...register("phone_number")}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  {...register("website_url")}
                  disabled={!isEditing}
                  className="mt-1"
                  placeholder="https://"
                />
                {errors.website_url && (
                  <p className="text-destructive text-sm mt-1">{errors.website_url.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <MapPin className="h-5 w-5" />
                Addresses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="home_address">Home Address</Label>
                <Textarea
                  id="home_address"
                  {...register("home_address")}
                  disabled={!isEditing}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="school_address">School Address</Label>
                <Textarea
                  id="school_address"
                  {...register("school_address")}
                  disabled={!isEditing}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          {shouldShowField('academic') && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <GraduationCap className="h-5 w-5" />
                  Academic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="academic_major">Academic Major</Label>
                  <Input
                    id="academic_major"
                    {...register("academic_major")}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="e.g., Music, Business, Biology"
                  />
                </div>
                <div>
                  <Label htmlFor="class_year">Current Class Year</Label>
                  <Input
                    id="class_year"
                    type="number"
                    {...register("class_year", { valueAsNumber: true })}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="2024"
                    min="1900"
                    max="2050"
                  />
                </div>
                <div>
                  <Label htmlFor="graduation_year">Graduation Year</Label>
                  <Input
                    id="graduation_year"
                    type="number"
                    {...register("graduation_year", { valueAsNumber: true })}
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="Your student ID"
                  />
                </div>
                <div>
                  <Label htmlFor="join_date">Glee Club Join Date</Label>
                  <Input
                    id="join_date"
                    type="date"
                    {...register("join_date")}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wardrobe & Wellness */}
          {shouldShowField('wardrobe') && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
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
                      disabled={!isEditing}
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
                      disabled={!isEditing}
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
                      disabled={!isEditing}
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
                      disabled={!isEditing}
                    />
                    <Label htmlFor="has_tattoos">Has Tattoos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visible_piercings"
                      checked={watch("visible_piercings")}
                      onCheckedChange={(checked) => setValue("visible_piercings", checked as boolean)}
                      disabled={!isEditing}
                    />
                    <Label htmlFor="visible_piercings">Has Visible Piercings</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Health & Safety */}
          {shouldShowField('health') && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
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
                      disabled={!isEditing}
                      className="mt-1"
                      placeholder="Name and phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="parent_guardian_contact">Parent/Guardian Contact</Label>
                    <Input
                      id="parent_guardian_contact"
                      {...register("parent_guardian_contact")}
                      disabled={!isEditing}
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
                          id={`dietary_${restriction}`}
                          checked={selectedDietaryRestrictions.includes(restriction)}
                          onCheckedChange={(checked) =>
                            handleDietaryRestrictionChange(restriction, checked as boolean)
                          }
                          disabled={!isEditing}
                        />
                        <Label htmlFor={`dietary_${restriction}`} className="text-sm">
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
                    disabled={!isEditing}
                    className="mt-1"
                    rows={2}
                    placeholder="List any allergies or important medical information..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Professional Information */}
          {shouldShowField('professional') && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Briefcase className="h-5 w-5" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workplace">Where do you work?</Label>
                  <Input
                    id="workplace"
                    {...register("workplace")}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Musical Information */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Music className="h-5 w-5" />
                Musical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="voice_part">Voice Part</Label>
                  <Select
                    value={watch("voice_part") || ""}
                    onValueChange={(value) => setValue("voice_part", value as any)}
                    disabled={!isEditing}
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
                    checked={canDance}
                    onCheckedChange={(checked) => setValue("can_dance", checked as boolean)}
                    disabled={!isEditing}
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
                        disabled={!isEditing}
                      />
                      <Label htmlFor={instrument} className="text-sm">
                        {instrument}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedInstruments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedInstruments.map((instrument) => (
                      <Badge key={instrument} variant="secondary">
                        <Music2 className="h-3 w-3 mr-1" />
                        {instrument}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <DollarSign className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="preferred_payment_method">Preferred Payment Method</Label>
                <Select
                  value={watch("preferred_payment_method") || ""}
                  onValueChange={(value) => setValue("preferred_payment_method", value as any)}
                  disabled={!isEditing}
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

          {/* Glee Club Membership */}
          {shouldShowField('academic') && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Music className="h-5 w-5" />
                  Glee Club Membership
                </CardTitle>
                <CardDescription>Alumni and mentorship information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mentor_opt_in"
                      checked={watch("mentor_opt_in")}
                      onCheckedChange={(checked) => setValue("mentor_opt_in", checked as boolean)}
                      disabled={!isEditing}
                    />
                    <Label htmlFor="mentor_opt_in">Opt-in to Mentorship Program</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="reunion_rsvp"
                      checked={watch("reunion_rsvp")}
                      onCheckedChange={(checked) => setValue("reunion_rsvp", checked as boolean)}
                      disabled={!isEditing}
                    />
                    <Label htmlFor="reunion_rsvp">RSVP for Next Reunion</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Social Media */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Globe className="h-5 w-5" />
                Social Media Links
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  {...register("instagram")}
                  disabled={!isEditing}
                  className="mt-1"
                  placeholder="@username"
                />
              </div>
              <div>
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4" />
                  Twitter
                </Label>
                <Input
                  id="twitter"
                  {...register("twitter")}
                  disabled={!isEditing}
                  className="mt-1"
                  placeholder="@username"
                />
              </div>
              <div>
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  {...register("facebook")}
                  disabled={!isEditing}
                  className="mt-1"
                  placeholder="Facebook profile URL"
                />
              </div>
              <div>
                <Label htmlFor="youtube" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube
                </Label>
                <Input
                  id="youtube"
                  {...register("youtube")}
                  disabled={!isEditing}
                  className="mt-1"
                  placeholder="YouTube channel URL"
                />
              </div>
            </CardContent>
          </Card>

          {isEditing && (
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                disabled={loading}
                onClick={async () => {
                  console.log("🎯 Save Profile button clicked! isEditing:", isEditing, "loading:", loading);
                  console.log("🎯 Form errors before submit:", errors);
                  console.log("🎯 Current form values:", watch());
                  
                  // Trigger form submission manually
                  const result = await handleSubmit(onSubmit)();
                  console.log("🎯 Form submission result:", result);
                }}
              >
                {loading ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          )}
        </form>
        
        {/* Avatar Crop Dialog */}
        <AvatarCropDialog
          isOpen={isCropDialogOpen}
          onClose={handleCropDialogClose}
          imageSrc={selectedImageForCrop}
          onCropComplete={handleCroppedImageUpload}
          isUploading={isAvatarUploading}
        />
      </div>
    </UniversalLayout>
  );
};

export default Profile;