import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Music, Save, ExternalLink } from 'lucide-react';

export const MidtermConfigManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [excerpt1Url, setExcerpt1Url] = useState('');
  const [excerpt2Url, setExcerpt2Url] = useState('');
  const [excerpt3Url, setExcerpt3Url] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: ['midterm-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mus240_midterm_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setExcerpt1Url(data.excerpt_1_url || '');
        setExcerpt2Url(data.excerpt_2_url || '');
        setExcerpt3Url(data.excerpt_3_url || '');
      }

      return data;
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const configData = {
        excerpt_1_url: excerpt1Url,
        excerpt_2_url: excerpt2Url,
        excerpt_3_url: excerpt3Url,
        updated_at: new Date().toISOString(),
      };

      if (config?.id) {
        const { error } = await supabase
          .from('mus240_midterm_config')
          .update(configData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mus240_midterm_config')
          .insert([configData]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['midterm-config'] });
      toast.success('Listening excerpt URLs saved successfully');
    },
    onError: (error) => {
      console.error('Error saving config:', error);
      toast.error('Failed to save URLs');
    },
  });

  const testUrl = (url: string) => {
    if (!url) {
      toast.error('Please enter a URL first');
      return;
    }
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading configuration...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Listening Excerpt Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Set YouTube or audio URLs for the three listening excerpts on the midterm exam. 
          These links will be displayed to students during the exam.
        </p>

        {/* Excerpt 1 */}
        <div className="space-y-2">
          <Label htmlFor="excerpt1">Excerpt 1 - Audio URL</Label>
          <div className="flex gap-2">
            <Input
              id="excerpt1"
              type="url"
              placeholder="https://youtube.com/watch?v=... or direct audio URL"
              value={excerpt1Url}
              onChange={(e) => setExcerpt1Url(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => testUrl(excerpt1Url)}
              disabled={!excerpt1Url}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Excerpt 2 */}
        <div className="space-y-2">
          <Label htmlFor="excerpt2">Excerpt 2 - Audio URL</Label>
          <div className="flex gap-2">
            <Input
              id="excerpt2"
              type="url"
              placeholder="https://youtube.com/watch?v=... or direct audio URL"
              value={excerpt2Url}
              onChange={(e) => setExcerpt2Url(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => testUrl(excerpt2Url)}
              disabled={!excerpt2Url}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Excerpt 3 */}
        <div className="space-y-2">
          <Label htmlFor="excerpt3">Excerpt 3 - Audio URL</Label>
          <div className="flex gap-2">
            <Input
              id="excerpt3"
              type="url"
              placeholder="https://youtube.com/watch?v=... or direct audio URL"
              value={excerpt3Url}
              onChange={(e) => setExcerpt3Url(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => testUrl(excerpt3Url)}
              disabled={!excerpt3Url}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={() => saveConfigMutation.mutate()}
          disabled={saveConfigMutation.isPending}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveConfigMutation.isPending ? 'Saving...' : 'Save URLs'}
        </Button>
      </CardContent>
    </Card>
  );
};
