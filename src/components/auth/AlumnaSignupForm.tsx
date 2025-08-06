import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCapIcon, StarIcon, UsersIcon } from "lucide-react";

export function AlumnaSignupForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    graduationYear: "",
    voicePart: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/alumnae`,
          data: {
            signup_context: 'alumna',
            full_name: formData.fullName,
            graduation_year: formData.graduationYear,
            voice_part: formData.voicePart
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Welcome back to the Glee Club family!");
      }
    } catch (error: any) {
      console.error('Alumna signup error:', error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <GraduationCapIcon className="h-6 w-6 text-purple-600" />
          Join as Alumna
        </CardTitle>
        <p className="text-sm text-gray-600">Reconnect with your Glee Club family</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="graduationYear">Graduation Year</Label>
              <Select value={formData.graduationYear} onValueChange={(value) => setFormData(prev => ({ ...prev, graduationYear: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {graduationYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="voicePart">Voice Part</Label>
              <Select value={formData.voicePart} onValueChange={(value) => setFormData(prev => ({ ...prev, voicePart: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soprano">Soprano</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="tenor">Tenor</SelectItem>
                  <SelectItem value="bass">Bass</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password (min 8 characters)"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              required
            />
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
              <StarIcon className="h-4 w-4" />
              Alumna Benefits
            </h4>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Access to alumnae-only events and content</li>
              <li>• Mentorship opportunities with current members</li>
              <li>• Reunion planning and coordination</li>
              <li>• Legacy story sharing platform</li>
            </ul>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-purple-600 hover:bg-purple-700" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Account..." : "Join as Alumna"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}