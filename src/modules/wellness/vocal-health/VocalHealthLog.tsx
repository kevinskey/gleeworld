import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  Droplets, 
  Moon, 
  AlertTriangle, 
  TrendingUp,
  Calendar as CalendarIcon,
  Plus,
  Download
} from 'lucide-react';


interface VocalHealthEntry {
  id: string;
  date: string;
  vocal_status: 'Healthy' | 'Fatigued' | 'Sore' | 'Injured';
  hydration_level: 'Low' | 'Normal' | 'High';
  hours_slept: number;
  notes: string;
}

const getStatusEmoji = (status: string) => {
  switch (status) {
    case 'Healthy': return '😊';
    case 'Fatigued': return '😴';
    case 'Sore': return '😬';
    case 'Injured': return '🤕';
    default: return '❓';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Healthy': return 'bg-green-100 text-green-800';
    case 'Fatigued': return 'bg-yellow-100 text-yellow-800';
    case 'Sore': return 'bg-orange-100 text-orange-800';
    case 'Injured': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getHydrationEmoji = (level: string) => {
  switch (level) {
    case 'High': return '💧💧💧';
    case 'Normal': return '💧💧';
    case 'Low': return '💧';
    default: return '❓';
  }
};

export const VocalHealthLog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<VocalHealthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [hasAlert, setHasAlert] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    vocal_status: 'Healthy' as const,
    hydration_level: 'Normal' as const,
    hours_slept: 8,
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchEntries();
      checkHealthAlert();
    }
  }, [user]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_vocal_health_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching vocal health entries:', error);
      toast({
        title: "Error",
        description: "Failed to load vocal health entries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkHealthAlert = async () => {
    try {
      const { data, error } = await supabase
        .rpc('check_vocal_health_alerts', { target_user_id: user?.id });

      if (error) throw error;
      setHasAlert(data || false);
    } catch (error) {
      console.error('Error checking health alerts:', error);
    }
  };

  const submitEntry = async () => {
    try {
      const { error } = await supabase
        .from('gw_vocal_health_entries')
        .upsert({
          user_id: user?.id,
          ...newEntry
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vocal health entry saved"
      });

      setShowAddDialog(false);
      setNewEntry({
        date: format(new Date(), 'yyyy-MM-dd'),
        vocal_status: 'Healthy',
        hydration_level: 'Normal',
        hours_slept: 8,
        notes: ''
      });
      
      fetchEntries();
      checkHealthAlert();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({
        title: "Error",
        description: "Failed to save entry",
        variant: "destructive"
      });
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Date', 'Vocal Status', 'Hydration Level', 'Hours Slept', 'Notes'],
      ...entries.map(entry => [
        entry.date,
        entry.vocal_status,
        entry.hydration_level,
        entry.hours_slept.toString(),
        entry.notes.replace(/,/g, ';') // Replace commas to avoid CSV issues
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocal-health-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = entries.slice(0, 30).reverse().map(entry => ({
    date: format(new Date(entry.date), 'MM/dd'),
    status: entry.vocal_status === 'Healthy' ? 4 : 
           entry.vocal_status === 'Fatigued' ? 3 :
           entry.vocal_status === 'Sore' ? 2 : 1,
    sleep: entry.hours_slept,
    hydration: entry.hydration_level === 'High' ? 3 :
              entry.hydration_level === 'Normal' ? 2 : 1
  }));

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vocal Health Log</h2>
          <p className="text-muted-foreground">Track your daily wellness for optimal vocal performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Daily Check-in
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Daily Vocal Health Check-in</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                  />
                </div>

                <div>
                  <Label>How do your vocals feel today?</Label>
                  <Select 
                    value={newEntry.vocal_status} 
                    onValueChange={(value: any) => setNewEntry({...newEntry, vocal_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Healthy">😊 Healthy</SelectItem>
                      <SelectItem value="Fatigued">😴 Fatigued</SelectItem>
                      <SelectItem value="Sore">😬 Sore</SelectItem>
                      <SelectItem value="Injured">🤕 Injured</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Hydration Level</Label>
                  <Select 
                    value={newEntry.hydration_level} 
                    onValueChange={(value: any) => setNewEntry({...newEntry, hydration_level: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">💧💧💧 High</SelectItem>
                      <SelectItem value="Normal">💧💧 Normal</SelectItem>
                      <SelectItem value="Low">💧 Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sleep">Hours of Sleep</Label>
                  <Input
                    id="sleep"
                    type="number"
                    min="0"
                    max="24"
                    value={newEntry.hours_slept}
                    onChange={(e) => setNewEntry({...newEntry, hours_slept: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any specific observations or concerns..."
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                  />
                </div>

                <Button onClick={submitEntry} className="w-full">
                  Save Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Health Alert */}
      {hasAlert && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Vocal Health Alert:</strong> You've reported fatigue 3+ times in the last 5 days. 
            Consider rest, hydration, and consulting a vocal coach or healthcare provider.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Recent Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {entries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getStatusEmoji(entry.vocal_status)}</span>
                    <div>
                      <div className="font-medium">{format(new Date(entry.date), 'MMM dd, yyyy')}</div>
                      <div className="text-sm text-muted-foreground">
                        {getHydrationEmoji(entry.hydration_level)} • {entry.hours_slept}h sleep
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(entry.vocal_status)}>
                    {entry.vocal_status}
                  </Badge>
                </div>
              ))}
              {entries.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No entries yet. Start tracking your vocal health!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Health Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Health Trends (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[1, 4]} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'status') {
                        const statusMap = {4: 'Healthy', 3: 'Fatigued', 2: 'Sore', 1: 'Injured'};
                        return [statusMap[value as keyof typeof statusMap], 'Vocal Status'];
                      }
                      if (name === 'hydration') {
                        const hydrationMap = {3: 'High', 2: 'Normal', 1: 'Low'};
                        return [hydrationMap[value as keyof typeof hydrationMap], 'Hydration'];
                      }
                      return [value, name === 'sleep' ? 'Hours of Sleep' : name];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="status" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="status"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sleep" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    name="sleep"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {entries.filter(e => e.vocal_status === 'Healthy').length}
                </div>
                <div className="text-sm text-muted-foreground">Healthy Days</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Droplets className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">
                  {entries.filter(e => e.hydration_level === 'High').length}
                </div>
                <div className="text-sm text-muted-foreground">Well-Hydrated Days</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Moon className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {entries.length > 0 ? Math.round(entries.reduce((sum, e) => sum + e.hours_slept, 0) / entries.length) : 0}h
                </div>
                <div className="text-sm text-muted-foreground">Avg Sleep</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};