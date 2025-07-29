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
            <FormLabel>Describe your personality *</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Tell us about yourself, your interests, and what makes you unique... (minimum 25 words)"
                className="min-h-[120px]"
                {...field} 
              />
            </FormControl>
            <div className="flex justify-between items-center">
              <FormMessage />
              <span className="text-xs text-gray-500">
                {(() => {
                  const text = field.value || '';
                  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
                  return `${wordCount}/25 words minimum`;
                })()}
              </span>
            </div>
          </FormItem>
        )}
      />

        <FormField
        control={form.control}
        name="interestedInLeadership"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Are you interested in leadership opportunities within the Glee Club? (Optional)</FormLabel>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="leadership-yes" 
                  checked={field.value === true}
                  onChange={() => field.onChange(true)}
                  className="w-4 h-4"
                />
                <label htmlFor="leadership-yes" className="text-sm">Yes</label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="leadership-no" 
                  checked={field.value === false}
                  onChange={() => field.onChange(false)}
                  className="w-4 h-4"
                />
                <label htmlFor="leadership-no" className="text-sm">No</label>
              </div>
            </div>
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