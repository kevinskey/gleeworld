import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Heart, GraduationCap, Music, Users, Star, Calendar, BookOpen, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleSelectionStepProps {
  onRoleSelected: (role: 'fan' | 'alumna', additionalData?: { graduationYear?: number; voicePart?: string }) => void;
  loading?: boolean;
}

const voiceParts = ['Soprano 1', 'Soprano 2', 'Alto 1', 'Alto 2'];

export const RoleSelectionStep = ({ onRoleSelected, loading }: RoleSelectionStepProps) => {
  const [selectedRole, setSelectedRole] = useState<'fan' | 'alumna' | null>(null);
  const [graduationYear, setGraduationYear] = useState<string>("");
  const [voicePart, setVoicePart] = useState<string>("");
  const [showAlumnaForm, setShowAlumnaForm] = useState(false);

  const handleRoleClick = (role: 'fan' | 'alumna') => {
    setSelectedRole(role);
    if (role === 'alumna') {
      setShowAlumnaForm(true);
    } else {
      setShowAlumnaForm(false);
    }
  };

  const handleSubmit = () => {
    if (selectedRole === 'fan') {
      onRoleSelected('fan');
    } else if (selectedRole === 'alumna') {
      onRoleSelected('alumna', {
        graduationYear: graduationYear ? parseInt(graduationYear) : undefined,
        voicePart: voicePart || undefined
      });
    }
  };

  const canSubmit = selectedRole === 'fan' || (selectedRole === 'alumna' && graduationYear);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-white">How would you like to join GleeWorld?</h2>
        <p className="text-white/70 text-sm">Select the option that best describes you</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fan/Supporter Card */}
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 border-2 bg-white/10 backdrop-blur-sm",
            selectedRole === 'fan' 
              ? "border-pink-400 bg-pink-500/20 shadow-lg shadow-pink-500/20" 
              : "border-white/20 hover:border-pink-300/50 hover:bg-white/15"
          )}
          onClick={() => handleRoleClick('fan')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-pink-500/20">
                <Heart className="h-5 w-5 text-pink-300" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">Fan / Supporter</CardTitle>
                <Badge variant="secondary" className="bg-pink-500/30 text-pink-100 text-xs mt-1">
                  Community Member
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-white/70 text-sm mb-3">
              Support the Your favorite band or choir and stay connected with our community.
            </CardDescription>
            <ul className="space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <Music className="h-3.5 w-3.5 text-pink-300" />
                Exclusive concert updates
              </li>
              <li className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-pink-300" />
                Behind-the-scenes content
              </li>
              <li className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-pink-300" />
                Community forum access
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Alumna Card */}
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 border-2 bg-white/10 backdrop-blur-sm",
            selectedRole === 'alumna' 
              ? "border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/20" 
              : "border-white/20 hover:border-purple-300/50 hover:bg-white/15"
          )}
          onClick={() => handleRoleClick('alumna')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-purple-500/20">
                <GraduationCap className="h-5 w-5 text-purple-300" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">Alumna</CardTitle>
                <Badge variant="secondary" className="bg-purple-500/30 text-purple-100 text-xs mt-1">
                  Former Glee Club Member
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-white/70 text-sm mb-3">
              Reconnect with your Glee Club sisters and access exclusive alumnae features.
            </CardDescription>
            <ul className="space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-purple-300" />
                Reunion planning & events
              </li>
              <li className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-purple-300" />
                Memory wall & legacy stories
              </li>
              <li className="flex items-center gap-2">
                <Mic className="h-3.5 w-3.5 text-purple-300" />
                Mentorship opportunities
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Alumna Additional Info Form */}
      {showAlumnaForm && selectedRole === 'alumna' && (
        <Card className="bg-white/10 backdrop-blur-sm border-purple-400/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Tell us about yourself</CardTitle>
            <CardDescription className="text-white/70 text-sm">
              This helps us verify your alumna status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="graduationYear" className="text-white">Graduation Year *</Label>
              <Input
                id="graduationYear"
                type="number"
                placeholder="e.g., 2020"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                min="1925"
                max={new Date().getFullYear()}
                className="bg-black/40 border-white/40 text-white placeholder:text-white/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voicePart" className="text-white">Voice Part (Optional)</Label>
              <select
                id="voicePart"
                value={voicePart}
                onChange={(e) => setVoicePart(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-black/40 border border-white/40 text-white"
              >
                <option value="" className="bg-gray-800">Select voice part...</option>
                {voiceParts.map((part) => (
                  <option key={part} value={part} className="bg-gray-800">{part}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      {selectedRole && (
        <Button 
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className={cn(
            "w-full",
            selectedRole === 'fan' 
              ? "bg-pink-600 hover:bg-pink-700" 
              : "bg-purple-600 hover:bg-purple-700"
          )}
        >
          {loading ? (
            "Submitting..."
          ) : (
            <>
              Continue as {selectedRole === 'fan' ? 'Fan/Supporter' : 'Alumna'}
            </>
          )}
        </Button>
      )}

      <p className="text-center text-white/60 text-xs">
        Your registration will be reviewed by our team. You'll receive an email once approved.
      </p>
    </div>
  );
};
