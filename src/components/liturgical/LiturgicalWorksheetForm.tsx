import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Music, BookOpen, FileText, Download, Loader2, Upload, Eye } from 'lucide-react';
import { LiturgicalWorksheet } from '@/hooks/useLiturgicalWorksheets';
import { useUSCCBSync } from '@/hooks/useUSCCBSync';
import { useEnhancedLiturgicalData } from '@/hooks/useEnhancedLiturgicalData';
import { MusicXMLViewer } from './MusicXMLViewer';

interface LiturgicalWorksheetFormProps {
  worksheet?: LiturgicalWorksheet;
  onSave: (data: Partial<LiturgicalWorksheet>) => Promise<{ success: boolean }>;
  onCancel: () => void;
}

export const LiturgicalWorksheetForm = ({ worksheet, onSave, onCancel }: LiturgicalWorksheetFormProps) => {
  const { syncLiturgicalData, liturgicalData, isLoading, error } = useUSCCBSync();
  const { data: enhancedData, loading: enhancedLoading, fetchEnhancedLiturgicalData } = useEnhancedLiturgicalData();
  const [formData, setFormData] = useState({
    liturgical_date: worksheet?.liturgical_date || '',
    liturgical_season: worksheet?.liturgical_season || '',
    liturgical_color: worksheet?.liturgical_color || '',
    saint_of_day: worksheet?.saint_of_day || '',
    theme: worksheet?.theme || '',
    readings: {
      first_reading: worksheet?.readings?.first_reading || '',
      psalm: worksheet?.readings?.psalm || '',
      second_reading: worksheet?.readings?.second_reading || '',
      gospel: worksheet?.readings?.gospel || '',
    },
    responsorial_psalm_musicxml: worksheet?.responsorial_psalm_musicxml || '',
    music_selections: {
      entrance_hymn: worksheet?.music_selections?.entrance_hymn || '',
      responsorial_psalm: worksheet?.music_selections?.responsorial_psalm || '',
      alleluia: worksheet?.music_selections?.alleluia || '',
      offertory: worksheet?.music_selections?.offertory || '',
      communion: worksheet?.music_selections?.communion || '',
      closing_hymn: worksheet?.music_selections?.closing_hymn || '',
    },
    special_instructions: worksheet?.special_instructions || '',
    notes: worksheet?.notes || '',
    status: worksheet?.status || 'draft' as const,
  });

  const [saving, setSaving] = useState(false);
  const [showMusicXMLViewer, setShowMusicXMLViewer] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReadingChange = (reading: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      readings: { ...prev.readings, [reading]: value }
    }));
  };

  const handleMusicChange = (music: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      music_selections: { ...prev.music_selections, [music]: value }
    }));
  };

  const handleMusicXMLUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Accept MusicXML files regardless of MIME type, check by extension
      const isValidFile = file.name.toLowerCase().endsWith('.xml') || 
                         file.name.toLowerCase().endsWith('.musicxml') ||
                         file.type === 'text/xml' ||
                         file.type === 'application/xml';
      
      if (isValidFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setFormData(prev => ({
            ...prev,
            responsorial_psalm_musicxml: result
          }));
        };
        reader.readAsText(file);
      } else {
        alert('Please select a valid MusicXML file (.xml or .musicxml)');
      }
    }
  };

  const handleAutoPopulate = async () => {
    if (!formData.liturgical_date) {
      alert('Please select a liturgical date first');
      return;
    }
    
    const data = await syncLiturgicalData(formData.liturgical_date);
    if (data) {
      // Auto-populate readings from enhanced USCCB data
      setFormData(prev => ({
        ...prev,
        liturgical_season: data.season || prev.liturgical_season,
        liturgical_color: data.liturgical_color || prev.liturgical_color,
        theme: data.title || prev.theme,
        readings: {
          first_reading: data.readings.first_reading ? 
            `${data.readings.first_reading.citation}\n\n${data.readings.first_reading.content}` : 
            prev.readings.first_reading,
          psalm: data.readings.responsorial_psalm ? 
            `${data.readings.responsorial_psalm.citation}\n\n${data.readings.responsorial_psalm.content}` : 
            prev.readings.psalm,
          second_reading: data.readings.second_reading ? 
            `${data.readings.second_reading.citation}\n\n${data.readings.second_reading.content}` : 
            prev.readings.second_reading,
          gospel: data.readings.gospel ? 
            `${data.readings.gospel.citation}\n\n${data.readings.gospel.content}` : 
            prev.readings.gospel,
        },
        saint_of_day: data.saint_of_day || prev.saint_of_day
      }));
    }
  };

  const handleEnhancedAutoPopulate = async () => {
    if (!formData.liturgical_date) {
      alert('Please select a liturgical date first');
      return;
    }
    
    const enhancedData = await fetchEnhancedLiturgicalData(formData.liturgical_date);
    if (enhancedData) {
      // Auto-populate with enhanced liturgical data
      setFormData(prev => ({
        ...prev,
        liturgical_season: enhancedData.season,
        theme: enhancedData.celebration_name || `${enhancedData.season} - Week ${enhancedData.season_week}`,
        readings: {
          first_reading: enhancedData.readings.first_reading?.citation || prev.readings.first_reading,
          psalm: enhancedData.readings.psalm?.citation || prev.readings.psalm,
          second_reading: enhancedData.readings.second_reading?.citation || prev.readings.second_reading,
          gospel: enhancedData.readings.gospel?.citation || prev.readings.gospel,
        },
        music_selections: {
          entrance_hymn: enhancedData.music_suggestions.entrance_hymn[0] || prev.music_selections.entrance_hymn,
          responsorial_psalm: enhancedData.music_suggestions.responsorial_psalm[0] || prev.music_selections.responsorial_psalm,
          alleluia: enhancedData.music_suggestions.alleluia[0] || prev.music_selections.alleluia,
          offertory: enhancedData.music_suggestions.offertory[0] || prev.music_selections.offertory,
          communion: enhancedData.music_suggestions.communion[0] || prev.music_selections.communion,
          closing_hymn: enhancedData.music_suggestions.closing_hymn[0] || prev.music_selections.closing_hymn,
        },
        special_instructions: enhancedData.additional_notes || prev.special_instructions,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const result = await onSave(formData);
    
    setSaving(false);
    if (result.success) {
      onCancel(); // Close form on success
    }
  };

  const liturgicalSeasons = [
    'Advent',
    'Christmas',
    'Ordinary Time',
    'Lent',
    'Easter',
    'Pentecost'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {worksheet ? 'Edit Liturgical Worksheet' : 'New Liturgical Worksheet'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="liturgical_date">Liturgical Date</Label>
              <div className="flex gap-2">
                <Input
                  id="liturgical_date"
                  type="date"
                  value={formData.liturgical_date}
                  onChange={(e) => handleInputChange('liturgical_date', e.target.value)}
                  required
                  className="flex-1"
                />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoPopulate}
                    disabled={isLoading || !formData.liturgical_date}
                    className="whitespace-nowrap"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    USCCB
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEnhancedAutoPopulate}
                    disabled={enhancedLoading || !formData.liturgical_date}
                    className="whitespace-nowrap"
                  >
                    {enhancedLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                    Enhanced
                  </Button>
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive mt-1">{error}</p>
              )}
            </div>
            <div>
              <Label htmlFor="liturgical_season">Liturgical Season</Label>
              <Select
                value={formData.liturgical_season}
                onValueChange={(value) => handleInputChange('liturgical_season', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  {liturgicalSeasons.map((season) => (
                    <SelectItem key={season} value={season}>
                      {season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="theme">Theme</Label>
            <Input
              id="theme"
              value={formData.theme}
              onChange={(e) => handleInputChange('theme', e.target.value)}
              placeholder="Weekly liturgical theme"
            />
          </div>

          {/* Readings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-4 w-4" />
                Scripture Readings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_reading">First Reading</Label>
                  <Input
                    id="first_reading"
                    value={formData.readings.first_reading}
                    onChange={(e) => handleReadingChange('first_reading', e.target.value)}
                    placeholder="e.g., Isaiah 43:16-21"
                  />
                </div>
                <div>
                  <Label htmlFor="psalm">Responsorial Psalm</Label>
                  <Input
                    id="psalm"
                    value={formData.readings.psalm}
                    onChange={(e) => handleReadingChange('psalm', e.target.value)}
                    placeholder="e.g., Psalm 126"
                  />
                </div>
                <div>
                  <Label htmlFor="second_reading">Second Reading</Label>
                  <Input
                    id="second_reading"
                    value={formData.readings.second_reading}
                    onChange={(e) => handleReadingChange('second_reading', e.target.value)}
                    placeholder="e.g., Philippians 3:8-14"
                  />
                </div>
                <div>
                  <Label htmlFor="gospel">Gospel</Label>
                  <Input
                    id="gospel"
                    value={formData.readings.gospel}
                    onChange={(e) => handleReadingChange('gospel', e.target.value)}
                    placeholder="e.g., John 12:12-16"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Responsorial Psalm MusicXML */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Music className="h-4 w-4" />
                Responsorial Psalm Composition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="musicxml-upload">Upload MusicXML</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="musicxml-upload"
                    type="file"
                    accept=".xml,.musicxml"
                    onChange={handleMusicXMLUpload}
                    className="flex-1"
                  />
                  {formData.responsorial_psalm_musicxml && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMusicXMLViewer(true)}
                      className="whitespace-nowrap"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a MusicXML file for the responsorial psalm composition
                </p>
              </div>
              
              {showMusicXMLViewer && formData.responsorial_psalm_musicxml && (
                <MusicXMLViewer
                  musicxml={formData.responsorial_psalm_musicxml}
                  onClose={() => setShowMusicXMLViewer(false)}
                  title="Responsorial Psalm Composition"
                />
              )}
            </CardContent>
          </Card>

          {/* Music Selections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Music className="h-4 w-4" />
                Music Selections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entrance_hymn">Entrance Hymn</Label>
                  <Input
                    id="entrance_hymn"
                    value={formData.music_selections.entrance_hymn}
                    onChange={(e) => handleMusicChange('entrance_hymn', e.target.value)}
                    placeholder="Opening hymn title"
                  />
                </div>
                <div>
                  <Label htmlFor="responsorial_psalm_music">Responsorial Psalm Music</Label>
                  <Input
                    id="responsorial_psalm_music"
                    value={formData.music_selections.responsorial_psalm}
                    onChange={(e) => handleMusicChange('responsorial_psalm', e.target.value)}
                    placeholder="Psalm response melody"
                  />
                </div>
                <div>
                  <Label htmlFor="alleluia">Alleluia/Gospel Acclamation</Label>
                  <Textarea
                    id="alleluia"
                    value={formData.music_selections.alleluia}
                    onChange={(e) => handleMusicChange('alleluia', e.target.value)}
                    placeholder="Gospel acclamation"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="offertory">Offertory</Label>
                  <Input
                    id="offertory"
                    value={formData.music_selections.offertory}
                    onChange={(e) => handleMusicChange('offertory', e.target.value)}
                    placeholder="Preparation of gifts music"
                  />
                </div>
                <div>
                  <Label htmlFor="communion">Communion Hymn</Label>
                  <Input
                    id="communion"
                    value={formData.music_selections.communion}
                    onChange={(e) => handleMusicChange('communion', e.target.value)}
                    placeholder="Communion processional"
                  />
                </div>
                <div>
                  <Label htmlFor="closing_hymn">Closing Hymn</Label>
                  <Input
                    id="closing_hymn"
                    value={formData.music_selections.closing_hymn}
                    onChange={(e) => handleMusicChange('closing_hymn', e.target.value)}
                    placeholder="Recessional hymn"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-4 w-4" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  id="special_instructions"
                  value={formData.special_instructions}
                  onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                  placeholder="Any special liturgical instructions or notes for ministers..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="notes">Planning Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Personal planning notes, ideas, or reminders..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : (worksheet ? 'Update Worksheet' : 'Create Worksheet')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};