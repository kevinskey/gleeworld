import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Loader2, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { WeekSidebar } from './WeekSidebar';
import { WeeklyModuleEditor, LH100Module } from './WeeklyModuleEditor';
import { AddModuleDialog, NewModuleData } from './AddModuleDialog';

interface LH100ModulesPageProps {
  isEnrolled?: boolean;
  isAdmin?: boolean;
}

export const LH100ModulesPage: React.FC<LH100ModulesPageProps> = ({
  isEnrolled = true,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const [modules, setModules] = useState<LH100Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<LH100Module | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Fetch modules
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const { data, error } = await supabase
          .from('lh100_modules')
          .select('*')
          .order('week_number', { ascending: true });

        if (error) throw error;
        setModules(data || []);
        
        // Auto-select first module
        if (data && data.length > 0 && !selectedModule) {
          setSelectedModule(data[0]);
        }
      } catch (error) {
        console.error('Error fetching LH100 modules:', error);
        toast.error('Failed to load modules');
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  const handleUpdateModule = async (updatedModule: LH100Module) => {
    const { error } = await supabase
      .from('lh100_modules')
      .update({
        title: updatedModule.title,
        description: updatedModule.description,
        start_date: updatedModule.start_date,
        end_date: updatedModule.end_date,
        is_active: updatedModule.is_active,
        is_locked: updatedModule.is_locked,
        learning_objectives: updatedModule.learning_objectives,
        updated_at: new Date().toISOString()
      })
      .eq('id', updatedModule.id);

    if (error) throw error;

    setModules(prev => prev.map(m => 
      m.id === updatedModule.id ? updatedModule : m
    ));
    setSelectedModule(updatedModule);
  };

  const handleAddModule = async (data: NewModuleData) => {
    const newId = `lh-${Date.now()}`;
    const { data: newModule, error } = await supabase
      .from('lh100_modules')
      .insert({
        id: newId,
        week_number: data.week_number,
        title: data.title,
        description: data.description || null,
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        end_date: data.end_date || data.start_date || new Date().toISOString().split('T')[0],
        is_active: false,
        is_locked: false,
        learning_objectives: data.learning_objectives
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add module');
      throw error;
    }

    const sortedModules = [...modules, newModule].sort((a, b) => a.week_number - b.week_number);
    setModules(sortedModules);
    setSelectedModule(newModule);
    toast.success('Week added');
  };

  const handleDeleteModule = async (id: string) => {
    const { error } = await supabase
      .from('lh100_modules')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete module');
      throw error;
    }

    const remaining = modules.filter(m => m.id !== id);
    setModules(remaining);
    setSelectedModule(remaining.length > 0 ? remaining[0] : null);
    toast.success('Module deleted');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Left Sidebar */}
      <WeekSidebar
        modules={modules}
        selectedModuleId={selectedModule?.id || null}
        onSelectModule={setSelectedModule}
        onAddModule={() => setShowAddDialog(true)}
        loading={loading}
        canAdd={!!user}
      />

      {/* Main Editor */}
      <Card className="flex-1 overflow-hidden">
        {loading ? (
          <CardContent className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        ) : selectedModule ? (
          <CardContent className="p-4 sm:p-6 overflow-y-auto h-full">
            <WeeklyModuleEditor
              module={selectedModule}
              onUpdate={handleUpdateModule}
              onDelete={isAdmin ? handleDeleteModule : undefined}
              isAdmin={isAdmin}
            />
          </CardContent>
        ) : (
          <CardContent className="flex flex-col items-center justify-center h-full text-center p-8">
            <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Select a Week</h3>
            <p className="text-muted-foreground max-w-md">
              Choose a week from the sidebar to view and edit its content, learning objectives, and settings.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Add Module Dialog */}
      <AddModuleDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddModule}
        nextWeekNumber={modules.length + 1}
      />
    </div>
  );
};

export default LH100ModulesPage;
