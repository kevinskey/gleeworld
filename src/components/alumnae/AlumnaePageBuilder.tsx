import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Save, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SortableSection } from './page-builder/SortableSection';
import { SectionEditor } from './page-builder/SectionEditor';
import { GlobalTitleSettings } from './page-builder/GlobalTitleSettings';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface PageSection {
  id: string;
  section_type: string;
  title: string | null;
  layout_type: string;
  row_height: string | null;
  background_color: string | null;
  background_image: string | null;
  sort_order: number;
  is_active: boolean;
  settings: any;
}

export const AlumnaePageBuilder = () => {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('alumnae_page_sections')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error: any) {
      toast.error('Failed to load sections: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);

    // Update sort_order in database
    try {
      const updates = reordered.map((section, index) => ({
        id: section.id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('alumnae_page_sections')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      toast.success('Section order updated');
    } catch (error: any) {
      toast.error('Failed to update order: ' + error.message);
      fetchSections(); // Revert on error
    }
  };

  const handleAddSection = () => {
    setEditingSection({
      id: '',
      section_type: 'content',
      title: null,
      layout_type: 'single',
      row_height: 'auto',
      background_color: null,
      background_image: null,
      sort_order: sections.length,
      is_active: true,
      settings: {},
    });
    setShowEditor(true);
  };

  const handleEditSection = (section: PageSection) => {
    setEditingSection(section);
    setShowEditor(true);
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      const { error } = await supabase
        .from('alumnae_page_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;
      toast.success('Section deleted');
      fetchSections();
    } catch (error: any) {
      toast.error('Failed to delete section: ' + error.message);
    }
  };

  const handleSaveSection = async (section: PageSection) => {
    try {
      if (section.id) {
        // Update existing
        const { error } = await supabase
          .from('alumnae_page_sections')
          .update({
            section_type: section.section_type,
            title: section.title,
            layout_type: section.layout_type,
            row_height: section.row_height,
            background_color: section.background_color,
            background_image: section.background_image,
            is_active: section.is_active,
            settings: section.settings,
          })
          .eq('id', section.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('alumnae_page_sections')
          .insert([{
            section_type: section.section_type,
            title: section.title,
            layout_type: section.layout_type,
            row_height: section.row_height,
            background_color: section.background_color,
            background_image: section.background_image,
            sort_order: section.sort_order,
            is_active: section.is_active,
            settings: section.settings,
          }]);

        if (error) throw error;
      }

      toast.success('Section saved');
      setShowEditor(false);
      setEditingSection(null);
      fetchSections();
    } catch (error: any) {
      toast.error('Failed to save section: ' + error.message);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (showGlobalSettings) {
    return (
      <GlobalTitleSettings
        onBack={() => setShowGlobalSettings(false)}
      />
    );
  }

  if (showEditor && editingSection) {
    return (
      <SectionEditor
        section={editingSection}
        onSave={handleSaveSection}
        onCancel={() => {
          setShowEditor(false);
          setEditingSection(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alumnae Page Builder</h2>
          <p className="text-muted-foreground">Drag to reorder sections, click to edit</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowGlobalSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Global Title Format
          </Button>
          <Button onClick={handleAddSection}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No sections yet. Create your first section!</p>
            <Button onClick={handleAddSection}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  onEdit={handleEditSection}
                  onDelete={handleDeleteSection}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
