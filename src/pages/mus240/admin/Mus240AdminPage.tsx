import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import ResourcesAdmin from '@/pages/mus240/admin/ResourcesAdmin';
import { EnrollmentManager } from '@/components/mus240/admin/EnrollmentManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, FileText, Settings, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Mus240AdminPage = () => {
  const [activeTab, setActiveTab] = useState('enrollments');

  return (
    <UniversalLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">MUS 240 Administration</h1>
            <p className="text-muted-foreground">
              Manage course enrollments, resources, and settings
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/classes/mus240/instructor">
                <ExternalLink className="h-4 w-4 mr-2" />
                Instructor Console
              </Link>
            </Button>
            <Button asChild>
              <Link to="/classes/mus240">
                <GraduationCap className="h-4 w-4 mr-2" />
                View Course
              </Link>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="enrollments" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Enrollments
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="enrollments" className="mt-6">
            <EnrollmentManager />
          </TabsContent>
          
          <TabsContent value="resources" className="mt-6">
            <ResourcesAdmin />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Course settings and configuration options will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};