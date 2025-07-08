import { useState } from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { RichContentCreator } from "@/components/shared/RichContentCreator";
import { ContentViewer } from "@/components/shared/ContentViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Edit, Save, FileText, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateBudgetDialog } from "@/components/admin/budget/CreateBudgetDialog";
import { BudgetCard } from "@/components/admin/budget/BudgetCard";
import { useBudgets } from "@/hooks/useBudgets";

interface ContentData {
  text: string;
  images: Array<{
    id: string;
    url: string;
    alt: string;
  }>;
  amazonLinks: Array<{
    id: string;
    url: string;
    title: string;
    description?: string;
  }>;
  assignedDuties: Array<{
    id: string;
    userId: string;
    userName: string;
    task: string;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export default function ContentCreator() {
  const { toast } = useToast();
  const { budgets, loading: budgetsLoading, updateBudget, deleteBudget } = useBudgets();
  const [savedContent, setSavedContent] = useState<ContentData | null>(null);
  const [activeTab, setActiveTab] = useState("create");

  const handleSaveContent = (content: ContentData) => {
    setSavedContent(content);
    setActiveTab("preview");
    
    toast({
      title: "Content Saved",
      description: "Your content has been saved successfully!",
    });
  };

  const handleDutyComplete = (dutyId: string) => {
    if (!savedContent) return;

    const updatedDuties = savedContent.assignedDuties.filter(duty => duty.id !== dutyId);
    setSavedContent({
      ...savedContent,
      assignedDuties: updatedDuties
    });

    toast({
      title: "Duty Completed",
      description: "The assigned duty has been marked as complete.",
    });
  };

  const getContentStats = () => {
    if (!savedContent) return null;

    return {
      textLength: savedContent.text.length,
      imageCount: savedContent.images.length,
      linkCount: savedContent.amazonLinks.length,
      dutyCount: savedContent.assignedDuties.length,
      pendingDuties: savedContent.assignedDuties.filter(duty => {
        if (!duty.dueDate) return false;
        return new Date(duty.dueDate) < new Date();
      }).length
    };
  };

  const stats = getContentStats();

  return (
    <UniversalLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Content Creator Studio</h1>
          <p className="text-muted-foreground">
            Create rich content with text, images, Amazon links, and task assignments
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{stats.textLength}</div>
                <div className="text-xs text-muted-foreground">Characters</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <img className="h-6 w-6 mx-auto mb-2" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%232563eb'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z' /%3E%3C/svg%3E" alt="Images" />
                <div className="text-2xl font-bold">{stats.imageCount}</div>
                <div className="text-xs text-muted-foreground">Images</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="h-6 w-6 mx-auto mb-2 text-orange-600">🛒</div>
                <div className="text-2xl font-bold">{stats.linkCount}</div>
                <div className="text-xs text-muted-foreground">Amazon Links</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="h-6 w-6 mx-auto mb-2 text-green-600">👥</div>
                <div className="text-2xl font-bold">{stats.dutyCount}</div>
                <div className="text-xs text-muted-foreground">Assigned Duties</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="h-6 w-6 mx-auto mb-2 text-red-600">⚠️</div>
                <div className="text-2xl font-bold">{stats.pendingDuties}</div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Create Content
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview Content
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Budget Sandbox
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <RichContentCreator 
              onSave={handleSaveContent}
              initialContent={savedContent || undefined}
            />
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            {savedContent ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Content Preview</h2>
                  <Button 
                    onClick={() => setActiveTab("create")}
                    variant="outline"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Content
                  </Button>
                </div>
                <ContentViewer 
                  content={savedContent}
                  showTitle={false}
                  onDutyComplete={handleDutyComplete}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No content to preview</h3>
                  <p className="text-muted-foreground mb-4">
                    Create some content first to see it previewed here.
                  </p>
                  <Button onClick={() => setActiveTab("create")}>
                    <Edit className="h-4 w-4 mr-2" />
                    Start Creating
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Budget Sandbox</h2>
                  <p className="text-muted-foreground">Create and manage budgets for your projects</p>
                </div>
                <CreateBudgetDialog onSuccess={() => {}} />
              </div>

              {budgetsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-8 bg-muted rounded"></div>
                        <div className="h-2 bg-muted rounded"></div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : budgets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {budgets.map((budget) => (
                    <BudgetCard
                      key={budget.id}
                      budget={budget}
                      onUpdate={updateBudget}
                      onDelete={(budget) => deleteBudget(budget.id)}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No budgets yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first budget to start tracking expenses and allocations.
                    </p>
                    <CreateBudgetDialog onSuccess={() => {}} />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
}