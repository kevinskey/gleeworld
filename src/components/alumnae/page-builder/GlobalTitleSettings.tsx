import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import WebFont from 'webfontloader';

interface GlobalTitleSettingsProps {
  onBack: () => void;
}

interface TitleFormatting {
  fontSize: number;
  fontWeight: string;
  textAlign: string;
  color: string;
  marginBottom: number;
  textTransform: string;
  letterSpacing: number;
  fontFamily?: string;
}

export const GlobalTitleSettings = ({ onBack }: GlobalTitleSettingsProps) => {
  const [formatting, setFormatting] = useState<TitleFormatting>({
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    color: '',
    marginBottom: 32,
    textTransform: 'none',
    letterSpacing: 0,
    fontFamily: 'inherit',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalSettings();
  }, []);

  // Load Google font when fontFamily changes
  useEffect(() => {
    if (formatting.fontFamily && formatting.fontFamily !== 'inherit') {
      const primary = formatting.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      if (primary) {
        const weight = (formatting.fontWeight || '400').toString().replace(/[^0-9]/g, '') || '400';
        const families = [`${primary}:${weight},400,500,600,700,800,900`];
        WebFont.load({ 
          google: { families },
          active: () => console.log('✅ Preview font loaded:', families.join(',')),
          inactive: () => console.log('❌ Preview font failed:', families.join(','))
        });
      }
    }
  }, [formatting.fontFamily]);

  const fetchGlobalSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('alumnae_global_settings')
        .select('*')
        .eq('setting_key', 'title_formatting')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        setFormatting(data.setting_value as unknown as TitleFormatting);
      }
    } catch (error: any) {
      console.error('Failed to load global settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('alumnae_global_settings')
        .select('id')
        .eq('setting_key', 'title_formatting')
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('alumnae_global_settings')
          .update({
            setting_value: formatting as unknown as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('alumnae_global_settings')
          .insert({
            setting_key: 'title_formatting',
            setting_value: formatting as unknown as any,
          });

        if (error) throw error;
      }

      toast.success('Global title formatting saved');
      onBack();
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p>Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Global Title Formatting</h2>
          <p className="text-muted-foreground">Apply consistent formatting to all section titles</p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Title Style Settings</CardTitle>
          <CardDescription>
            These settings will apply to all section titles on the alumnae page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fontSize">Font Size: {formatting.fontSize}px</Label>
              <Slider
                id="fontSize"
                value={[formatting.fontSize]}
                onValueChange={(value) => setFormatting({ ...formatting, fontSize: value[0] })}
                min={16}
                max={72}
                step={2}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontFamily">Font Family</Label>
              <Select
                value={formatting.fontFamily || 'inherit'}
                onValueChange={(value) => setFormatting({ ...formatting, fontFamily: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Default (Roboto)</SelectItem>
                  <SelectItem value="'Dancing Script', cursive">Dancing Script</SelectItem>
                  <SelectItem value="'Bebas Neue', cursive">Bebas Neue</SelectItem>
                  <SelectItem value="'Playfair Display', serif">Playfair Display</SelectItem>
                  <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                  <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                  <SelectItem value="'Lato', sans-serif">Lato</SelectItem>
                  <SelectItem value="'Merriweather', serif">Merriweather</SelectItem>
                  <SelectItem value="'Raleway', sans-serif">Raleway</SelectItem>
                  <SelectItem value="'Oswald', sans-serif">Oswald</SelectItem>
                  <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                  <SelectItem value="'Cinzel', serif">Cinzel</SelectItem>
                  <SelectItem value="'Cormorant Garamond', serif">Cormorant Garamond</SelectItem>
                  <SelectItem value="'Libre Baskerville', serif">Libre Baskerville</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontWeight">Font Weight</Label>
              <Select
                value={formatting.fontWeight}
                onValueChange={(value) => setFormatting({ ...formatting, fontWeight: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Light (300)</SelectItem>
                  <SelectItem value="400">Normal (400)</SelectItem>
                  <SelectItem value="500">Medium (500)</SelectItem>
                  <SelectItem value="600">Semi-Bold (600)</SelectItem>
                  <SelectItem value="700">Bold (700)</SelectItem>
                  <SelectItem value="800">Extra Bold (800)</SelectItem>
                  <SelectItem value="900">Black (900)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textAlign">Text Alignment</Label>
              <Select
                value={formatting.textAlign}
                onValueChange={(value) => setFormatting({ ...formatting, textAlign: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textTransform">Text Transform</Label>
              <Select
                value={formatting.textTransform}
                onValueChange={(value) => setFormatting({ ...formatting, textTransform: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="uppercase">UPPERCASE</SelectItem>
                  <SelectItem value="lowercase">lowercase</SelectItem>
                  <SelectItem value="capitalize">Capitalize</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Text Color (hex)</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  value={formatting.color}
                  onChange={(e) => setFormatting({ ...formatting, color: e.target.value })}
                  placeholder="Leave empty for theme default"
                />
                {formatting.color && (
                  <div
                    className="w-12 h-10 rounded border"
                    style={{ backgroundColor: formatting.color }}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marginBottom">Bottom Margin: {formatting.marginBottom}px</Label>
              <Slider
                id="marginBottom"
                value={[formatting.marginBottom]}
                onValueChange={(value) => setFormatting({ ...formatting, marginBottom: value[0] })}
                min={0}
                max={80}
                step={4}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="letterSpacing">Letter Spacing: {formatting.letterSpacing}px</Label>
              <Slider
                id="letterSpacing"
                value={[formatting.letterSpacing]}
                onValueChange={(value) => setFormatting({ ...formatting, letterSpacing: value[0] })}
                min={-2}
                max={10}
                step={0.5}
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Preview</h3>
            <div className="bg-muted p-8 rounded-lg">
              <h2
                style={{
                  fontSize: `${formatting.fontSize}px`,
                  fontWeight: formatting.fontWeight,
                  textAlign: formatting.textAlign as any,
                  color: formatting.color || 'inherit',
                  marginBottom: `${formatting.marginBottom}px`,
                  textTransform: formatting.textTransform as any,
                  letterSpacing: `${formatting.letterSpacing}px`,
                  fontFamily: formatting.fontFamily || 'inherit',
                }}
              >
                Sample Section Title
              </h2>
              <p className="text-muted-foreground">This is how your section titles will appear</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Global Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
