import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
            <RadioGroup
              value={field.value === true ? "yes" : field.value === false ? "no" : ""}
              onValueChange={(value) => field.onChange(value === "yes")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="reads-music-yes" />
                <Label htmlFor="reads-music-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="reads-music-no" />
                <Label htmlFor="reads-music-no">No</Label>
              </div>
            </RadioGroup>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="interestedInVoiceLessons"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Are you interested in voice lessons?</FormLabel>
            <RadioGroup
              value={field.value === true ? "yes" : field.value === false ? "no" : ""}
              onValueChange={(value) => field.onChange(value === "yes")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="voice-lessons-yes" />
                <Label htmlFor="voice-lessons-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="voice-lessons-no" />
                <Label htmlFor="voice-lessons-no">No</Label>
              </div>
            </RadioGroup>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="interestedInMusicFundamentals"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Are you interested in music fundamentals classes?</FormLabel>
            <RadioGroup
              value={field.value === true ? "yes" : field.value === false ? "no" : ""}
              onValueChange={(value) => field.onChange(value === "yes")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="music-fundamentals-yes" />
                <Label htmlFor="music-fundamentals-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="music-fundamentals-no" />
                <Label htmlFor="music-fundamentals-no">No</Label>
              </div>
            </RadioGroup>
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