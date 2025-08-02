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
  ChevronLeft,
  ChevronRight,
  Check
} from "lucide-react";
import { ALL_DIETARY_OPTIONS } from "@/constants/dietaryOptions";

interface MobileUserFormProps {
  user?: User | null;
  mode: 'create' | 'edit';
  onSuccess: () => void;
  onCancel?: () => void;
}

type FormStep = 'basic' | 'contact' | 'academic' | 'musical' | 'preferences';

export const MobileUserForm = ({ user, mode, onSuccess, onCancel }: MobileUserFormProps) => {
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const { toast } = useToast();

  // Basic Info
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("user");
  const [pronouns, setPronouns] = useState("");
  const [bio, setBio] = useState("");

  // Contact Information
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  
  // Academic Information
  const [academicMajor, setAcademicMajor] = useState("");
  const [classYear, setClassYear] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  
  // Musical Information
  const [voicePart, setVoicePart] = useState("");
  const [canDance, setCanDance] = useState(false);
  const [execBoardRole, setExecBoardRole] = useState("");
  
  // Preferences
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");

  const steps: { key: FormStep; title: string; icon: any; description: string }[] = [
    { key: 'basic', title: 'Basic Info', icon: UserIcon, description: 'Name, email, and role' },
    { key: 'contact', title: 'Contact', icon: Phone, description: 'Phone and emergency contact' },
    { key: 'academic', title: 'Academic', icon: GraduationCap, description: 'School information' },
    { key: 'musical', title: 'Musical', icon: Music, description: 'Voice part and abilities' },
    { key: 'preferences', title: 'Preferences', icon: Heart, description: 'Dietary and health info' }
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Initialize form data for edit mode
  useEffect(() => {
    if (mode === 'edit' && user) {
      setEmail(user.email || "");
      setFullName(user.full_name || "");
      setRole(user.role || "user");
    }
  }, [user, mode]);

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setRole("user");
    setPronouns("");
    setBio("");
    setPhoneNumber("");
    setEmergencyContact("");
    setAcademicMajor("");
    setClassYear("");
    setStudentNumber("");
    setVoicePart("");
    setCanDance(false);
    setExecBoardRole("");
    setDietaryRestrictions([]);
    setAllergies("");
    setTempPassword("");
    setCurrentStep('basic');
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 'basic':
        if (mode === 'create' && !email.trim()) {
          toast({ title: "Email is required", variant: "destructive" });
          return false;
        }
        if (!fullName.trim()) {
          toast({ title: "Full name is required", variant: "destructive" });
          return false;
        }
        return true;
      case 'contact':
        // Phone number is optional, but if provided should be valid format
        return true;
      case 'academic':
        return true;
      case 'musical':
        return true;
      case 'preferences':
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    if (isLastStep) {
      handleSubmit();
    } else {
      const nextIndex = currentStepIndex + 1;
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStep(steps[prevIndex].key);
    }
  };

  const handleDietaryRestrictionChange = (restriction: string, checked: boolean) => {
    if (checked) {
      setDietaryRestrictions([...dietaryRestrictions, restriction]);
    } else {
      setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsLoading(true);
    try {
      const userData = {
        email: email.trim(),
        full_name: fullName.trim(),
        role: role,
        pronouns: pronouns.trim(),
        bio: bio.trim(),
        phone_number: phoneNumber.trim(),
        emergency_contact: emergencyContact.trim(),
        academic_major: academicMajor.trim(),
        class_year: classYear ? parseInt(classYear) : null,
        student_number: studentNumber.trim(),
        voice_part: voicePart === 'none' ? null : voicePart,
        can_dance: canDance,
        exec_board_role: execBoardRole === 'none' ? null : execBoardRole || null,
        dietary_restrictions: dietaryRestrictions,
        allergies: allergies.trim()
      };

      const { data, error } = await supabase.functions.invoke('import-users', {
        body: {
          users: [userData],
          source: 'mobile_form'
        }
      });

      if (error) throw error;

      if (data.success > 0) {
        const newTempPassword = data.users?.[0]?.temp_password || "";
        setTempPassword(newTempPassword);
        
        toast({
          title: "User Created Successfully",
          description: `${email} has been added to the system.`,
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-4">
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
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="fan">Fan</SelectItem>
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
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
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
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Textarea
                id="emergencyContact"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Name, relationship, phone number"
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>
        );

      case 'academic':
        return (
          <div className="space-y-4">
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
          </div>
        );

      case 'musical':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voicePart">Voice Part</Label>
              <Select value={voicePart} onValueChange={setVoicePart} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voice part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="S1">Soprano 1</SelectItem>
                  <SelectItem value="S2">Soprano 2</SelectItem>
                  <SelectItem value="A1">Alto 1</SelectItem>
                  <SelectItem value="A2">Alto 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="execBoardRole">Executive Board Role</Label>
              <Select value={execBoardRole} onValueChange={setExecBoardRole} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="president">President</SelectItem>
                  <SelectItem value="vice-president">Vice President</SelectItem>
                  <SelectItem value="secretary">Secretary</SelectItem>
                  <SelectItem value="treasurer">Treasurer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="canDance"
                checked={canDance}
                onCheckedChange={(checked) => setCanDance(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="canDance">Can Dance</Label>
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dietary Restrictions</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_DIETARY_OPTIONS.slice(0, 6).map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dietary-${option}`}
                      checked={dietaryRestrictions.includes(option)}
                      onCheckedChange={(checked) => 
                        handleDietaryRestrictionChange(option, checked as boolean)
                      }
                      disabled={isLoading}
                    />
                    <Label htmlFor={`dietary-${option}`} className="text-sm">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Any food allergies or medical conditions"
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = steps[currentStepIndex];
  const StepIcon = currentStepData.icon;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StepIcon className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
          </div>
          <div className="text-sm text-gray-500">
            {currentStepIndex + 1} of {steps.length}
          </div>
        </div>
        <CardDescription>{currentStepData.description}</CardDescription>
        
        {/* Progress indicator */}
        <div className="flex space-x-1 mt-3">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={`h-2 flex-1 rounded-full ${
                index <= currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {renderStepContent()}

        {/* Temporary password display */}
        {tempPassword && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Temporary Password:</strong> {tempPassword}
              <br />
              <small className="text-gray-600">Save this password securely and share it with the user.</small>
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={isFirstStep ? onCancel : handlePrevious}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isFirstStep ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : isLastStep ? (
              <>
                <Check className="h-4 w-4" />
                Create User
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};