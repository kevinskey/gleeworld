import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  DollarSign
} from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  bio: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal("")),
  phone_number: z.string().optional(),
  student_number: z.string().optional(),
  workplace: z.string().optional(),
  school_address: z.string().optional(),
  home_address: z.string().optional(),
  voice_part: z.enum(["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"]).optional(),
  can_dance: z.boolean().default(false),
  preferred_payment_method: z.enum(["zelle", "cashapp", "venmo", "apple_pay", "check"]).optional(),
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

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
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        // Set form values
        setValue("full_name", data.full_name || "");
        setValue("bio", data.bio || "");
        setValue("website_url", data.website_url || "");
        setValue("phone_number", data.phone_number || "");
        setValue("student_number", data.student_number || "");
        setValue("workplace", data.workplace || "");
        setValue("school_address", data.school_address || "");
        setValue("home_address", data.home_address || "");
        setValue("voice_part", data.voice_part);
        setValue("can_dance", data.can_dance || false);
        setValue("preferred_payment_method", data.preferred_payment_method);
        
        // Set social media links
        const socialLinks = (data.social_media_links as any) || {};
        setValue("instagram", socialLinks.instagram || "");
        setValue("twitter", socialLinks.twitter || "");
        setValue("facebook", socialLinks.facebook || "");
        setValue("youtube", socialLinks.youtube || "");

        // Set instruments and avatar
        setSelectedInstruments(data.instruments_played || []);
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    }
  };

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
        full_name: data.full_name,
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

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(data.publicUrl);
      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Profile</h1>
            <p className="text-white/80">
              {isEditing ? "Make changes to your profile information" : "Manage your personal information"}
            </p>
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

        {!isEditing && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-100 text-sm">
              <Edit className="h-4 w-4 inline mr-2" />
              Click "Edit Profile" above to make changes to your information
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Picture & Basic Info */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-white/20 shadow-lg">
                    <AvatarImage src={avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
                      <User className="h-12 w-12 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      {...register("full_name")}
                      disabled={!isEditing}
                      className="mt-1"
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
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
                  <p className="text-red-500 text-sm mt-1">{errors.website_url.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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

          {/* Professional Information */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
              <div>
                <Label htmlFor="student_number">Student Number</Label>
                <Input
                  id="student_number"
                  {...register("student_number")}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Musical Information */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Musical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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

          {/* Social Media */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
      </div>
    </UniversalLayout>
  );
};

export default Profile;