import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale, Plus, Trash2, AlertCircle } from 'lucide-react';
interface GradingItem {
  item: string;
  percentage: number;
}
interface Props {
  gradingBreakdown: GradingItem[];
  gradingScale: Record<string, string>;
  onChange: (breakdown: GradingItem[]) => void;
  onScaleChange: (scale: Record<string, string>) => void;
}
export const GradingBreakdownEditor: React.FC<Props> = ({
  gradingBreakdown,
  gradingScale,
  onChange,
  onScaleChange
}) => {
  const totalPercentage = gradingBreakdown.reduce((sum, item) => sum + item.percentage, 0);
  const addItem = () => {
    onChange([...gradingBreakdown, {
      item: '',
      percentage: 0
    }]);
  };
  const updateItem = (index: number, field: keyof GradingItem, value: string | number) => {
    onChange(gradingBreakdown.map((item, i) => i === index ? {
      ...item,
      [field]: value
    } : item));
  };
  const removeItem = (index: number) => {
    onChange(gradingBreakdown.filter((_, i) => i !== index));
  };
  const updateScale = (grade: string, value: string) => {
    onScaleChange({
      ...gradingScale,
      [grade]: value
    });
  };
  return <div className="space-y-6">
      {/* Grading Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Grading Breakdown
            </CardTitle>
            <p className="text-sm mt-1 text-secondary-foreground">
              Define how grades are calculated
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {gradingBreakdown.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-primary-foreground">No grading items defined yet.</p>
              <p className="text-sm mt-1 text-primary-foreground">Click "Add Item" to define grade components.</p>
            </div> : <>
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div className="col-span-8">Assignment/Category</div>
                <div className="col-span-3 text-right">Percentage</div>
                <div className="col-span-1"></div>
              </div>
              
              {gradingBreakdown.map((item, index) => <div key={index} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-8">
                    <Input value={item.item} onChange={e => updateItem(index, 'item', e.target.value)} placeholder="e.g., Participation, Midterm Exam, Final Project" />
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <Input type="number" value={item.percentage} onChange={e => updateItem(index, 'percentage', parseInt(e.target.value) || 0)} className="pr-8" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>)}
              
              {/* Total */}
              <div className="grid grid-cols-12 gap-4 items-center pt-4 border-t">
                <div className="col-span-8 font-semibold">Total</div>
                <div className="col-span-3 text-right">
                  <span className={`font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                    {totalPercentage}%
                  </span>
                </div>
                <div className="col-span-1"></div>
              </div>
              
              {totalPercentage !== 100 && <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">
                    Grading breakdown should total 100%. Current total: {totalPercentage}%
                  </span>
                </div>}
            </>}
        </CardContent>
      </Card>

      {/* Grading Scale */}
      <Card>
        <CardHeader>
          <CardTitle>Grading Scale</CardTitle>
          <p className="text-sm text-muted-foreground">
            Define the percentage ranges for each letter grade
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(gradingScale).map(([grade, range]) => <div key={grade} className="space-y-2">
                <Label className="text-lg font-bold">{grade}</Label>
                <Input value={range} onChange={e => updateScale(grade, e.target.value)} placeholder="e.g., 90-100" />
              </div>)}
          </div>
        </CardContent>
      </Card>
    </div>;
};