import { useEffect, useState } from 'react';
import { useContractTemplates } from '@/hooks/useContractTemplates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Plus, Loader2 } from 'lucide-react';

export const GleeClubTemplateInitializer = () => {
  const { templates, createGleeClubTemplate } = useContractTemplates();
  const [isCreating, setIsCreating] = useState(false);
  const [hasGleeClubTemplate, setHasGleeClubTemplate] = useState(false);

  useEffect(() => {
    const gleeClubTemplate = templates.find(t => t.name === 'Glee Club Performance Agreement');
    setHasGleeClubTemplate(!!gleeClubTemplate);
  }, [templates]);

  const handleCreateTemplate = async () => {
    setIsCreating(true);
    try {
      await createGleeClubTemplate();
      setHasGleeClubTemplate(true);
    } catch (error) {
      console.error('Error creating Glee Club template:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (hasGleeClubTemplate) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <CheckCircle className="h-5 w-5 mr-2" />
            Glee Club Template Ready
          </CardTitle>
          <CardDescription className="text-green-600">
            The Spelman College Glee Club Performance Agreement template is available and ready to use.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-800">Initialize Glee Club Template</CardTitle>
        <CardDescription className="text-blue-600">
          Create the official Spelman College Glee Club Performance Agreement template with all the required variables and standard terms.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleCreateTemplate}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Template...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create Glee Club Template
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};