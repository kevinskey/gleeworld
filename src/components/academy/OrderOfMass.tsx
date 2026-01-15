import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Music, 
  Save, 
  Check, 
  Loader2,
  BookOpen,
  Cross,
  Heart,
  HandHelping,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MassSong {
  mass_part: string;
  song_title: string;
  hymn_number: string;
  notes: string;
}

interface OrderOfMassProps {
  moduleId: string;
  moduleName: string;
  isLocked?: boolean;
}

// Standard parts of the Roman Catholic Mass
const MASS_PARTS = [
  { key: 'entrance', label: 'Entrance / Processional', icon: Music, category: 'Introductory Rites' },
  { key: 'penitential', label: 'Penitential Act / Kyrie', icon: Heart, category: 'Introductory Rites' },
  { key: 'gloria', label: 'Gloria', icon: Sparkles, category: 'Introductory Rites' },
  { key: 'responsorial_psalm', label: 'Responsorial Psalm', icon: BookOpen, category: 'Liturgy of the Word' },
  { key: 'gospel_acclamation', label: 'Gospel Acclamation (Alleluia)', icon: Cross, category: 'Liturgy of the Word' },
  { key: 'offertory', label: 'Offertory / Preparation of Gifts', icon: HandHelping, category: 'Liturgy of the Eucharist' },
  { key: 'sanctus', label: 'Sanctus (Holy, Holy, Holy)', icon: Sparkles, category: 'Liturgy of the Eucharist' },
  { key: 'memorial_acclamation', label: 'Memorial Acclamation', icon: Cross, category: 'Liturgy of the Eucharist' },
  { key: 'great_amen', label: 'Great Amen', icon: Sparkles, category: 'Liturgy of the Eucharist' },
  { key: 'lamb_of_god', label: 'Lamb of God (Agnus Dei)', icon: Heart, category: 'Communion Rite' },
  { key: 'communion', label: 'Communion', icon: HandHelping, category: 'Communion Rite' },
  { key: 'communion_meditation', label: 'Communion Meditation', icon: Heart, category: 'Communion Rite' },
  { key: 'recessional', label: 'Recessional / Closing Hymn', icon: Music, category: 'Concluding Rites' },
];

const OrderOfMass: React.FC<OrderOfMassProps> = ({ moduleId, moduleName, isLocked = false }) => {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Record<string, MassSong>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<Set<string>>(new Set());

  // Initialize empty song entries
  useEffect(() => {
    const initialSongs: Record<string, MassSong> = {};
    MASS_PARTS.forEach(part => {
      initialSongs[part.key] = {
        mass_part: part.key,
        song_title: '',
        hymn_number: '',
        notes: ''
      };
    });
    setSongs(initialSongs);
  }, []);

  // Fetch existing song selections
  useEffect(() => {
    const fetchSongs = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('lh100_mass_songs')
          .select('*')
          .eq('user_id', user.id)
          .eq('module_id', moduleId);

        if (error) throw error;

        if (data && data.length > 0) {
          setSongs(prev => {
            const updated = { ...prev };
            data.forEach(song => {
              if (updated[song.mass_part]) {
                updated[song.mass_part] = {
                  mass_part: song.mass_part,
                  song_title: song.song_title || '',
                  hymn_number: song.hymn_number || '',
                  notes: song.notes || ''
                };
              }
            });
            return updated;
          });
        }
      } catch (error) {
        console.error('Error fetching mass songs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, [user?.id, moduleId]);

  const handleInputChange = (partKey: string, field: keyof MassSong, value: string) => {
    setSongs(prev => ({
      ...prev,
      [partKey]: {
        ...prev[partKey],
        [field]: value
      }
    }));
    setHasChanges(prev => new Set(prev).add(partKey));
  };

  const saveSong = async (partKey: string) => {
    if (!user?.id) {
      toast.error('Please sign in to save your selections');
      return;
    }

    setSaving(partKey);
    const song = songs[partKey];

    try {
      const { error } = await supabase
        .from('lh100_mass_songs')
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          mass_part: partKey,
          song_title: song.song_title,
          hymn_number: song.hymn_number,
          notes: song.notes
        }, {
          onConflict: 'user_id,module_id,mass_part'
        });

      if (error) throw error;

      setHasChanges(prev => {
        const next = new Set(prev);
        next.delete(partKey);
        return next;
      });
      toast.success('Song saved successfully');
    } catch (error) {
      console.error('Error saving song:', error);
      toast.error('Failed to save song');
    } finally {
      setSaving(null);
    }
  };

  const saveAllSongs = async () => {
    if (!user?.id) {
      toast.error('Please sign in to save your selections');
      return;
    }

    setSaving('all');
    
    try {
      const upsertData = Object.values(songs).map(song => ({
        user_id: user.id,
        module_id: moduleId,
        mass_part: song.mass_part,
        song_title: song.song_title,
        hymn_number: song.hymn_number,
        notes: song.notes
      }));

      const { error } = await supabase
        .from('lh100_mass_songs')
        .upsert(upsertData, {
          onConflict: 'user_id,module_id,mass_part'
        });

      if (error) throw error;

      setHasChanges(new Set());
      toast.success('All songs saved successfully');
    } catch (error) {
      console.error('Error saving songs:', error);
      toast.error('Failed to save songs');
    } finally {
      setSaving(null);
    }
  };

  // Group parts by category
  const groupedParts = MASS_PARTS.reduce((acc, part) => {
    if (!acc[part.category]) {
      acc[part.category] = [];
    }
    acc[part.category].push(part);
    return acc;
  }, {} as Record<string, typeof MASS_PARTS>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cross className="h-5 w-5 text-primary" />
            Order of Mass
          </CardTitle>
          {hasChanges.size > 0 && (
            <Button 
              size="sm" 
              onClick={saveAllSongs}
              disabled={saving === 'all'}
            >
              {saving === 'all' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save All
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Plan your music selections for {moduleName}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedParts).map(([category, parts]) => (
          <div key={category} className="space-y-3">
            <h4 className="text-sm font-semibold text-primary border-b border-primary/20 pb-1">
              {category}
            </h4>
            <div className="grid gap-3">
              {parts.map((part) => {
                const Icon = part.icon;
                const song = songs[part.key];
                const hasUnsavedChanges = hasChanges.has(part.key);
                
                return (
                  <div 
                    key={part.key}
                    className={`p-3 rounded-lg border transition-colors ${
                      hasUnsavedChanges 
                        ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/10' 
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="font-medium text-sm">
                            {part.label}
                          </Label>
                          {hasUnsavedChanges && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              Unsaved
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Song Title</Label>
                            <Input
                              placeholder="Enter song title..."
                              value={song?.song_title || ''}
                              onChange={(e) => handleInputChange(part.key, 'song_title', e.target.value)}
                              disabled={isLocked}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Hymn #</Label>
                            <Input
                              placeholder="e.g., #234"
                              value={song?.hymn_number || ''}
                              onChange={(e) => handleInputChange(part.key, 'hymn_number', e.target.value)}
                              disabled={isLocked}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Input
                              placeholder="Notes (optional)..."
                              value={song?.notes || ''}
                              onChange={(e) => handleInputChange(part.key, 'notes', e.target.value)}
                              disabled={isLocked}
                              className="h-8 text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant={hasUnsavedChanges ? "default" : "ghost"}
                            onClick={() => saveSong(part.key)}
                            disabled={saving === part.key || isLocked || !hasUnsavedChanges}
                            className="h-8 px-2"
                          >
                            {saving === part.key ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : hasUnsavedChanges ? (
                              <Save className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default OrderOfMass;
