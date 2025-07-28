import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuditionForm } from "../AuditionFormProvider";

export function PersonalInfoPage() {
  const { form } = useAuditionForm();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
        <p className="text-gray-600 mt-2">Help us get to know you better</p>
      </div>

      <FormField
        control={form.control}
        name="personalityDescription"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Describe your personality</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Tell us about yourself, your interests, and what makes you unique..."
                className="min-h-[120px]"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="interestedInLeadership"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <FormLabel className="text-sm font-normal">
              Are you interested in leadership opportunities within the Glee Club?
            </FormLabel>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="additionalInfo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Information (Optional)</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Is there anything else you'd like us to know? Special circumstances, achievements, goals, etc."
                className="min-h-[100px]"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="mt-8 p-4 bg-purple-50 rounded-lg">
        <h4 className="font-medium text-purple-900 mb-2">Leadership Opportunities Include:</h4>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>• Section leaders and mentoring roles</li>
          <li>• Event planning and organization</li>
          <li>• Community outreach coordination</li>
          <li>• Executive board positions</li>
        </ul>
      </div>
    </div>
  );
}