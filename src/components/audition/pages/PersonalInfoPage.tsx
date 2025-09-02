import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
                placeholder="Tell us about yourself, your interests, and what makes you unique... (minimum 50 words)"
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
                  return `${wordCount}/50 words minimum`;
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
            <RadioGroup
              value={field.value === true ? "yes" : field.value === false ? "no" : ""}
              onValueChange={(value) => field.onChange(value === "yes")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="leadership-yes" />
                <Label htmlFor="leadership-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="leadership-no" />
                <Label htmlFor="leadership-no">No</Label>
              </div>
            </RadioGroup>
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