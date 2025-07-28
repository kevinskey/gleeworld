import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScholarshipForm } from './ScholarshipForm';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, RefreshCw, ExternalLink, Calendar, DollarSign, Users, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

interface Scholarship {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  amount?: string;
  eligibility?: string;
  tags?: string[];
  link?: string;
  source: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ScholarshipManager = () => {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchScholarships();
  }, []);

  const fetchScholarships = async () => {
    try {
      const { data, error } = await supabase
        .from('scholarships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScholarships(data || []);
    } catch (error: any) {
      console.error('Error fetching scholarships:', error);
      toast.error('Failed to fetch scholarships');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateScholarships = async () => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-scholarships');
      
      if (error) throw error;
      
      toast.success(`Updated scholarships: ${data.inserted} new, ${data.updated} updated`);
      await fetchScholarships();
    } catch (error: any) {
      console.error('Error updating scholarships:', error);
      toast.error('Failed to update scholarships from external sources');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteScholarship = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scholarships')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Scholarship deleted successfully');
      setScholarships(scholarships.filter(s => s.id !== id));
    } catch (error: any) {
      console.error('Error deleting scholarship:', error);
      toast.error('Failed to delete scholarship');
    }
  };

  const handleToggleActive = async (scholarship: Scholarship) => {
    try {
      const { error } = await supabase
        .from('scholarships')
        .update({ is_active: !scholarship.is_active })
        .eq('id', scholarship.id);

      if (error) throw error;
      
      toast.success(`Scholarship ${!scholarship.is_active ? 'activated' : 'deactivated'}`);
      setScholarships(scholarships.map(s => 
        s.id === scholarship.id ? { ...s, is_active: !s.is_active } : s
      ));
    } catch (error: any) {
      console.error('Error toggling scholarship status:', error);
      toast.error('Failed to update scholarship status');
    }
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingScholarship(null);
    fetchScholarships();
  };

  const filteredScholarships = scholarships.filter(scholarship =>
    scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scholarship.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scholarship.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const manualScholarships = filteredScholarships.filter(s => s.source === 'manual');
  const autoScholarships = filteredScholarships.filter(s => s.source !== 'manual');

  if (showForm) {
    return (
      <ScholarshipForm
        scholarship={editingScholarship}
        onSubmit={handleFormSubmit}
        onCancel={() => {
          setShowForm(false);
          setEditingScholarship(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scholarship Management</h1>
          <p className="text-muted-foreground">Manage local scholarships and update from external sources</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleUpdateScholarships}
            disabled={updating}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
            {updating ? 'Updating...' : 'Update from Sources'}
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Scholarship
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search scholarships..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{scholarships.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Manual</p>
                <p className="text-2xl font-bold">{manualScholarships.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Auto-Updated</p>
                <p className="text-2xl font-bold">{autoScholarships.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{scholarships.filter(s => s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading scholarships...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Manual Scholarships */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Manual Scholarships ({manualScholarships.length})
            </h2>
            {manualScholarships.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No manual scholarships added yet.</p>
                  <Button onClick={() => setShowForm(true)} className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Scholarship
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {manualScholarships.map((scholarship) => (
                  <ScholarshipCard
                    key={scholarship.id}
                    scholarship={scholarship}
                    onEdit={() => {
                      setEditingScholarship(scholarship);
                      setShowForm(true);
                    }}
                    onDelete={() => handleDeleteScholarship(scholarship.id)}
                    onToggleActive={() => handleToggleActive(scholarship)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Auto-Updated Scholarships */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              External Source Scholarships ({autoScholarships.length})
            </h2>
            {autoScholarships.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No scholarships from external sources yet.</p>
                  <Button onClick={handleUpdateScholarships} disabled={updating} className="mt-2">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update from Sources
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {autoScholarships.map((scholarship) => (
                  <ScholarshipCard
                    key={scholarship.id}
                    scholarship={scholarship}
                    onEdit={() => {
                      setEditingScholarship(scholarship);
                      setShowForm(true);
                    }}
                    onDelete={() => handleDeleteScholarship(scholarship.id)}
                    onToggleActive={() => handleToggleActive(scholarship)}
                    isAutoGenerated
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

interface ScholarshipCardProps {
  scholarship: Scholarship;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isAutoGenerated?: boolean;
}

const ScholarshipCard = ({ scholarship, onEdit, onDelete, onToggleActive, isAutoGenerated }: ScholarshipCardProps) => {
  const isExpired = scholarship.deadline && new Date(scholarship.deadline) < new Date();

  return (
    <Card className={`${!scholarship.is_active ? 'opacity-60' : ''} ${isExpired ? 'border-red-200 bg-red-50/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{scholarship.title}</CardTitle>
              {scholarship.is_featured && (
                <Badge variant="secondary">Featured</Badge>
              )}
              {!scholarship.is_active && (
                <Badge variant="outline">Inactive</Badge>
              )}
              {isExpired && (
                <Badge variant="destructive">Expired</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {isAutoGenerated ? scholarship.source : 'Manual'}
              </Badge>
              {scholarship.deadline && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Due: {format(new Date(scholarship.deadline), 'MMM d, yyyy')}</span>
                </div>
              )}
              {scholarship.amount && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>{scholarship.amount}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleActive}
            >
              {scholarship.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Scholarship</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{scholarship.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-3">{scholarship.description}</CardDescription>
        
        {scholarship.eligibility && (
          <p className="text-sm text-muted-foreground mb-3">
            <strong>Eligibility:</strong> {scholarship.eligibility}
          </p>
        )}

        {scholarship.tags && scholarship.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {scholarship.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {scholarship.link && (
          <Button size="sm" variant="outline" asChild>
            <a href={scholarship.link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              Apply
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};