import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Edit2, X } from 'lucide-react';
import { LiturgicalWeek } from '@/hooks/useLiturgicalWeeks';

interface PlannerOverviewTabProps {
  week: LiturgicalWeek;
  onUpdate: (id: string, updates: Partial<LiturgicalWeek>) => Promise<any>;
  isAdmin?: boolean;
}

const SEASONS = ['Ordinary Time', 'Advent', 'Christmas', 'Lent', 'Holy Week', 'Easter'];

export const PlannerOverviewTab: React.FC<PlannerOverviewTabProps> = ({ week, onUpdate, isAdmin = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    sunday_title: week.sunday_title || '',
    season: week.season || '',
    psalm: week.psalm || '',
    gospel: week.gospel || '',
    theme: week.theme || '',
    notes: week.notes || '',
  });

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

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Liturgical Details</h3>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Title</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{week.sunday_title || week.title || 'Not set'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Season</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{week.season || 'Not set'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Psalm</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{week.psalm || 'Not set'}</p>
              {week.psalm_refrain && (
                <p className="text-sm text-muted-foreground mt-1">"{week.psalm_refrain}"</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gospel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{week.gospel || 'Not set'}</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">{week.theme || 'No theme set'}</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base whitespace-pre-wrap">{week.notes || 'No notes'}</p>
            </CardContent>
          </Card>
        </div>
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
