import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuditionForm } from "../AuditionFormProvider";

export function BasicInfoPage() {
  const { form } = useAuditionForm();

  const capitalizeInput = (value: string) => {
    return value
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Basic Information</h2>
        <p className="text-sm md:text-base text-gray-600 mt-2">Tell us your contact details</p>
      </div>

      {/* Mobile-first single column layout */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-gray-700">First Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter your first name" 
                  {...field}
                  onChange={(e) => field.onChange(capitalizeInput(e.target.value))}
                  className="h-12 text-base"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-gray-700">Last Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter your last name" 
                  {...field}
                  onChange={(e) => field.onChange(capitalizeInput(e.target.value))}
                  className="h-12 text-base"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-gray-700">Email Address</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="Enter your email address" 
                  {...field}
                  className="h-12 text-base"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-gray-700">Phone Number</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter your phone number" 
                  {...field}
                  className="h-12 text-base"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}