import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/hooks/useUsers";
import { ResetPasswordDialog } from "../ResetPasswordDialog";
import { ALL_DIETARY_OPTIONS } from "@/constants/dietaryOptions";
import { 
  X, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  User as UserIcon, 
  Shield,
  Calendar,
  Mail,
  Loader2,
  Save,
  Key,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Music,
  CreditCard,
  Globe,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Music2,
  DollarSign,
  Shirt,
  Heart,
  Home
} from "lucide-react";

interface UserDetailPanelProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  onUserDeleted: () => void;
}

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

export const UserDetailPanel = ({ 
  user, 
  isOpen, 
  onClose, 
  onUserUpdated, 
  onUserDeleted 
}: UserDetailPanelProps) => {
  const [editMode, setEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  // Form fields
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [voicePart, setVoicePart] = useState("");
  const [canDance, setCanDance] = useState(false);
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] = useState<string[]>([]);
  
  // Wardrobe & Identity fields
  const [dressSize, setDressSize] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [hasTattoos, setHasTattoos] = useState(false);
  const [visiblePiercings, setVisiblePiercings] = useState(false);
  
  // Academic & Personal fields
  const [academicMajor, setAcademicMajor] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [classYear, setClassYear] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  
  // Health & Safety fields
  const [emergencyContact, setEmergencyContact] = useState("");
  const [allergies, setAllergies] = useState("");
  const [parentGuardianContact, setParentGuardianContact] = useState("");
  
  // Glee Club specific fields
  const [joinDate, setJoinDate] = useState("");
  const [mentorOptIn, setMentorOptIn] = useState(false);
  const [reunionRsvp, setReunionRsvp] = useState(false);
  
  // Social media
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [facebook, setFacebook] = useState("");
  const [youtube, setYoutube] = useState("");
  
  const { toast } = useToast();

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      // Get comprehensive profile data
      const { data: profileData } = await supabase
        .from("gw_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setFullName(profileData.full_name || "");
        setRole(profileData.role || "user");
        setBio(profileData.bio || "");
        setWebsiteUrl(profileData.website_url || "");
        setPhoneNumber(profileData.phone_number || "");
        setStudentNumber(profileData.student_number || "");
        setWorkplace(profileData.workplace || "");
        setSchoolAddress(profileData.school_address || "");
        setHomeAddress(profileData.home_address || "");
        setVoicePart((profileData.voice_part as string) || "");
        setCanDance(profileData.can_dance || false);
        setPreferredPaymentMethod((profileData.preferred_payment_method as string) || "");
        setSelectedInstruments(profileData.instruments_played || []);
        setSelectedDietaryRestrictions(profileData.dietary_restrictions || []);
        
        // Wardrobe & Identity
        setDressSize(profileData.dress_size || "");
        setShoeSize(profileData.shoe_size || "");
        setHairColor(profileData.hair_color || "");
        setHasTattoos(profileData.has_tattoos || false);
        setVisiblePiercings(profileData.visible_piercings || false);
        
        // Academic & Personal
        setAcademicMajor(profileData.academic_major || "");
        setPronouns(profileData.pronouns || "");
        setClassYear(profileData.class_year ? profileData.class_year.toString() : "");
        setGraduationYear(""); // Will be set if field exists
        
        // Health & Safety
        setEmergencyContact(profileData.emergency_contact || "");
        setAllergies(profileData.allergies || "");
        setParentGuardianContact(profileData.parent_guardian_contact || "");
        
        // Glee Club specific
        setJoinDate(""); // Will be set if field exists
        setMentorOptIn(false); // Will be set if field exists
        setReunionRsvp(false); // Will be set if field exists
        
        // Social media - handle as JSON object
        const socialLinks = (profileData.social_media_links as any) || {};
        setInstagram(socialLinks.instagram || "");
        setTwitter(socialLinks.twitter || "");
        setFacebook(socialLinks.facebook || "");
        setYoutube(socialLinks.youtube || "");
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  if (!isOpen || !user) return null;

  const expectedDeleteText = `DELETE ${user.email}`;
  const isConfirmValid = confirmText === expectedDeleteText;

  const getRoleIcon = (userRole: string) => {
    switch (userRole) {
      case 'super-admin':
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (userRole: string) => {
    switch (userRole) {
      case 'super-admin': return 'destructive';
      case 'admin': return 'default';
      case 'alumnae': return 'secondary';
      default: return 'outline';
    }
  };

  const handleEditStart = () => {
    setEditMode(true);
  };

  const handleEditCancel = () => {
    setEditMode(false);
    // Reload user data to reset form
    loadUserProfile();
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

  const handleEditSave = async () => {
    if (!fullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const socialMediaLinks = {
        instagram,
        twitter,
        facebook,
        youtube,
      };

      // Update gw_profiles table with comprehensive data
      const { error: profileError } = await supabase
        .from('gw_profiles')
        .update({
          full_name: fullName.trim(),
          role: role,
          bio: bio,
          website_url: websiteUrl,
          phone_number: phoneNumber,
          student_number: studentNumber,
          workplace: workplace,
          school_address: schoolAddress,
          home_address: homeAddress,
          voice_part: voicePart === "" ? null : (voicePart as "S1" | "S2" | "A1" | "A2" | "T1" | "T2" | "B1" | "B2"),
          can_dance: canDance,
          preferred_payment_method: preferredPaymentMethod === "" ? null : (preferredPaymentMethod as "zelle" | "cashapp" | "venmo" | "apple_pay" | "check"),
          instruments_played: selectedInstruments,
          social_media_links: socialMediaLinks,
          
          // Wardrobe & Identity fields
          dress_size: dressSize,
          shoe_size: shoeSize,
          hair_color: hairColor,
          has_tattoos: hasTattoos,
          visible_piercings: visiblePiercings,
          
          // Academic & Personal fields
          academic_major: academicMajor,
          pronouns: pronouns,
          class_year: classYear === "" ? null : Number(classYear),
          graduation_year: graduationYear === "" ? null : Number(graduationYear),
          
          // Health & Safety fields
          emergency_contact: emergencyContact,
          dietary_restrictions: selectedDietaryRestrictions,
          allergies: allergies,
          parent_guardian_contact: parentGuardianContact,
          
          // Glee Club specific fields
          join_date: joinDate,
          mentor_opt_in: mentorOptIn,
          reunion_rsvp: reunionRsvp,
          
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (profileError) {
        throw new Error(`Failed to update user profile: ${profileError.message}`);
      }

      // Also sync with gw_profiles table to keep data consistent
      const { error: gwError } = await supabase
        .from("gw_profiles")
        .update({
          full_name: fullName.trim(),
          first_name: fullName.trim().split(' ')[0],
          last_name: fullName.trim().split(' ').slice(1).join(' ') || null,
          bio: bio,
          website_url: websiteUrl,
          phone_number: phoneNumber,
          student_number: studentNumber,
          workplace: workplace,
          school_address: schoolAddress,
          home_address: homeAddress,
          voice_part: voicePart === "" ? null : (voicePart as "S1" | "S2" | "A1" | "A2" | "T1" | "T2" | "B1" | "B2"),
          can_dance: canDance,
          preferred_payment_method: preferredPaymentMethod === "" ? null : (preferredPaymentMethod as "zelle" | "cashapp" | "venmo" | "apple_pay" | "check"),
          instruments_played: selectedInstruments,
          social_media_links: socialMediaLinks,
          
          // New fields
          dress_size: dressSize,
          shoe_size: shoeSize,
          hair_color: hairColor,
          has_tattoos: hasTattoos,
          visible_piercings: visiblePiercings,
          academic_major: academicMajor,
          pronouns: pronouns,
          class_year: classYear === "" ? null : Number(classYear),
          graduation_year: graduationYear === "" ? null : Number(graduationYear),
          emergency_contact: emergencyContact,
          dietary_restrictions: selectedDietaryRestrictions,
          allergies: allergies,
          parent_guardian_contact: parentGuardianContact,
          join_date: joinDate,
          mentor_opt_in: mentorOptIn,
          reunion_rsvp: reunionRsvp,
          
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (gwError) {
        console.warn("Error syncing with gw_profiles:", gwError);
        // Don't throw error since main profiles update succeeded
      }

      toast({
        title: "User Profile Updated",
        description: `${user.email}'s profile has been updated successfully.`,
      });

      setEditMode(false);
      onUserUpdated();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('delete_user_and_data', {
        target_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: "User Deleted",
        description: `${user.email} has been permanently deleted from the system.`,
      });

      setDeleteMode(false);
      setConfirmText("");
      onUserDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">User Details</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-6 space-y-6">
              {/* User Profile Section */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-brand-200/50">
                      {user.avatar_url && (
                        <AvatarImage 
                          src={user.avatar_url} 
                          alt={user.full_name || user.email || "User"} 
                        />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 text-lg">
                        {user.full_name ? 
                          user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() :
                          <UserIcon className="h-8 w-8" />
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{user.full_name || 'No name provided'}</h3>
                      <p className="text-gray-600">{user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {getRoleIcon(user.role)}
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {editMode ? (
                  <CardContent className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        Basic Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editFullName">Full Name *</Label>
                          <Input
                            id="editFullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter full name"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editRole">Role *</Label>
                          <Select value={role} onValueChange={setRole} disabled={loading}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="alumna">Alumna</SelectItem>
                              <SelectItem value="fan">Fan</SelectItem>
                              <SelectItem value="executive">Executive</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super-admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="editBio">Bio</Label>
                          <Textarea
                            id="editBio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Enter bio"
                            disabled={loading}
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editPronouns">Pronouns</Label>
                          <Select value={pronouns} onValueChange={setPronouns} disabled={loading}>
                            <SelectTrigger>
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
                        <div className="space-y-2">
                          <Label htmlFor="editWebsite">Website</Label>
                          <Input
                            id="editWebsite"
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            placeholder="https://example.com"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Contact Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editPhone">Phone Number</Label>
                          <Input
                            id="editPhone"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="(555) 123-4567"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editWorkplace">Workplace</Label>
                          <Input
                            id="editWorkplace"
                            value={workplace}
                            onChange={(e) => setWorkplace(e.target.value)}
                            placeholder="Company/Organization"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editSchoolAddress">School Address</Label>
                          <Input
                            id="editSchoolAddress"
                            value={schoolAddress}
                            onChange={(e) => setSchoolAddress(e.target.value)}
                            placeholder="School address"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editHomeAddress">Home Address</Label>
                          <Input
                            id="editHomeAddress"
                            value={homeAddress}
                            onChange={(e) => setHomeAddress(e.target.value)}
                            placeholder="Home address"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Academic Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editMajor">Academic Major</Label>
                          <Input
                            id="editMajor"
                            value={academicMajor}
                            onChange={(e) => setAcademicMajor(e.target.value)}
                            placeholder="Major field of study"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editStudentNumber">Student Number</Label>
                          <Input
                            id="editStudentNumber"
                            value={studentNumber}
                            onChange={(e) => setStudentNumber(e.target.value)}
                            placeholder="Student ID"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editClassYear">Class Year</Label>
                          <Input
                            id="editClassYear"
                            type="number"
                            value={classYear}
                            onChange={(e) => setClassYear(e.target.value)}
                            placeholder="2024"
                            min="1900"
                            max="2050"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editGraduationYear">Graduation Year</Label>
                          <Input
                            id="editGraduationYear"
                            type="number"
                            value={graduationYear}
                            onChange={(e) => setGraduationYear(e.target.value)}
                            placeholder="2024"
                            min="1900"
                            max="2050"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editJoinDate">Glee Club Join Date</Label>
                          <Input
                            id="editJoinDate"
                            type="date"
                            value={joinDate}
                            onChange={(e) => setJoinDate(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Musical Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        <Music className="h-4 w-4" />
                        Musical Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editVoicePart">Voice Part</Label>
                          <Select value={voicePart} onValueChange={setVoicePart} disabled={loading}>
                            <SelectTrigger>
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
                        <div className="space-y-2">
                          <Label htmlFor="editPaymentMethod">Preferred Payment Method</Label>
                          <Select value={preferredPaymentMethod} onValueChange={setPreferredPaymentMethod} disabled={loading}>
                            <SelectTrigger>
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
                        <div className="space-y-2 md:col-span-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="editCanDance"
                              checked={canDance}
                              onCheckedChange={(checked) => setCanDance(checked as boolean)}
                              disabled={loading}
                            />
                            <Label htmlFor="editCanDance">Can Dance</Label>
                          </div>
                        </div>
                      </div>

                      {/* Instruments */}
                      <div className="space-y-2">
                        <Label>Instruments Played</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                          {instruments.map((instrument) => (
                            <div key={instrument} className="flex items-center space-x-2">
                              <Checkbox
                                id={`instrument_${instrument}`}
                                checked={selectedInstruments.includes(instrument)}
                                onCheckedChange={(checked) =>
                                  handleInstrumentChange(instrument, checked as boolean)
                                }
                                disabled={loading}
                              />
                              <Label htmlFor={`instrument_${instrument}`} className="text-xs">
                                {instrument}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Wardrobe & Wellness */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        <Shirt className="h-4 w-4" />
                        Wardrobe & Wellness
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editDressSize">Dress/Top Size</Label>
                          <Select value={dressSize} onValueChange={setDressSize} disabled={loading}>
                            <SelectTrigger>
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
                        <div className="space-y-2">
                          <Label htmlFor="editShoeSize">Shoe Size</Label>
                          <Select value={shoeSize} onValueChange={setShoeSize} disabled={loading}>
                            <SelectTrigger>
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
                        <div className="space-y-2">
                          <Label htmlFor="editHairColor">Hair Color</Label>
                          <Input
                            id="editHairColor"
                            value={hairColor}
                            onChange={(e) => setHairColor(e.target.value)}
                            placeholder="e.g., Brown, Black, Blonde"
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="editHasTattoos"
                            checked={hasTattoos}
                            onCheckedChange={(checked) => setHasTattoos(checked as boolean)}
                            disabled={loading}
                          />
                          <Label htmlFor="editHasTattoos">Has Tattoos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="editVisiblePiercings"
                            checked={visiblePiercings}
                            onCheckedChange={(checked) => setVisiblePiercings(checked as boolean)}
                            disabled={loading}
                          />
                          <Label htmlFor="editVisiblePiercings">Has Visible Piercings</Label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Health & Safety */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Health & Safety
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editEmergencyContact">Emergency Contact</Label>
                          <Input
                            id="editEmergencyContact"
                            value={emergencyContact}
                            onChange={(e) => setEmergencyContact(e.target.value)}
                            placeholder="Name and phone number"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editParentGuardianContact">Parent/Guardian Contact</Label>
                          <Input
                            id="editParentGuardianContact"
                            value={parentGuardianContact}
                            onChange={(e) => setParentGuardianContact(e.target.value)}
                            placeholder="If applicable"
                            disabled={loading}
                          />
                        </div>
                      </div>

                      {/* Dietary Restrictions */}
                      <div className="space-y-2">
                        <Label>Dietary Restrictions</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                          {ALL_DIETARY_OPTIONS.map((restriction) => (
                            <div key={restriction} className="flex items-center space-x-2">
                              <Checkbox
                                id={`dietary_${restriction}`}
                                checked={selectedDietaryRestrictions.includes(restriction)}
                                onCheckedChange={(checked) =>
                                  handleDietaryRestrictionChange(restriction, checked as boolean)
                                }
                                disabled={loading}
                              />
                              <Label htmlFor={`dietary_${restriction}`} className="text-xs">
                                {restriction}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editAllergies">Allergies & Medical Notes</Label>
                        <Textarea
                          id="editAllergies"
                          value={allergies}
                          onChange={(e) => setAllergies(e.target.value)}
                          placeholder="List any allergies or important medical information..."
                          disabled={loading}
                          rows={2}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Social Media */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Social Media
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editInstagram">Instagram</Label>
                          <Input
                            id="editInstagram"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                            placeholder="@username"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editTwitter">Twitter/X</Label>
                          <Input
                            id="editTwitter"
                            value={twitter}
                            onChange={(e) => setTwitter(e.target.value)}
                            placeholder="@username"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editFacebook">Facebook</Label>
                          <Input
                            id="editFacebook"
                            value={facebook}
                            onChange={(e) => setFacebook(e.target.value)}
                            placeholder="Profile URL"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editYoutube">YouTube</Label>
                          <Input
                            id="editYoutube"
                            value={youtube}
                            onChange={(e) => setYoutube(e.target.value)}
                            placeholder="Channel URL"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Glee Club Preferences */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        <Music2 className="h-4 w-4" />
                        Glee Club Preferences
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="editMentorOptIn"
                            checked={mentorOptIn}
                            onCheckedChange={(checked) => setMentorOptIn(checked as boolean)}
                            disabled={loading}
                          />
                          <Label htmlFor="editMentorOptIn">Mentor Program Opt-in</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="editReunionRsvp"
                            checked={reunionRsvp}
                            onCheckedChange={(checked) => setReunionRsvp(checked as boolean)}
                            disabled={loading}
                          />
                          <Label htmlFor="editReunionRsvp">Reunion RSVP</Label>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleEditCancel}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleEditSave}
                        disabled={loading || !fullName.trim()}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save All Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={handleEditStart}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowResetPassword(true)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setDeleteMode(true)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* User Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Email:</span>
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Created:</span>
                    <span>{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleIcon(user.role)}
                    <span className="text-gray-600">Role:</span>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                      {user.role}
                    </Badge>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Phone:</span>
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user.voice_part && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Voice Part:</span>
                      <span className="capitalize">{user.voice_part.replace('_', ' ')}</span>
                    </div>
                  )}
                  {user.class_year && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Class Year:</span>
                      <span>{user.class_year}</span>
                    </div>
                  )}
                  {user.status && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {user.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Dues Paid:</span>
                    <Badge variant={user.dues_paid ? "default" : "destructive"} className="text-xs">
                      {user.dues_paid ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {user.exec_board_role && (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Executive Role:</span>
                      <span className="capitalize">{user.exec_board_role.replace('_', ' ')}</span>
                    </div>
                  )}
                  {user.notes && (
                    <div className="space-y-1">
                      <span className="text-gray-600">Notes:</span>
                      <p className="text-sm bg-gray-50 p-2 rounded">{user.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delete Confirmation */}
              {deleteMode && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Delete User Account
                    </CardTitle>
                    <CardDescription>
                      This action cannot be undone. This will permanently delete the user account and all associated data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Warning:</strong> This will permanently delete user profile, contracts, payments, and all associated data.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="confirmDelete">
                        Type <code className="bg-gray-100 px-1 rounded text-red-600 font-mono text-xs">{expectedDeleteText}</code> to confirm
                      </Label>
                      <Input
                        id="confirmDelete"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={expectedDeleteText}
                        className={confirmText && !isConfirmValid ? "border-red-300" : ""}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeleteMode(false);
                          setConfirmText("");
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={!isConfirmValid || loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Permanently
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ResetPasswordDialog
        user={user}
        open={showResetPassword}
        onOpenChange={setShowResetPassword}
      />
    </>
  );
};