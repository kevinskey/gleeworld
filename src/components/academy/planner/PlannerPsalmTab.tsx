import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Save, Edit2, X, BookOpen, Music2 } from 'lucide-react';
import { LiturgicalWeek } from '@/hooks/useLiturgicalWeeks';

interface PlannerPsalmTabProps {
  week: LiturgicalWeek;
  onUpdate: (id: string, updates: Partial<LiturgicalWeek>) => Promise<any>;
  isAdmin?: boolean;
}

export const PlannerPsalmTab: React.FC<PlannerPsalmTabProps> = ({ week, onUpdate, isAdmin = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    psalm: week.psalm || '',
    psalm_verses: week.psalm_verses || '',
    psalm_refrain: week.psalm_refrain || '',
  });

  // Local state for psalm planner details (could be stored in notes or separate fields)
  const [psalmDetails, setPsalmDetails] = useState({
    musicalSetting: '',
    cantor: '',
    choirSings: true,
    congregationSings: true,
  });

  const handleSave = async () => {
    await onUpdate(week.id, formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      psalm: week.psalm || '',
      psalm_verses: week.psalm_verses || '',
      psalm_refrain: week.psalm_refrain || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Psalm Planning
        </h3>
        {isAdmin && !isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        {isEditing && (
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
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Psalm Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Psalm Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>Psalm Number</Label>
                  <Input
                    value={formData.psalm}
                    onChange={(e) => setFormData({ ...formData, psalm: e.target.value })}
                    placeholder="e.g., Psalm 23"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Verses</Label>
                  <Input
                    value={formData.psalm_verses}
                    onChange={(e) => setFormData({ ...formData, psalm_verses: e.target.value })}
                    placeholder="e.g., 1-4, 5-6"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Refrain</Label>
                  <Textarea
                    value={formData.psalm_refrain}
                    onChange={(e) => setFormData({ ...formData, psalm_refrain: e.target.value })}
                    placeholder="Enter the responsorial refrain..."
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Psalm Number</p>
                  <p className="text-xl font-semibold">{week.psalm || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Verses</p>
                  <p className="text-lg">{week.psalm_verses || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Refrain</p>
                  <p className="text-lg italic">"{week.psalm_refrain || 'Not set'}"</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Musical Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Music2 className="h-4 w-4" />
              Musical Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Musical Setting / Composer</Label>
              <Input
                value={psalmDetails.musicalSetting}
                onChange={(e) => setPsalmDetails({ ...psalmDetails, musicalSetting: e.target.value })}
                placeholder="e.g., Haugen, Joncas, Gelineau"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Cantor</Label>
              <Input
                value={psalmDetails.cantor}
                onChange={(e) => setPsalmDetails({ ...psalmDetails, cantor: e.target.value })}
                placeholder="Cantor name"
                disabled={!isAdmin}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="choir-sings">Choir Sings Verses</Label>
              <Switch
                id="choir-sings"
                checked={psalmDetails.choirSings}
                onCheckedChange={(checked) => setPsalmDetails({ ...psalmDetails, choirSings: checked })}
                disabled={!isAdmin}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="congregation-sings">Congregation Sings Refrain</Label>
              <Switch
                id="congregation-sings"
                checked={psalmDetails.congregationSings}
                onCheckedChange={(checked) => setPsalmDetails({ ...psalmDetails, congregationSings: checked })}
                disabled={!isAdmin}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Psalm Preview Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Psalm Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <h4 className="text-2xl font-bold text-primary">{week.psalm || 'Psalm'}</h4>
            {week.psalm_verses && (
              <p className="text-muted-foreground">Verses: {week.psalm_verses}</p>
            )}
            {week.psalm_refrain && (
              <blockquote className="text-xl italic text-foreground border-l-4 border-primary pl-4 text-left max-w-lg mx-auto">
                "{week.psalm_refrain}"
              </blockquote>
            )}
            {psalmDetails.musicalSetting && (
              <p className="text-sm text-muted-foreground">Setting: {psalmDetails.musicalSetting}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
