import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const tourSchema = z.object({
  name: z.string().min(1, 'Tour name is required'),
  start_date: z.date({
    required_error: 'Start date is required',
  }),
  end_date: z.date({
    required_error: 'End date is required',
  }),
  number_of_singers: z.number().min(1, 'Number of singers must be at least 1'),
  budget: z.number().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'planning', 'confirmed', 'archived']),
}).refine((data) => data.end_date >= data.start_date, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type TourFormData = z.infer<typeof tourSchema>;

interface TourOverviewProps {
  tour?: any;
  isCreating: boolean;
  onSaved: () => void;
}

export const TourOverview: React.FC<TourOverviewProps> = ({ tour, isCreating, onSaved }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<TourFormData>({
    resolver: zodResolver(tourSchema),
    defaultValues: {
      name: tour?.name || '',
      start_date: tour?.start_date ? new Date(tour.start_date) : undefined,
      end_date: tour?.end_date ? new Date(tour.end_date) : undefined,
      number_of_singers: tour?.number_of_singers || 20,
      budget: tour?.budget || undefined,
      notes: tour?.notes || '',
      status: tour?.status || 'draft',
    },
  });

  const createTourMutation = useMutation({
    mutationFn: async (data: TourFormData) => {
      const { data: result, error } = await supabase
        .from('gw_tours')
        .insert({
          name: data.name,
          start_date: data.start_date.toISOString().split('T')[0],
          end_date: data.end_date.toISOString().split('T')[0],
          number_of_singers: data.number_of_singers,
          budget: data.budget,
          notes: data.notes,
          status: data.status,
          created_by: user?.id || '',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Tour created successfully!');
      onSaved();
    },
    onError: (error) => {
      console.error('Error creating tour:', error);
      toast.error('Failed to create tour');
    },
  });

  const updateTourMutation = useMutation({
    mutationFn: async (data: TourFormData) => {
      const { data: result, error } = await supabase
        .from('gw_tours')
        .update({
          name: data.name,
          start_date: data.start_date.toISOString().split('T')[0],
          end_date: data.end_date.toISOString().split('T')[0],
          number_of_singers: data.number_of_singers,
          budget: data.budget,
          notes: data.notes,
          status: data.status,
        })
        .eq('id', tour.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      queryClient.invalidateQueries({ queryKey: ['tour', tour?.id] });
      toast.success('Tour updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating tour:', error);
      toast.error('Failed to update tour');
    },
  });

  const onSubmit = (data: TourFormData) => {
    if (isCreating) {
      createTourMutation.mutate(data);
    } else {
      updateTourMutation.mutate(data);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tour Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tour Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Spring Tour 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick start date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick end date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="number_of_singers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Singers</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this tour..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button 
                type="submit" 
                disabled={createTourMutation.isPending || updateTourMutation.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isCreating ? 'Create Tour' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};