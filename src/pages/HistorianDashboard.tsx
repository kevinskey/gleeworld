import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Camera, FileText, Calendar, Image, ArrowRight } from 'lucide-react';

const HistorianDashboard = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Photo Management',
      description: 'Organize and archive club photos',
      icon: Image,
      path: '/historian/photos'
    },
    {
      title: 'Event Documentation',
      description: 'Document club events and activities',
      icon: Calendar,
      path: '/historian/events'
    },
    {
      title: 'Archive Management',
      description: 'Maintain historical records',
      icon: FileText,
      path: '/historian/archive'
    },
    {
      title: 'Executive Dashboard',
      description: 'General executive board overview',
      icon: Camera,
      path: '/dashboard/executive-board'
    }
  ];

  return (
    <UniversalLayout>
      <PageHeader
        title="Historian Dashboard"
        description="Preserve and document Glee Club history"
      />
      
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border">
          <h2 className="text-xl font-semibold text-amber-800 mb-2">Welcome, Historian</h2>
          <p className="text-amber-600">
            Capture, preserve, and share the rich history and memories of the Spelman College Glee Club.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <Card key={module.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">{module.description}</p>
                  <Button 
                    onClick={() => navigate(module.path)}
                    className="w-full"
                    variant={index === 0 ? "default" : "outline"}
                  >
                    Access {module.title}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </UniversalLayout>
  );
};

export default HistorianDashboard;