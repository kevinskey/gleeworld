import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Music, Archive, FileText, ArrowRight } from 'lucide-react';

const LibrarianDashboard = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Music Library',
      description: 'Manage sheet music catalog',
      icon: Music,
      path: '/music-library',
      badge: 'Primary'
    },
    {
      title: 'Digital Archive',
      description: 'Organize digital music files',
      icon: Archive,
      path: '/librarian/digital-archive'
    },
    {
      title: 'Inventory Management',
      description: 'Track physical music copies',
      icon: FileText,
      path: '/librarian/inventory'
    },
    {
      title: 'Executive Dashboard',
      description: 'General executive board overview',
      icon: BookOpen,
      path: '/dashboard/executive-board'
    }
  ];

  return (
    <UniversalLayout>
      <PageHeader
        title="Librarian Dashboard"
        description="Manage and organize the Glee Club music library"
      />
      
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border">
          <h2 className="text-xl font-semibold text-green-800 mb-2">Welcome, Librarian</h2>
          <p className="text-green-600">
            Organize, maintain, and expand the Glee Club's musical repertoire and resources.
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

export default LibrarianDashboard;