import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IntakeFormData {
  full_name: string;
  email: string;
  student_id: string;
  academic_year: string;
  major: string;
  phone_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  dress_size: string;
  bust_measurement: number;
  waist_measurement: number;
  hip_measurement: number;
  height_feet: number;
  height_inches: number;
  shoe_size: string;
  glove_size: string;
}

export const StudentIntakeForm = () => {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<IntakeFormData>();

  const onSubmit = async (data: IntakeFormData) => {
    try {
      setSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit intake form",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('gw_student_intake')
        .insert({
          user_id: user.id,
          ...data
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Intake form submitted successfully",
      });

      // Reset form or redirect
    } catch (error) {
      console.error('Error submitting intake:', error);
      toast({
        title: "Error",
        description: "Failed to submit intake form",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Student Intake Form</h1>
        <p className="text-muted-foreground">Complete this form to begin the wardrobe sizing process</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <div className="border rounded p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input 
                {...register("full_name", { required: "Full name is required" })}
                id="full_name"
              />
              {errors.full_name && <span className="text-red-500 text-sm">{errors.full_name.message}</span>}
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input 
                type="email"
                {...register("email", { required: "Email is required" })}
                id="email"
              />
              {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
            </div>
            <div>
              <Label htmlFor="student_id">Student ID</Label>
              <Input {...register("student_id")} id="student_id" />
            </div>
            <div>
              <Label htmlFor="academic_year">Academic Year *</Label>
              <Select onValueChange={(value) => setValue("academic_year", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freshman">Freshman</SelectItem>
                  <SelectItem value="sophomore">Sophomore</SelectItem>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="major">Major</Label>
              <Input {...register("major")} id="major" />
            </div>
            <div>
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input {...register("phone_number")} id="phone_number" />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="border rounded p-6">
          <h2 className="text-xl font-semibold mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergency_contact_name">Contact Name</Label>
              <Input {...register("emergency_contact_name")} id="emergency_contact_name" />
            </div>
            <div>
              <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
              <Input {...register("emergency_contact_phone")} id="emergency_contact_phone" />
            </div>
          </div>
        </div>

        {/* Size Measurements */}
        <div className="border rounded p-6">
          <h2 className="text-xl font-semibold mb-4">Size & Measurements</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dress_size">Dress Size</Label>
              <Select onValueChange={(value) => setValue("dress_size", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {["XS", "S", "M", "L", "XL", "XXL", "0", "2", "4", "6", "8", "10", "12", "14", "16", "18", "20"].map(size => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="shoe_size">Shoe Size</Label>
              <Select onValueChange={(value) => setValue("shoe_size", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 10}, (_, i) => (5 + i * 0.5).toString()).map(size => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="glove_size">Glove Size</Label>
              <Select onValueChange={(value) => setValue("glove_size", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {["XS", "S", "M", "L", "XL"].map(size => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bust_measurement">Bust (inches)</Label>
              <Input 
                type="number" 
                step="0.5"
                {...register("bust_measurement", { valueAsNumber: true })} 
                id="bust_measurement" 
              />
            </div>
            <div>
              <Label htmlFor="waist_measurement">Waist (inches)</Label>
              <Input 
                type="number" 
                step="0.5"
                {...register("waist_measurement", { valueAsNumber: true })} 
                id="waist_measurement" 
              />
            </div>
            <div>
              <Label htmlFor="hip_measurement">Hip (inches)</Label>
              <Input 
                type="number" 
                step="0.5"
                {...register("hip_measurement", { valueAsNumber: true })} 
                id="hip_measurement" 
              />
            </div>
            <div>
              <Label htmlFor="height_feet">Height (feet)</Label>
              <Select onValueChange={(value) => setValue("height_feet", parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Feet" />
                </SelectTrigger>
                <SelectContent>
                  {[4, 5, 6, 7].map(feet => (
                    <SelectItem key={feet} value={feet.toString()}>{feet} ft</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="height_inches">Height (inches)</Label>
              <Select onValueChange={(value) => setValue("height_inches", parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Inches" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 12}, (_, i) => i).map(inches => (
                    <SelectItem key={inches} value={inches.toString()}>{inches} in</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Submitting..." : "Submit Intake Form"}
        </Button>
      </form>
    </div>
  );
};