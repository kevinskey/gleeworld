import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Edit2, X, RefreshCw, Loader2, BookOpen } from 'lucide-react';
import { LiturgicalWeek, useLiturgicalMusicPlan } from '@/hooks/useLiturgicalWeeks';
import { useUSCCBSync } from '@/hooks/useUSCCBSync';
import { PlannerReadingsSection } from './PlannerReadingsSection';
import { Separator } from '@/components/ui/separator';

interface PlannerOverviewTabProps {
  week: LiturgicalWeek;
  onUpdate: (id: string, updates: Partial<LiturgicalWeek>) => Promise<any>;
  isAdmin?: boolean;
}

const SEASONS = ['Ordinary Time', 'Advent', 'Christmas', 'Lent', 'Holy Week', 'Easter'];

export const PlannerOverviewTab: React.FC<PlannerOverviewTabProps> = ({ week, onUpdate, isAdmin = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { syncLiturgicalData, liturgicalData, isLoading: isSyncing, clearData } = useUSCCBSync();
  const { musicPlan } = useLiturgicalMusicPlan(week.id);
  const [formData, setFormData] = useState({
    sunday_title: week.sunday_title || '',
    season: week.season || '',
    psalm: week.psalm || '',
    gospel: week.gospel || '',
    theme: week.theme || '',
    notes: week.notes || '',
  });

  // Auto-load USCCB data when week changes
  useEffect(() => {
    const dateStr = week.sunday_date || week.week_of;
    if (dateStr) {
      syncLiturgicalData(dateStr);
    }
    return () => clearData();
  }, [week.id]);

  const handleSave = async () => {
    await onUpdate(week.id, formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      sunday_title: week.sunday_title || '',
      season: week.season || '',
      psalm: week.psalm || '',
      gospel: week.gospel || '',
      theme: week.theme || '',
      notes: week.notes || '',
    });
    setIsEditing(false);
  };

  const handleRefreshUSCCB = () => {
    const dateStr = week.sunday_date || week.week_of;
    if (dateStr) {
      syncLiturgicalData(dateStr);
    }
  };

  if (!isEditing) {
    return (
      <div className="space-y-6">
        {/* Header with Edit/Refresh buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h3 className="text-lg font-semibold">Liturgical Details</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshUSCCB}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isSyncing ? 'Loading...' : 'Load USCCB Data'}
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Title</p>
            <p className="text-sm font-semibold truncate">{week.sunday_title || week.title || 'Not set'}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Season</p>
            <p className="text-sm font-semibold">{week.season || 'Not set'}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Psalm</p>
            <p className="text-sm font-semibold truncate">{week.psalm || 'Not set'}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Gospel</p>
            <p className="text-sm font-semibold truncate">{week.gospel || liturgicalData?.readings?.gospel?.citation || 'Not set'}</p>
          </Card>
        </div>

        {/* Theme and Notes (collapsible on mobile) */}
        {(week.theme || week.notes) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {week.theme && (
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Theme</p>
                <p className="text-sm">{week.theme}</p>
              </Card>
            )}
            {week.notes && (
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{week.notes}</p>
              </Card>
            )}
          </div>
        )}

        <Separator />

        {/* USCCB Readings Section */}
        <PlannerReadingsSection 
          liturgicalData={liturgicalData} 
          sundayDate={week.sunday_date || week.week_of}
          musicPlan={musicPlan}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Edit Liturgical Details</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sunday_title">Title</Label>
          <Input
            id="sunday_title"
            value={formData.sunday_title}
            onChange={(e) => setFormData({ ...formData, sunday_title: e.target.value })}
            placeholder="e.g., 2nd Sunday of Ordinary Time"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="season">Season</Label>
          <Select
            value={formData.season}
            onValueChange={(value) => setFormData({ ...formData, season: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map((season) => (
                <SelectItem key={season} value={season}>{season}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="psalm">Psalm</Label>
          <Input
            id="psalm"
            value={formData.psalm}
            onChange={(e) => setFormData({ ...formData, psalm: e.target.value })}
            placeholder="e.g., Psalm 40"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gospel">Gospel</Label>
          <Input
            id="gospel"
            value={formData.gospel}
            onChange={(e) => setFormData({ ...formData, gospel: e.target.value })}
            placeholder="e.g., John 1:29-34"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="theme">Theme</Label>
          <Input
            id="theme"
            value={formData.theme}
            onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
            placeholder="Enter a theme for this Sunday..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any notes..."
            rows={4}
          />
        </div>
      </div>
    </div>
  );
};
