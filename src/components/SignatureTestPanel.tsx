import React, { useState } from 'react';
import { useOnboardingSignature } from '@/hooks/useOnboardingSignature';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export const SignatureTestPanel = () => {
  const { user } = useAuth();
  const { saveSignature, checkExistingSignature, saving } = useOnboardingSignature();
  const [testResult, setTestResult] = useState<string>('');

  const testSignatureSave = async () => {
    if (!user) {
      setTestResult('Error: User not authenticated');
      return;
    }

    try {
      setTestResult('Testing signature save...');
      
      // Create a simple test signature (small 1x1 pixel base64 image)
      const testSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      const result = await saveSignature({
        signatureData: testSignature,
        fullName: 'Test User',
        onboardingStep: 'test_signature',
        signatureType: 'digital'
      });
      
      setTestResult(`Success! Signature saved with ID: ${result}`);
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testCheckExisting = async () => {
    try {
      setTestResult('Checking for existing signatures...');
      
      const existing = await checkExistingSignature('test_signature');
      
      if (existing) {
        setTestResult(`Found existing signature: ID ${existing.id}, created ${new Date(existing.created_at).toLocaleString()}`);
      } else {
        setTestResult('No existing test signatures found');
      }
    } catch (error) {
      setTestResult(`Error checking signatures: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Signature Test Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in to test signature functionality.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signature Test Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Logged in as: {user.email}
        </p>
        
        <div className="flex gap-2">
          <Button 
            onClick={testSignatureSave} 
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Test Save Signature'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={testCheckExisting}
          >
            Check Existing
          </Button>
        </div>
        
        {testResult && (
          <div className="bg-muted p-3 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};