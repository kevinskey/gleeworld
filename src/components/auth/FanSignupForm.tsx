import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HeartIcon, MusicIcon, UsersIcon } from "lucide-react";

export function FanSignupForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            signup_context: 'fan',
            full_name: formData.fullName
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Welcome to the Glee Club fan community!");
      }
    } catch (error: any) {
      console.error('Fan signup error:', error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <HeartIcon className="h-6 w-6 text-pink-600" />
          Join as a Fan
        </CardTitle>
        <p className="text-sm text-gray-600">Support the Spelman College Glee Club</p>
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

          <div className="bg-pink-50 p-4 rounded-lg">
            <h4 className="font-medium text-pink-900 mb-2 flex items-center gap-2">
              <MusicIcon className="h-4 w-4" />
              Fan Benefits
            </h4>
            <ul className="text-sm text-pink-800 space-y-1">
              <li>• Access to exclusive content and performances</li>
              <li>• Early ticket access to concerts</li>
              <li>• Behind-the-scenes updates</li>
              <li>• Community forum participation</li>
            </ul>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-pink-600 hover:bg-pink-700" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Account..." : "Join as Fan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}