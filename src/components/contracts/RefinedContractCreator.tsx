import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  Upload, 
  Plus, 
  Users, 
  DollarSign, 
  Calendar,
  Eye,
  Send,
  Save,
  BookTemplate,
  Wand2,
  ChevronRight,
  CheckCircle
} from "lucide-react";
import { useContracts } from "@/hooks/contracts";
import { useContractTemplates } from "@/hooks/contracts";
import { useContractFromTemplate } from "@/hooks/useContractFromTemplate";
import { useUsers } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RefinedContractCreatorProps {
  onContractCreated?: () => void;
}

type CreationStep = 'method' | 'details' | 'recipients' | 'review';
type CreationMethod = 'template' | 'scratch' | 'upload';

export const RefinedContractCreator = ({ onContractCreated }: RefinedContractCreatorProps) => {
  const [currentStep, setCurrentStep] = useState<CreationStep>('method');
  const [method, setMethod] = useState<CreationMethod>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [contractData, setContractData] = useState({
    title: '',
    content: '',
    type: 'general' as const,
    stipend_amount: '',
    due_date: '',
    recipients: [] as Array<{ email: string; name: string; role: 'signer' | 'cc' }>
  });
  const [isLoading, setIsLoading] = useState(false);

  const { templates, loading: templatesLoading } = useContractTemplates();
  const { create: createContract } = useContracts();
  const { createContractFromTemplate } = useContractFromTemplate(onContractCreated);
  const { users } = useUsers();
  const { toast } = useToast();

  const steps = [
    { id: 'method', title: 'Creation Method', description: 'Choose how to create' },
    { id: 'details', title: 'Contract Details', description: 'Add title and content' },
    { id: 'recipients', title: 'Recipients', description: 'Add signers and viewers' },
    { id: 'review', title: 'Review & Send', description: 'Final review and send' }
  ];

  const goToStep = (step: CreationStep) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id as CreationStep);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as CreationStep);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setContractData(prev => ({
      ...prev,
      title: `Contract - ${template.name}`,
      content: template.template_content,
      type: template.category
    }));
    nextStep();
  };

  const handleCreateFromScratch = () => {
    setSelectedTemplate(null);
    setContractData(prev => ({
      ...prev,
      title: '',
      content: '',
      type: 'general'
    }));
    nextStep();
  };

  const addRecipient = (email: string, name: string, role: 'signer' | 'cc' = 'signer') => {
    setContractData(prev => ({
      ...prev,
      recipients: [...prev.recipients, { email, name, role }]
    }));
  };

  const removeRecipient = (index: number) => {
    setContractData(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  const handleCreateContract = async () => {
    setIsLoading(true);
    try {
      if (method === 'template' && selectedTemplate) {
        const recipient = contractData.recipients[0];
        await createContractFromTemplate(selectedTemplate, {
          email: recipient?.email,
          full_name: recipient?.name,
          stipend_amount: contractData.stipend_amount
        });
      } else {
        await createContract({
          title: contractData.title,
          content: contractData.content,
          contract_type: contractData.type,
          due_date: contractData.due_date || undefined,
          recipients: contractData.recipients.map(r => ({
            email: r.email,
            name: r.name,
            role: r.role
          }))
        });
      }
      
      toast({
        title: "Success",
        description: "Contract created successfully!",
      });
      
      onContractCreated?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isStepComplete = (stepId: string) => {
    switch (stepId) {
      case 'method': return !!method;
      case 'details': return !!(contractData.title && contractData.content);
      case 'recipients': return contractData.recipients.length > 0;
      case 'review': return false; // Review step is never "complete"
      default: return false;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <FileText className="h-6 w-6" />
          Create New Contract
        </CardTitle>
        <CardDescription>
          Follow the steps below to create and send your contract
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isComplete = isStepComplete(step.id);
            const isPast = steps.findIndex(s => s.id === currentStep) > index;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <Button
                    variant={isActive ? "default" : isPast || isComplete ? "secondary" : "outline"}
                    size="sm"
                    className={cn(
                      "w-10 h-10 rounded-full p-0 mb-2",
                      isActive && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => goToStep(step.id as CreationStep)}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </Button>
                  <div className="text-center">
                    <p className={cn(
                      "text-sm font-medium",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mx-4 mt-[-20px]" />
                )}
              </div>
            );
          })}
        </div>

        <Separator className="mb-6" />

        {/* Step Content */}
        {currentStep === 'method' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Choose Creation Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  method === 'template' && "ring-2 ring-primary"
                )}
                onClick={() => setMethod('template')}
              >
                <CardContent className="p-6 text-center">
                  <BookTemplate className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h4 className="font-semibold mb-2">Use Template</h4>
                  <p className="text-sm text-muted-foreground">
                    Start with a pre-built template
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Recommended
                  </Badge>
                </CardContent>
              </Card>

              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  method === 'scratch' && "ring-2 ring-primary"
                )}
                onClick={() => setMethod('scratch')}
              >
                <CardContent className="p-6 text-center">
                  <Plus className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h4 className="font-semibold mb-2">From Scratch</h4>
                  <p className="text-sm text-muted-foreground">
                    Create a new contract from blank
                  </p>
                </CardContent>
              </Card>

              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  method === 'upload' && "ring-2 ring-primary"
                )}
                onClick={() => setMethod('upload')}
              >
                <CardContent className="p-6 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h4 className="font-semibold mb-2">Upload Document</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload an existing PDF or Word file
                  </p>
                </CardContent>
              </Card>
            </div>

            {method === 'template' && (
              <div className="mt-6">
                <h4 className="font-semibold mb-4">Select a Template</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                  {templatesLoading ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Loading templates...
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      No templates available
                    </div>
                  ) : (
                    templates.map((template) => (
                      <Card 
                        key={template.id}
                        className="cursor-pointer hover:shadow-md transition-all"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-primary mt-1" />
                            <div className="flex-1">
                              <h5 className="font-semibold">{template.name}</h5>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {template.description || 'No description available'}
                              </p>
                              <Badge variant="outline" className="mt-2">
                                {template.category}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={method === 'template' ? undefined : nextStep}
                disabled={!method || (method === 'template' && !selectedTemplate)}
              >
                {method === 'template' ? 'Select Template Above' : 'Continue'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'details' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Contract Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Contract Title</Label>
                <Input
                  id="title"
                  value={contractData.title}
                  onChange={(e) => setContractData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter contract title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Contract Type</Label>
                <Select 
                  value={contractData.type} 
                  onValueChange={(value) => setContractData(prev => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="wardrobe">Wardrobe</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stipend">Stipend Amount (Optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="stipend"
                    type="number"
                    step="0.01"
                    className="pl-9"
                    value={contractData.stipend_amount}
                    onChange={(e) => setContractData(prev => ({ ...prev, stipend_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date (Optional)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="due_date"
                    type="date"
                    className="pl-9"
                    value={contractData.due_date}
                    onChange={(e) => setContractData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contract Content</Label>
              <Textarea
                id="content"
                rows={10}
                value={contractData.content}
                onChange={(e) => setContractData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter contract content here..."
                className="min-h-[200px]"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button 
                onClick={nextStep}
                disabled={!contractData.title || !contractData.content}
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'recipients' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Add Recipients</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input placeholder="Recipient email" id="new-email" />
                <Input placeholder="Recipient name" id="new-name" />
                <Button 
                  onClick={() => {
                    const email = (document.getElementById('new-email') as HTMLInputElement)?.value;
                    const name = (document.getElementById('new-name') as HTMLInputElement)?.value;
                    if (email && name) {
                      addRecipient(email, name);
                      (document.getElementById('new-email') as HTMLInputElement).value = '';
                      (document.getElementById('new-name') as HTMLInputElement).value = '';
                    }
                  }}
                  className="w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </div>

              {contractData.recipients.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Recipients ({contractData.recipients.length})</h4>
                  <div className="space-y-2">
                    {contractData.recipients.map((recipient, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{recipient.name}</p>
                          <p className="text-sm text-muted-foreground">{recipient.email}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeRecipient(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button 
                onClick={nextStep}
                disabled={contractData.recipients.length === 0}
              >
                Review Contract
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review & Send</h3>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contract Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Title:</span>
                      <p className="text-muted-foreground">{contractData.title}</p>
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>
                      <p className="text-muted-foreground capitalize">{contractData.type}</p>
                    </div>
                    {contractData.stipend_amount && (
                      <div>
                        <span className="font-medium">Stipend:</span>
                        <p className="text-muted-foreground">${contractData.stipend_amount}</p>
                      </div>
                    )}
                    {contractData.due_date && (
                      <div>
                        <span className="font-medium">Due Date:</span>
                        <p className="text-muted-foreground">{contractData.due_date}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <span className="font-medium">Recipients:</span>
                    <div className="mt-1 space-y-1">
                      {contractData.recipients.map((recipient, index) => (
                        <p key={index} className="text-sm text-muted-foreground">
                          {recipient.name} ({recipient.email})
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Contract
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{contractData.title}</DialogTitle>
                      <DialogDescription>
                        Contract preview - this is how it will appear to recipients
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                      <pre className="whitespace-pre-wrap font-sans text-sm">
                        {contractData.content}
                      </pre>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCreateContract} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button onClick={handleCreateContract} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create & Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};