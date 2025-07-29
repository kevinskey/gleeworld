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
          <FormItem>
            <FormLabel>Do you read music?</FormLabel>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="reads-music-yes" 
                  checked={field.value === true}
                  onChange={() => field.onChange(true)}
                  className="w-4 h-4"
                />
                <label htmlFor="reads-music-yes" className="text-sm">Yes</label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="reads-music-no" 
                  checked={field.value === false}
                  onChange={() => field.onChange(false)}
                  className="w-4 h-4"
                />
                <label htmlFor="reads-music-no" className="text-sm">No</label>
              </div>
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="interestedInVoiceLessons"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Are you interested in voice lessons?</FormLabel>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="voice-lessons-yes" 
                  checked={field.value === true}
                  onChange={() => field.onChange(true)}
                  className="w-4 h-4"
                />
                <label htmlFor="voice-lessons-yes" className="text-sm">Yes</label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="voice-lessons-no" 
                  checked={field.value === false}
                  onChange={() => field.onChange(false)}
                  className="w-4 h-4"
                />
                <label htmlFor="voice-lessons-no" className="text-sm">No</label>
              </div>
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="interestedInMusicFundamentals"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Are you interested in music fundamentals classes?</FormLabel>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="music-fundamentals-yes" 
                  checked={field.value === true}
                  onChange={() => field.onChange(true)}
                  className="w-4 h-4"
                />
                <label htmlFor="music-fundamentals-yes" className="text-sm">Yes</label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="music-fundamentals-no" 
                  checked={field.value === false}
                  onChange={() => field.onChange(false)}
                  className="w-4 h-4"
                />
                <label htmlFor="music-fundamentals-no" className="text-sm">No</label>
              </div>
            </div>
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