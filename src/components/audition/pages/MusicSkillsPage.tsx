import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuditionForm } from "../AuditionFormProvider";

export function MusicSkillsPage() {
  const { form } = useAuditionForm();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Music Skills & Interests</h2>
        <p className="text-gray-600 mt-2">Let us know about your musical abilities and interests</p>
      </div>

      <FormField
        control={form.control}
        name="readsMusic"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <FormLabel className="text-sm font-normal">
              Do you read music?
            </FormLabel>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="interestedInVoiceLessons"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <FormLabel className="text-sm font-normal">
              Are you interested in voice lessons?
            </FormLabel>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="interestedInMusicFundamentals"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <FormLabel className="text-sm font-normal">
              Are you interested in music fundamentals classes?
            </FormLabel>
          </FormItem>
        )}
      />

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">What This Means:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Reading music:</strong> Ability to read sheet music notation</li>
          <li>• <strong>Voice lessons:</strong> Individual or group vocal training sessions</li>
          <li>• <strong>Music fundamentals:</strong> Theory, rhythm, and basic music concepts</li>
        </ul>
      </div>
    </div>
  );
}