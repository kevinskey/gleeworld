import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Users, 
  BookOpen, 
  ArrowLeft,
  GraduationCap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const TermManager = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <div className="h-6 w-px bg-border"></div>
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Term Manager</h1>
              <p className="text-sm text-muted-foreground">Manage academic terms, schedules, and semester planning</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/events" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Events
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="current-term" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Current Term
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="planning" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">Spring 2024</div>
                <div className="text-sm text-muted-foreground">Current Term</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">12</div>
                <div className="text-sm text-muted-foreground">Weeks Remaining</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">45</div>
                <div className="text-sm text-muted-foreground">Active Members</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">8</div>
                <div className="text-sm text-muted-foreground">Upcoming Events</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Term Management Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Current Term Status</h4>
                    <p className="text-sm text-muted-foreground">Spring 2024 semester is in progress</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Registration Complete</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Rehearsal Schedule Set</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Final Concert Planning</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Upcoming Deadlines</h4>
                    <div className="space-y-1 text-sm">
                      <p>• Spring Concert Repertoire - March 1</p>
                      <p>• Tour Registration - March 15</p>
                      <p>• Final Exams Schedule - April 20</p>
                      <p>• Summer Planning - May 1</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="current-term">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Spring 2024 Term Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Term Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Start Date:</strong> January 15, 2024</p>
                      <p><strong>End Date:</strong> May 10, 2024</p>
                      <p><strong>Total Weeks:</strong> 16</p>
                      <p><strong>Rehearsal Days:</strong> Tuesday & Thursday</p>
                      <p><strong>Rehearsal Time:</strong> 6:00 PM - 8:00 PM</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Key Milestones</h4>
                    <div className="space-y-2 text-sm">
                      <p>• Week 4: First Performance</p>
                      <p>• Week 8: Mid-term Concert</p>
                      <p>• Week 12: Spring Tour</p>
                      <p>• Week 16: Final Concert</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Rehearsal & Event Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="font-semibold">Weekly Schedule</h4>
                <div className="space-y-2">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="font-medium">Tuesday Rehearsal</h5>
                        <p className="text-sm text-muted-foreground">6:00 PM - 8:00 PM • Sisters Chapel</p>
                      </div>
                      <div className="text-sm">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="font-medium">Thursday Rehearsal</h5>
                        <p className="text-sm text-muted-foreground">6:00 PM - 8:00 PM • Sisters Chapel</p>
                      </div>
                      <div className="text-sm">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Term Planning & Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <FileText className="h-6 w-6 mb-2" />
                    Semester Plan
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <BookOpen className="h-6 w-6 mb-2" />
                    Repertoire Planning
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Calendar className="h-6 w-6 mb-2" />
                    Event Calendar
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    Member Registration
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Member Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-8">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Member Management</h3>
                  <p className="text-muted-foreground">Manage member registration, attendance, and term participation.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TermManager;