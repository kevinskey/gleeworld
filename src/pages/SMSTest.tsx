
import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import SMSTestComponent from '@/components/notifications/SMSTestComponent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Shield, Phone } from 'lucide-react';

const SMSTest = () => {
  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            SMS Integration Test
          </h1>
          <p className="text-gray-300">
            Test the SMS notification system to ensure proper delivery
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <SMSTestComponent />
          </div>
          
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-green-600" />
                  <span>Phone number validation</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span>Secure API key handling</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <span>Message length limits</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Testing Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Use a valid phone number with country code</p>
                <p>• Messages are limited to 160 characters</p>
                <p>• Test with different number formats</p>
                <p>• Check console for detailed logs</p>
                <p>• Verify delivery status in database</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default SMSTest;
