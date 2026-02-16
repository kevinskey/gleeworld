import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UniversalSlider, UniversalSliderSlide, SliderWithSlides } from '@/types/universal-slider';

// Fetch a slider by placement key with its slides
export function useSliderByPlacement(placementKey: string) {
  return useQuery({
    queryKey: ['universal-slider', placementKey],
    queryFn: async (): Promise<SliderWithSlides | null> => {
      const { data: slider, error: sliderError } = await supabase
        .from('gw_universal_sliders')
        .select('*')
        .eq('placement_key', placementKey)
        .eq('is_active', true)
        .single();

      if (sliderError || !slider) return null;

      const { data: slides, error: slidesError } = await supabase
        .from('gw_universal_slider_slides')
        .select('*')
        .eq('slider_id', slider.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (slidesError) throw slidesError;

      return {
        ...slider,
        slides: slides || [],
      } as SliderWithSlides;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Admin version: fetches ALL slides regardless of is_active status
export function useSliderByPlacementAdmin(placementKey: string) {
  return useQuery({
    queryKey: ['universal-slider', 'admin', placementKey],
    queryFn: async (): Promise<SliderWithSlides | null> => {
      const { data: slider, error: sliderError } = await supabase
        .from('gw_universal_sliders')
        .select('*')
        .eq('placement_key', placementKey)
        .single();

      if (sliderError || !slider) return null;

      const { data: slides, error: slidesError } = await supabase
        .from('gw_universal_slider_slides')
        .select('*')
        .eq('slider_id', slider.id)
        .order('display_order', { ascending: true });

      if (slidesError) throw slidesError;

      return {
        ...slider,
        slides: slides || [],
      } as SliderWithSlides;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch all sliders for admin
export function useAllSliders() {
  return useQuery({
    queryKey: ['universal-sliders-admin'],
    queryFn: async (): Promise<SliderWithSlides[]> => {
      const { data: sliders, error: sliderError } = await supabase
        .from('gw_universal_sliders')
        .select('*')
        .order('display_order', { ascending: true });

      if (sliderError) throw sliderError;
      if (!sliders?.length) return [];

      // Fetch all slides for all sliders
      const { data: allSlides, error: slidesError } = await supabase
        .from('gw_universal_slider_slides')
        .select('*')
        .in('slider_id', sliders.map(s => s.id))
        .order('display_order', { ascending: true });

      if (slidesError) throw slidesError;

      return sliders.map(slider => ({
        ...slider,
        slides: (allSlides || []).filter(s => s.slider_id === slider.id),
      })) as SliderWithSlides[];
    },
  });
}

// Create a new slider
export function useCreateSlider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slider: Partial<UniversalSlider>) => {
      const { data, error } = await supabase
        .from('gw_universal_sliders')
        .insert([slider as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universal-sliders-admin'] });
    },
  });
}

// Update a slider
export function useUpdateSlider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UniversalSlider> & { id: string }) => {
      const { data, error } = await supabase
        .from('gw_universal_sliders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['universal-sliders-admin'] });
      queryClient.invalidateQueries({ queryKey: ['universal-slider', data.placement_key] });
    },
  });
}

// Delete a slider
export function useDeleteSlider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_universal_sliders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universal-sliders-admin'] });
    },
  });
}

// Create a slide
export function useCreateSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slide: Partial<UniversalSliderSlide>) => {
      const { data, error } = await supabase
        .from('gw_universal_slider_slides')
        .insert([slide as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universal-sliders-admin'] });
    },
  });
}

// Update a slide
export function useUpdateSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UniversalSliderSlide> & { id: string }) => {
      const { data, error } = await supabase
        .from('gw_universal_slider_slides')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universal-sliders-admin'] });
      queryClient.invalidateQueries({ queryKey: ['universal-slider'] });
      queryClient.invalidateQueries({ queryKey: ['universal-slider', 'admin'] });
    },
  });
}

// Delete a slide
export function useDeleteSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_universal_slider_slides')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universal-sliders-admin'] });
    },
  });
}

// Bulk update slide order
export function useReorderSlides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slides: { id: string; display_order: number }[]) => {
      const promises = slides.map(({ id, display_order }) =>
        supabase
          .from('gw_universal_slider_slides')
          .update({ display_order })
          .eq('id', id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universal-sliders-admin'] });
    },
  });
}
