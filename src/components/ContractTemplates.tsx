import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Eye, FileText, Trash2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  content: string;
  fields: string[];
  lastModified: string;
  uses: number;
}

export const ContractTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "",
    content: "",
    fields: [] as string[]
  });

  const [fieldInput, setFieldInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const { toast } = useToast();

  const addField = () => {
    if (fieldInput.trim() && !newTemplate.fields.includes(fieldInput.trim())) {
      setNewTemplate({
        ...newTemplate,
        fields: [...newTemplate.fields, fieldInput.trim()]
      });
      setFieldInput("");
    }
  };

  const removeField = (field: string) => {
    setNewTemplate({
      ...newTemplate,
      fields: newTemplate.fields.filter(f => f !== field)
    });
  };

  const createTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast({
        title: "Missing information",
        description: "Please provide a name and content for the template.",
        variant: "destructive",
      });
      return;
    }

    const template: Template = {
      id: Date.now(),
      ...newTemplate,
      lastModified: new Date().toISOString().split('T')[0],
      uses: 0
    };

    setTemplates([...templates, template]);
    setNewTemplate({ name: "", description: "", category: "", content: "", fields: [] });
    setIsCreateOpen(false);
    
    toast({
      title: "Template created",
      description: "Your new template has been saved successfully.",
    });
  };

  const deleteTemplate = (id: number) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast({
      title: "Template deleted",
      description: "The template has been removed successfully.",
    });
  };

  const useTemplate = (template: Template) => {
    toast({
      title: "Template ready",
      description: `${template.name} is ready for customization.`,
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "service": return "bg-blue-100 text-blue-800";
      case "legal": return "bg-purple-100 text-purple-800";
      case "hr": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contract Templates</h2>
          <p className="text-gray-600">Create and manage reusable contract templates</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a reusable contract template with merge fields
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    placeholder="Service Agreement Template"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-category">Category</Label>
                  <Input
                    id="template-category"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                    placeholder="Service, Legal, HR, etc."
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  placeholder="Brief description of this template"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-content">Template Content</Label>
                <Textarea
                  id="template-content"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                  placeholder="Enter your contract template here. Use {{field_name}} for merge fields..."
                  rows={8}
                />
              </div>

              <div className="space-y-2">
                <Label>Merge Fields</Label>
                <div className="flex space-x-2">
                  <Input
                    value={fieldInput}
                    onChange={(e) => setFieldInput(e.target.value)}
                    placeholder="field_name"
                    onKeyPress={(e) => e.key === 'Enter' && addField()}
                  />
                  <Button type="button" onClick={addField}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newTemplate.fields.map((field) => (
                    <Badge key={field} variant="secondary" className="flex items-center space-x-1">
                      <span>{`{{${field}}}`}</span>
                      <button onClick={() => removeField(field)} className="ml-1 text-red-500">
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createTemplate}>Create Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-500 mb-4">Create your first contract template to get started</p>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Template</DialogTitle>
                  <DialogDescription>
                    Create a reusable contract template with merge fields
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                        placeholder="Service Agreement Template"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-category">Category</Label>
                      <Input
                        id="template-category"
                        value={newTemplate.category}
                        onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                        placeholder="Service, Legal, HR, etc."
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Input
                      id="template-description"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                      placeholder="Brief description of this template"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-content">Template Content</Label>
                    <Textarea
                      id="template-content"
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                      placeholder="Enter your contract template here. Use {{field_name}} for merge fields..."
                      rows={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Merge Fields</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={fieldInput}
                        onChange={(e) => setFieldInput(e.target.value)}
                        placeholder="field_name"
                        onKeyPress={(e) => e.key === 'Enter' && addField()}
                      />
                      <Button type="button" onClick={addField}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newTemplate.fields.map((field) => (
                        <Badge key={field} variant="secondary" className="flex items-center space-x-1">
                          <span>{`{{${field}}}`}</span>
                          <button onClick={() => removeField(field)} className="ml-1 text-red-500">
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createTemplate}>Create Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <Badge className={getCategoryColor(template.category)}>
                    {template.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-500">
                    <p>Fields: {template.fields.length}</p>
                    <p>Used: {template.uses} times</p>
                    <p>Modified: {template.lastModified}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {template.fields.slice(0, 3).map((field) => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                    {template.fields.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.fields.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsViewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => useTemplate(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Template Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Category:</span> 
                  <Badge className={`ml-2 ${getCategoryColor(selectedTemplate.category)}`}>
                    {selectedTemplate.category}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Uses:</span> {selectedTemplate.uses} times
                </div>
              </div>
              
              <div>
                <Label className="font-medium">Merge Fields:</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedTemplate.fields.map((field) => (
                    <Badge key={field} variant="secondary">
                      {`{{${field}}}`}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="font-medium">Template Content:</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedTemplate.content}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            <Button onClick={() => selectedTemplate && useTemplate(selectedTemplate)}>
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
