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
    <div className="space-y-2 md:space-y-4">
      <div className="text-center mb-2 md:mb-4">
        <h2 className="text-base md:text-xl font-bold text-gray-900">Basic Information</h2>
        <p className="text-xs text-gray-600 mt-1">Contact details</p>
      </div>

      {/* Ultra-compact mobile layout */}
      <div className="space-y-2 md:space-y-3">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs md:text-sm font-medium text-gray-700">First Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="First name" 
                  {...field}
                  onChange={(e) => field.onChange(capitalizeInput(e.target.value))}
                  className="h-8 md:h-10 text-sm"
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
              <FormLabel className="text-xs md:text-sm font-medium text-gray-700">Last Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Last name" 
                  {...field}
                  onChange={(e) => field.onChange(capitalizeInput(e.target.value))}
                  className="h-8 md:h-10 text-sm"
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
              <FormLabel className="text-xs md:text-sm font-medium text-gray-700">Email</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="Email address" 
                  {...field}
                  className="h-8 md:h-10 text-sm"
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
              <FormLabel className="text-xs md:text-sm font-medium text-gray-700">Phone</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Phone number" 
                  {...field}
                  className="h-8 md:h-10 text-sm"
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