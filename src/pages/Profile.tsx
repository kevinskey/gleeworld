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
import { Switch } from "@/components/ui/switch";
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
  Shield,
  ChevronRight,
  Lock
} from "lucide-react";
import { AvatarCropDialog } from "@/components/shared/AvatarCropDialog";
import { RequestChangeDialog } from "@/components/profile/RequestChangeDialog";
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
  voice_part: z.enum(["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2", "DOC"]).optional().or(z.literal("")),
  can_dance: z.boolean().default(false),
  preferred_payment_method: z.enum(["zelle", "cashapp", "venmo", "apple_pay", "check"]).optional().or(z.literal("")),
  
  // Appearance & Identity fields
  shoe_size: z.string().optional(),
  hair_color: z.string().optional(),
  has_tattoos: z.boolean().default(false),
  visible_piercings: z.boolean().default(false),
  
  // Academic & Personal fields
  academic_major: z.string().optional(),
  pronouns: z.string().optional(),
  class_year: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "number" && !Number.isFinite(val)) return undefined;
    const n = typeof val === "string" ? Number(val) : val;
    return Number.isFinite(n) ? n : undefined;
  }, z.number().min(1900).max(2050).optional()),
  
  
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
  
  // Wardrobe measurements
  bust_measurement: z.string().optional(),
  waist_measurement: z.string().optional(),
  hips_measurement: z.string().optional(),
  height_measurement: z.string().optional(),
  
  // Wardrobe sizes
  dress_size: z.string().optional(),
  
  // Classification
  classification: z.string().optional(),
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
  { value: "DOC", label: "Director of Choirs (DOC)" },
];

const Profile = () => {
  const { user } = useAuth();
  const { profile: userRole } = useUserRole();
  const isAdmin = Boolean(userRole?.is_admin || userRole?.is_super_admin);
  const isWardrobeManager = Boolean(userRole?.is_admin || userRole?.is_super_admin);
  const { toast } = useToast();
  const { profile, loading: profileLoading, updateAvatarUrl } = useProfile();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] = useState<string[]>([]);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<string>("");
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestField, setRequestField] = useState<{ label: string; currentValue?: string | number | null } | null>(null);
  const [phoneDisplay, setPhoneDisplay] = useState('');
  
const openRequestChange = (label: string, currentValue?: string | number | null) => {
    setRequestField({ label, currentValue });
    setRequestDialogOpen(true);
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10);
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneDisplay(formatted);
    setValue('phone_number', formatted, { shouldValidate: true, shouldDirty: true });
  };

  // Basic SEO for Profile page
  useEffect(() => {
    document.title = 'Profile — GleeWorld';
    const desc = 'View your profile, upload your avatar, and manage personal information.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      bio: "",
      website_url: "",
      phone_number: "",
      student_number: "",
      workplace: "",
      school_address: "",
      home_address: "",
      voice_part: "",
      can_dance: false,
      preferred_payment_method: "",
      shoe_size: "",
      hair_color: "",
      has_tattoos: false,
      visible_piercings: false,
      academic_major: "",
      pronouns: "",
      class_year: undefined,
      emergency_contact: "",
      allergies: "",
      parent_guardian_contact: "",
      join_date: "",
      mentor_opt_in: false,
      reunion_rsvp: false,
      instagram: "",
      twitter: "",
      facebook: "",
      youtube: "",
      bust_measurement: "",
      waist_measurement: "",
      hips_measurement: "",
      height_measurement: "",
      dress_size: "",
      classification: "",
    },
  });

  const canDance = watch("can_dance");

  useEffect(() => {
    if (profile) {
      const savedPhoneNumber = profile.phone_number || '';

      setValue("first_name", profile.first_name || "");
      setValue("middle_name", profile.middle_name || "");
      setValue("last_name", profile.last_name || "");
      setValue("bio", profile.bio || "");
      setValue("website_url", profile.website_url || "");
      setValue("phone_number", savedPhoneNumber);
      setValue("student_number", profile.student_number || "");
      setValue("workplace", profile.workplace || "");
      setValue("school_address", profile.school_address || "");
      setValue("home_address", profile.home_address || "");
      setValue("voice_part", (profile.voice_part as any) || "");
      setValue("can_dance", profile.can_dance || false);
      setValue("preferred_payment_method", (profile.preferred_payment_method as any) || "");
      setValue("shoe_size", profile.shoe_size || "");
      setValue("hair_color", profile.hair_color || "");
      setValue("has_tattoos", profile.has_tattoos || false);
      setValue("visible_piercings", profile.visible_piercings || false);
      setValue("academic_major", profile.academic_major || "");
      setValue("pronouns", profile.pronouns || "");
      setValue("class_year", profile.class_year || undefined);
      setValue("emergency_contact", profile.emergency_contact || "");
      setValue("allergies", profile.allergies || "");
      setValue("parent_guardian_contact", profile.parent_guardian_contact || "");
      setValue("join_date", profile.join_date || "");
      setValue("mentor_opt_in", profile.mentor_opt_in || false);
      setValue("reunion_rsvp", profile.reunion_rsvp || false);
      setValue("instagram", (profile as any).instagram || "");
      setValue("twitter", (profile as any).twitter || "");
      setValue("facebook", (profile as any).facebook || "");
      setValue("youtube", (profile as any).youtube || "");
      setValue("bust_measurement", profile.bust_measurement?.toString() || "");
      setValue("waist_measurement", profile.waist_measurement?.toString() || "");
      setValue("hips_measurement", profile.hips_measurement?.toString() || "");
      setValue("height_measurement", profile.height_measurement?.toString() || "");
      setValue("dress_size", profile.dress_size || "");
      setValue("classification", profile.classification || "");
      setPhoneDisplay(savedPhoneNumber);

      if (profile.instruments_played) {
        setSelectedInstruments(profile.instruments_played);
      }
      if (profile.dietary_restrictions) {
        setSelectedDietaryRestrictions(profile.dietary_restrictions);
      }
    }
  }, [profile, setValue]);

  const handleInstrumentChange = (instrument: string, checked: boolean) => {
    if (checked) {
      setSelectedInstruments([...selectedInstruments, instrument]);
    } else {
      setSelectedInstruments(selectedInstruments.filter((i) => i !== instrument));
    }
  };

  const handleDietaryRestrictionChange = (restriction: string, checked: boolean) => {
    if (checked) {
      setSelectedDietaryRestrictions([...selectedDietaryRestrictions, restriction]);
    } else {
      setSelectedDietaryRestrictions(selectedDietaryRestrictions.filter((r) => r !== restriction));
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) {
      return;
    }

    setLoading(true);

    const normalizedPhoneNumber = formatPhoneNumber(data.phone_number || '');
    const normalizedJoinDate = data.join_date?.trim() ? data.join_date : null;
    const normalizedVoicePart = data.voice_part === 'DOC' ? null : data.voice_part || null;
    const parseOptionalNumber = (value?: string) => {
      if (!value?.trim()) return null;
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const updatePayload = {
      first_name: data.first_name,
      middle_name: data.middle_name,
      last_name: data.last_name,
      full_name: `${data.first_name} ${data.middle_name ? data.middle_name + ' ' : ''}${data.last_name}`.trim(),
      bio: data.bio,
      website_url: data.website_url,
      phone_number: normalizedPhoneNumber || null,
      phone: normalizedPhoneNumber || null,
      student_number: data.student_number,
      workplace: data.workplace,
      school_address: data.school_address,
      home_address: data.home_address,
      voice_part: normalizedVoicePart,
      can_dance: data.can_dance,
      preferred_payment_method: data.preferred_payment_method || null,
      shoe_size: data.shoe_size,
      hair_color: data.hair_color,
      has_tattoos: data.has_tattoos,
      visible_piercings: data.visible_piercings,
      academic_major: data.academic_major,
      pronouns: data.pronouns,
      class_year: data.class_year,
      emergency_contact: data.emergency_contact,
      allergies: data.allergies,
      parent_guardian_contact: data.parent_guardian_contact,
      join_date: normalizedJoinDate,
      mentor_opt_in: data.mentor_opt_in,
      reunion_rsvp: data.reunion_rsvp,
      instruments_played: selectedInstruments,
      dietary_restrictions: selectedDietaryRestrictions,
      instagram: data.instagram,
      twitter: data.twitter,
      facebook: data.facebook,
      youtube: data.youtube,
      bust_measurement: parseOptionalNumber(data.bust_measurement),
      waist_measurement: parseOptionalNumber(data.waist_measurement),
      hips_measurement: parseOptionalNumber(data.hips_measurement),
      height_measurement: parseOptionalNumber(data.height_measurement),
      dress_size: data.dress_size,
      classification: data.classification,
      ...(data.voice_part === 'DOC' ? { music_role: 'DOC' } : {}),
    };

    try {
      const { error } = await supabase
        .from("gw_profiles")
        .upsert({
          user_id: user.id,
          email: user.email ?? null,
          ...updatePayload,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      setPhoneDisplay(normalizedPhoneNumber);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const shouldShowField = (fieldType: string) => {
    const role = userRole?.role || 'user';
    
    switch (fieldType) {
      case 'basic':
        return true;
      case 'academic':
        return role !== 'fan';
      case 'wardrobe':
        return ['user', 'admin', 'super-admin'].includes(role);
      case 'health':
        return ['user', 'admin', 'super-admin'].includes(role);
      case 'professional':
        return ['admin', 'super-admin'].includes(role);
      case 'social':
        return true;
      default:
        return true;
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

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

        processedFile = conversionResult.file!;
        
        toast({
          title: "HEIC Converted",
          description: "Successfully converted to JPEG format",
        });
      }

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

      const success = await updateAvatarUrl(data.publicUrl);
      
      if (success) {
        setIsCropDialogOpen(false);
        
        if (selectedImageForCrop) {
          URL.revokeObjectURL(selectedImageForCrop);
          setSelectedImageForCrop("");
        }

        toast({
          title: "Success",
          description: "Avatar updated successfully",
        });

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
    if (selectedImageForCrop) {
      URL.revokeObjectURL(selectedImageForCrop);
      setSelectedImageForCrop("");
    }
  };

  const getInitials = () => {
    const firstName = watch("first_name") || profile?.first_name || '';
    const lastName = watch("last_name") || profile?.last_name || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';
  };

  const displayName = `${watch("first_name") || profile?.first_name || ''} ${watch("last_name") || profile?.last_name || ''}`.trim() || 'User';
  const firstName = watch("first_name") || profile?.first_name || displayName.split(' ')[0] || '';

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const getVoicePartLabel = (value?: string) => {
    const part = voiceParts.find(p => p.value === value);
    return part ? part.label : 'Not set';
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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-4 md:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                My Profile
              </h1>
              <p className="text-muted-foreground">Manage your personal information and preferences</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground hidden sm:inline">{displayName}</span>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "outline" : "default"}
                size="sm"
              >
                {isEditing ? (
                  "Cancel"
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Left Column */}
              <div className="space-y-4">
                {/* Profile Overview Card */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">Profile Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <Avatar className="h-28 w-28 border-4 border-border shadow-lg">
                          <AvatarImage src={profile?.avatar_url || ""} className="object-cover" />
                          <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                            {getInitials()}
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
                      
                      {/* Name */}
                      <h3 className="mt-3 text-xl font-bold text-foreground">{displayName}</h3>
                      {firstName && firstName !== displayName && (
                        <p className="text-sm text-muted-foreground">{firstName}</p>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground min-w-[50px]">email</span>
                        <span className="text-foreground">{user?.email || 'Not set'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground min-w-[50px]">Phone</span>
                        {isEditing ? (
                          <Input
                            type="tel"
                            value={phoneDisplay}
                            onChange={handlePhoneChange}
                            className="h-8 text-sm"
                            placeholder="(555) 123-4567"
                            maxLength={14}
                          />
                        ) : (
                          <span className="text-foreground">{profile?.phone_number || 'Not set'}</span>
                        )}
                      </div>
                    </div>

                    {/* Voice Part & Status */}
                    <div className="space-y-3 pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Voice Part</span>
                        {isEditing && isAdmin ? (
                          <Select value={watch("voice_part") || ""} onValueChange={(value) => setValue("voice_part", value as any)}>
                            <SelectTrigger className="w-20 h-8 text-sm">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {voiceParts.map((part) => (
                                <SelectItem key={part.value} value={part.value}>
                                  {part.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm font-medium">{getVoicePartLabel(watch("voice_part"))}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <Select value={watch("classification") || ""} onValueChange={(value) => setValue("classification", value)}>
                              <SelectTrigger className="w-28 h-8 text-sm">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {["Freshman", "Sophomore", "Junior", "Senior"].map((c) => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                {watch("classification") || 'Not set'}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Join Date</span>
                        {isEditing && isAdmin ? (
                          <Input
                            type="date"
                            {...register("join_date")}
                            className="w-32 h-8 text-sm"
                          />
                        ) : (
                          <span className="text-sm">{formatDate(watch("join_date"))}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Personal Info */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">Personal Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="first_name" className="text-xs">First name</Label>
                        <Input id="first_name" disabled={!isEditing} {...register("first_name")} className="h-9" />
                      </div>
                      <div>
                        <Label htmlFor="last_name" className="text-xs">Last name</Label>
                        <Input id="last_name" disabled={!isEditing} {...register("last_name")} className="h-9" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="middle_name" className="text-xs">Middle name</Label>
                      <Input id="middle_name" disabled={!isEditing} {...register("middle_name")} className="h-9" />
                    </div>
                    <div>
                      <Label htmlFor="pronouns" className="text-xs">Pronouns</Label>
                      <Select value={watch("pronouns") || ""} onValueChange={(v) => setValue("pronouns", v)} disabled={!isEditing}>
                        <SelectTrigger id="pronouns" className="h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {pronounOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bio" className="text-xs">Bio</Label>
                      <Textarea id="bio" disabled={!isEditing} {...register("bio")} className="min-h-[80px] text-sm" placeholder="Tell us about yourself..." />
                    </div>
                    <div>
                      <Label htmlFor="website_url" className="text-xs">Website</Label>
                      <Input id="website_url" disabled={!isEditing} {...register("website_url")} className="h-9" placeholder="https://" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Middle Column */}
              <div className="space-y-4">
                {/* Academic & Member Info */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">Academic & Member</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="class_year" className="text-xs">Class year</Label>
                        <Input id="class_year" type="number" disabled={!isEditing} {...register("class_year")} className="h-9" placeholder="2026" />
                      </div>
                      <div>
                        <Label htmlFor="student_number" className="text-xs">Student #</Label>
                        <Input id="student_number" disabled={!isEditing} {...register("student_number")} className="h-9" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="academic_major" className="text-xs">Major</Label>
                      <Input id="academic_major" disabled={!isEditing} {...register("academic_major")} className="h-9" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="can_dance" className="text-xs">Can dance</Label>
                      <Switch
                        id="can_dance"
                        checked={canDance}
                        onCheckedChange={(v) => setValue("can_dance", v)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Instruments played</Label>
                      <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto border rounded-md p-2 mt-1">
                        {instruments.map((inst) => (
                          <label key={inst} className="flex items-center gap-1 text-xs cursor-pointer">
                            <Checkbox
                              checked={selectedInstruments.includes(inst)}
                              onCheckedChange={(c) => handleInstrumentChange(inst, !!c)}
                              disabled={!isEditing}
                            />
                            {inst}
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Wardrobe */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">Wardrobe</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">T-shirt Size</span>
                        {isEditing ? (
                          <Select value={watch("dress_size") || ""} onValueChange={(value) => setValue("dress_size", value)}>
                            <SelectTrigger className="w-20 h-8 text-sm">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {dressSizes.map((size) => (
                                <SelectItem key={size} value={size}>{size}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm font-medium text-foreground">{watch("dress_size") || '—'}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Blazer/Dress Size</span>
                        <span className="text-sm font-medium text-foreground">{watch("dress_size") || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Shoe Size</span>
                        {isEditing ? (
                          <Select value={watch("shoe_size") || ""} onValueChange={(value) => setValue("shoe_size", value)}>
                            <SelectTrigger className="w-20 h-8 text-sm">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {shoeSizes.map((size) => (
                                <SelectItem key={size} value={size}>{size}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm font-medium text-foreground">{watch("shoe_size") || '—'}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Addresses */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">Addresses & Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="home_address" className="text-xs">Home address</Label>
                      <Input id="home_address" disabled={!isEditing} {...register("home_address")} className="h-9" />
                    </div>
                    <div>
                      <Label htmlFor="school_address" className="text-xs">School address</Label>
                      <Input id="school_address" disabled={!isEditing} {...register("school_address")} className="h-9" />
                    </div>
                    <div>
                      <Label htmlFor="workplace" className="text-xs">Workplace</Label>
                      <Input id="workplace" disabled={!isEditing} {...register("workplace")} className="h-9" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Health & Emergency */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">Health & Emergency</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="emergency_contact" className="text-xs">Emergency contact</Label>
                      <Input id="emergency_contact" disabled={!isEditing} {...register("emergency_contact")} className="h-9" placeholder="Name + phone" />
                    </div>
                    <div>
                      <Label htmlFor="parent_guardian_contact" className="text-xs">Parent/guardian contact</Label>
                      <Input id="parent_guardian_contact" disabled={!isEditing} {...register("parent_guardian_contact")} className="h-9" />
                    </div>
                    <div>
                      <Label htmlFor="allergies" className="text-xs">Allergies</Label>
                      <Textarea id="allergies" disabled={!isEditing} {...register("allergies")} className="min-h-[60px] text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Dietary restrictions</Label>
                      <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto border rounded-md p-2 mt-1">
                        {ALL_DIETARY_OPTIONS.map((opt) => (
                          <label key={opt} className="flex items-center gap-1 text-xs cursor-pointer">
                            <Checkbox
                              checked={selectedDietaryRestrictions.includes(opt)}
                              onCheckedChange={(c) => handleDietaryRestrictionChange(opt, !!c)}
                              disabled={!isEditing}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Social Media */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">Social Media</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="instagram" className="text-xs flex items-center gap-1"><Instagram className="h-3 w-3" />Instagram</Label>
                      <Input id="instagram" disabled={!isEditing} {...register("instagram")} className="h-9" placeholder="@username" />
                    </div>
                    <div>
                      <Label htmlFor="twitter" className="text-xs flex items-center gap-1"><Twitter className="h-3 w-3" />Twitter / X</Label>
                      <Input id="twitter" disabled={!isEditing} {...register("twitter")} className="h-9" placeholder="@username" />
                    </div>
                    <div>
                      <Label htmlFor="facebook" className="text-xs flex items-center gap-1"><Facebook className="h-3 w-3" />Facebook</Label>
                      <Input id="facebook" disabled={!isEditing} {...register("facebook")} className="h-9" />
                    </div>
                    <div>
                      <Label htmlFor="youtube" className="text-xs flex items-center gap-1"><Youtube className="h-3 w-3" />YouTube</Label>
                      <Input id="youtube" disabled={!isEditing} {...register("youtube")} className="h-9" />
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Preferences */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">Payment Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="preferred_payment_method" className="text-xs">Preferred payment method</Label>
                      <Select value={watch("preferred_payment_method") || ""} onValueChange={(v) => setValue("preferred_payment_method", v as any)} disabled={!isEditing}>
                        <SelectTrigger id="preferred_payment_method" className="h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Save Button */}
            {isEditing && (
              <div className="flex justify-end mt-6 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            )}
          </form>
        </div>
        
        {/* Avatar Crop Dialog */}
        <AvatarCropDialog
          isOpen={isCropDialogOpen}
          onClose={handleCropDialogClose}
          imageSrc={selectedImageForCrop}
          onCropComplete={handleCroppedImageUpload}
          isUploading={isAvatarUploading}
        />

        <RequestChangeDialog
          open={requestDialogOpen}
          onOpenChange={setRequestDialogOpen}
          fieldLabel={requestField?.label || "Profile field"}
          currentValue={requestField?.currentValue ?? ""}
          userEmail={user?.email || ""}
        />
      </div>
    </UniversalLayout>
  );
};

export default Profile;
