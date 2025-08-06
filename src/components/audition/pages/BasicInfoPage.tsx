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
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-lg md:text-xl font-bold text-gray-900">Basic Information</h2>
        <p className="text-xs md:text-sm text-gray-600 mt-1">Tell us your contact details</p>
      </div>

      {/* Compact mobile layout */}
      <div className="space-y-3">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">First Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="First name" 
                  {...field}
                  onChange={(e) => field.onChange(capitalizeInput(e.target.value))}
                  className="h-10 text-sm"
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
              <FormLabel className="text-sm font-medium text-gray-700">Last Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Last name" 
                  {...field}
                  onChange={(e) => field.onChange(capitalizeInput(e.target.value))}
                  className="h-10 text-sm"
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
              <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="Email address" 
                  {...field}
                  className="h-10 text-sm"
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
              <FormLabel className="text-sm font-medium text-gray-700">Phone</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Phone number" 
                  {...field}
                  className="h-10 text-sm"
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