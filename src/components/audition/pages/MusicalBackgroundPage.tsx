import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditionForm } from "../AuditionFormProvider";

export function MusicalBackgroundPage() {
  const { form } = useAuditionForm();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Musical Background</h2>
        <p className="text-gray-600 mt-2">Share your musical experience with us</p>
      </div>

      <FormField
        control={form.control}
        name="sangInMiddleSchool"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <FormLabel className="text-sm font-normal">
              Did you sing in middle school?
            </FormLabel>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="sangInHighSchool"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <FormLabel className="text-sm font-normal">
              Did you sing in high school?
            </FormLabel>
          </FormItem>
        )}
      />

      {form.watch("sangInHighSchool") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
          <FormField
            control={form.control}
            name="highSchoolYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How many years?</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 4 years" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="highSchoolSection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What section did you sing?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="soprano">Soprano</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="tenor">Tenor</SelectItem>
                    <SelectItem value="bass">Bass</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <FormField
        control={form.control}
        name="playsInstrument"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <FormLabel className="text-sm font-normal">
              Do you play an instrument well enough to perform with it?
            </FormLabel>
          </FormItem>
        )}
      />

      {form.watch("playsInstrument") && (
        <FormField
          control={form.control}
          name="instrumentDetails"
          render={({ field }) => (
            <FormItem className="ml-6">
              <FormLabel>What instrument(s)?</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Piano, Guitar, Violin" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="isSoloist"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <FormLabel className="text-sm font-normal">
              Are you a soloist?
            </FormLabel>
          </FormItem>
        )}
      />

      {form.watch("isSoloist") && (
        <FormField
          control={form.control}
          name="soloistRating"
          render={({ field }) => (
            <FormItem className="ml-6">
              <FormLabel>Rate yourself 1-10 (10 being best)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}