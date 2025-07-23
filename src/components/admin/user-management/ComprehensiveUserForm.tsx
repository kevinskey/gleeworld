import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/hooks/useUsers";
import { 
  AlertCircle, 
  Save, 
  UserPlus, 
  Loader2,
  User as UserIcon,
  Phone,
  MapPin,
  GraduationCap,
  Music,
  Shield,
  Heart,
  Share2,
  Palette
} from "lucide-react";

interface ComprehensiveUserFormProps {
  user?: User | null;
  mode: 'create' | 'edit';
  onSuccess: () => void;
  onCancel?: () => void;
}

export const ComprehensiveUserForm = ({ user, mode, onSuccess, onCancel }: ComprehensiveUserFormProps) => {
  // Basic Info
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("user");
  const [bio, setBio] = useState("");

  // Contact Information
  const [phoneNumber, setPhoneNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  
  // Addresses
  const [homeAddress, setHomeAddress] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [workplace, setWorkplace] = useState("");
  
  // Academic Information
  const [academicMajor, setAcademicMajor] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [classYear, setClassYear] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  
  // Musical Information
  const [voicePart, setVoicePart] = useState("");
  const [canDance, setCanDance] = useState(false);
  const [execBoardRole, setExecBoardRole] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  
  // Wardrobe & Identity
  const [dressSize, setDressSize] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [hasTattoos, setHasTattoos] = useState(false);
  const [visiblePiercings, setVisiblePiercings] = useState(false);
  
  // Health & Safety
  const [emergencyContact, setEmergencyContact] = useState("");
  const [allergies, setAllergies] = useState("");
  const [parentGuardianContact, setParentGuardianContact] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  
  // Payment & Preferences
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState("");
  
  // Social Media
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [facebook, setFacebook] = useState("");
  const [youtube, setYoutube] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const { toast } = useToast();

  const instrumentOptions = [
    "Piano", "Guitar", "Violin", "Drums", "Bass", "Saxophone", "Trumpet", 
    "Flute", "Clarinet", "Cello", "Harp", "Organ", "Ukulele", "Other"
  ];

  const dietaryOptions = [
    "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut Allergy", 
    "Shellfish Allergy", "Kosher", "Halal", "Other"
  ];

  // Initialize form data for edit mode
  useEffect(() => {
    if (mode === 'edit' && user) {
      setEmail(user.email || "");
      setFullName(user.full_name || "");
      setRole(user.role || "user");
      // Note: Extended fields would come from gw_profiles when editing
      // For now, we'll handle basic fields
    }
  }, [user, mode]);

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setRole("user");
    setBio("");
    setPhoneNumber("");
    setWebsiteUrl("");
    setHomeAddress("");
    setSchoolAddress("");
    setWorkplace("");
    setAcademicMajor("");
    setPronouns("");
    setClassYear("");
    setStudentNumber("");
    setVoicePart("");
    setCanDance(false);
    setExecBoardRole("");
    setSelectedInstruments([]);
    setDressSize("");
    setShoeSize("");
    setHairColor("");
    setHasTattoos(false);
    setVisiblePiercings(false);
    setEmergencyContact("");
    setAllergies("");
    setParentGuardianContact("");
    setDietaryRestrictions([]);
    setPreferredPaymentMethod("");
    setInstagram("");
    setTwitter("");
    setFacebook("");
    setYoutube("");
    setTempPassword("");
  };

  const validateForm = () => {
    if (mode === 'create' && !email.trim()) {
      toast({ title: "Validation Error", description: "Email is required", variant: "destructive" });
      return false;
    }
    if (!fullName.trim()) {
      toast({ title: "Validation Error", description: "Full name is required", variant: "destructive" });
      return false;
    }
    return true;
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
      setDietaryRestrictions([...dietaryRestrictions, restriction]);
    } else {
      setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
    }
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userData = {
        email: email.trim(),
        full_name: fullName.trim(),
        role: role,
        bio: bio.trim(),
        phone_number: phoneNumber.trim(),
        website_url: websiteUrl.trim(),
        home_address: homeAddress.trim(),
        school_address: schoolAddress.trim(),
        workplace: workplace.trim(),
        academic_major: academicMajor.trim(),
        pronouns: pronouns.trim(),
        class_year: classYear ? parseInt(classYear) : null,
        student_number: studentNumber.trim(),
        voice_part: voicePart,
        can_dance: canDance,
        exec_board_role: execBoardRole || null,
        instruments: selectedInstruments,
        dress_size: dressSize.trim(),
        shoe_size: shoeSize.trim(),
        hair_color: hairColor.trim(),
        has_tattoos: hasTattoos,
        visible_piercings: visiblePiercings,
        emergency_contact: emergencyContact.trim(),
        allergies: allergies.trim(),
        parent_guardian_contact: parentGuardianContact.trim(),
        dietary_restrictions: dietaryRestrictions,
        preferred_payment_method: preferredPaymentMethod,
        instagram: instagram.trim(),
        twitter: twitter.trim(),
        facebook: facebook.trim(),
        youtube: youtube.trim()
      };

      const { data, error } = await supabase.functions.invoke('import-users', {
        body: {
          users: [userData],
          source: 'comprehensive_manual'
        }
      });

      if (error) throw error;

      if (data.success > 0) {
        const newTempPassword = data.users?.[0]?.temp_password || "";
        setTempPassword(newTempPassword);
        
        toast({
          title: "User Created Successfully",
          description: `${email} has been added with complete profile information.`,
        });
        
        resetForm();
        onSuccess();
      } else if (data.errors && data.errors.length > 0) {
        toast({
          title: "Error Creating User",
          description: data.errors[0],
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      await handleCreateUser();
    }
    // Edit mode would be implemented similarly
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Complete User Profile
        </CardTitle>
        <CardDescription>
          Create a comprehensive user profile with all necessary information.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  disabled={isLoading || mode === 'edit'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={role} onValueChange={setRole} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="alumnae">Alumnae</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super-admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pronouns">Pronouns</Label>
                <Input
                  id="pronouns"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  placeholder="she/her, he/him, they/them"
                  disabled={isLoading}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(555) 123-4567"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="homeAddress">Home Address</Label>
                <Textarea
                  id="homeAddress"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="123 Main St, City, State, ZIP"
                  rows={2}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolAddress">School Address</Label>
                <Textarea
                  id="schoolAddress"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  placeholder="Dorm/Campus address"
                  rows={2}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workplace">Workplace</Label>
                <Input
                  id="workplace"
                  value={workplace}
                  onChange={(e) => setWorkplace(e.target.value)}
                  placeholder="Company/Organization name"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="academicMajor">Academic Major</Label>
                <Input
                  id="academicMajor"
                  value={academicMajor}
                  onChange={(e) => setAcademicMajor(e.target.value)}
                  placeholder="Music, Business, Biology"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classYear">Class Year</Label>
                <Input
                  id="classYear"
                  type="number"
                  value={classYear}
                  onChange={(e) => setClassYear(e.target.value)}
                  placeholder="2025"
                  min="1900"
                  max="2050"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentNumber">Student Number</Label>
                <Input
                  id="studentNumber"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="Student ID"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Musical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Music className="h-5 w-5" />
                Musical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voicePart">Voice Part</Label>
                  <Select value={voicePart} onValueChange={setVoicePart} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice part" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="S1">Soprano 1</SelectItem>
                      <SelectItem value="S2">Soprano 2</SelectItem>
                      <SelectItem value="A1">Alto 1</SelectItem>
                      <SelectItem value="A2">Alto 2</SelectItem>
                      <SelectItem value="T1">Tenor 1</SelectItem>
                      <SelectItem value="T2">Tenor 2</SelectItem>
                      <SelectItem value="B1">Bass 1</SelectItem>
                      <SelectItem value="B2">Bass 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="execBoardRole">Executive Board Position</Label>
                  <Select value={execBoardRole} onValueChange={setExecBoardRole} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="President">President</SelectItem>
                      <SelectItem value="Vice President">Vice President</SelectItem>
                      <SelectItem value="Secretary">Secretary</SelectItem>
                      <SelectItem value="Treasurer">Treasurer</SelectItem>
                      <SelectItem value="Historian">Historian</SelectItem>
                      <SelectItem value="Librarian">Librarian</SelectItem>
                      <SelectItem value="Chaplain">Chaplain</SelectItem>
                      <SelectItem value="Public Relations">Public Relations</SelectItem>
                      <SelectItem value="Social Chair">Social Chair</SelectItem>
                      <SelectItem value="Tour Manager">Tour Manager</SelectItem>
                      <SelectItem value="Section Leader">Section Leader</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canDance"
                  checked={canDance}
                  onCheckedChange={(checked) => setCanDance(!!checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="canDance">Can dance/choreography</Label>
              </div>

              <div className="space-y-2">
                <Label>Instruments</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {instrumentOptions.map((instrument) => (
                    <div key={instrument} className="flex items-center space-x-2">
                      <Checkbox
                        id={`instrument-${instrument}`}
                        checked={selectedInstruments.includes(instrument)}
                        onCheckedChange={(checked) => handleInstrumentChange(instrument, !!checked)}
                        disabled={isLoading}
                      />
                      <Label htmlFor={`instrument-${instrument}`} className="text-sm">
                        {instrument}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wardrobe & Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Wardrobe & Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dressSize">Dress Size</Label>
                <Input
                  id="dressSize"
                  value={dressSize}
                  onChange={(e) => setDressSize(e.target.value)}
                  placeholder="XS, S, M, L, XL, etc."
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shoeSize">Shoe Size</Label>
                <Input
                  id="shoeSize"
                  value={shoeSize}
                  onChange={(e) => setShoeSize(e.target.value)}
                  placeholder="7, 8.5, 9, etc."
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hairColor">Hair Color</Label>
                <Input
                  id="hairColor"
                  value={hairColor}
                  onChange={(e) => setHairColor(e.target.value)}
                  placeholder="Brown, Black, Blonde, etc."
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasTattoos"
                  checked={hasTattoos}
                  onCheckedChange={(checked) => setHasTattoos(!!checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="hasTattoos">Has tattoos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="visiblePiercings"
                  checked={visiblePiercings}
                  onCheckedChange={(checked) => setVisiblePiercings(!!checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="visiblePiercings">Visible piercings</Label>
              </div>
            </CardContent>
          </Card>

          {/* Health & Safety */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Health & Safety
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Name and phone number"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentGuardianContact">Parent/Guardian Contact</Label>
                <Input
                  id="parentGuardianContact"
                  value={parentGuardianContact}
                  onChange={(e) => setParentGuardianContact(e.target.value)}
                  placeholder="Name and phone number"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies & Medical Notes</Label>
                <Textarea
                  id="allergies"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Food allergies, medical conditions, medications..."
                  rows={2}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Dietary Restrictions</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {dietaryOptions.map((restriction) => (
                    <div key={restriction} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dietary-${restriction}`}
                        checked={dietaryRestrictions.includes(restriction)}
                        onCheckedChange={(checked) => handleDietaryRestrictionChange(restriction, !!checked)}
                        disabled={isLoading}
                      />
                      <Label htmlFor={`dietary-${restriction}`} className="text-sm">
                        {restriction}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Payment Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="preferredPaymentMethod">Preferred Payment Method</Label>
                <Select value={preferredPaymentMethod} onValueChange={setPreferredPaymentMethod} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None specified</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="cashapp">CashApp</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="apple_pay">Apple Pay</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Social Media
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@username"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter/X</Label>
                <Input
                  id="twitter"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@username"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="Profile URL or username"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <Input
                  id="youtube"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="Channel URL or username"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Temporary Password Display (Create Mode Only) */}
          {mode === 'create' && tempPassword && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Temporary Password:</strong> {tempPassword}
                <br />
                <span className="text-sm">Share this password securely with the user.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading} className="min-w-[120px]">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Complete Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};