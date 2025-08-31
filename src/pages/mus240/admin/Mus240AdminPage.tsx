import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Search, Users, Download, Save, UserCheck, Mail, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import backgroundImage from '@/assets/mus240-background.jpg';

interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  is_enrolled: boolean;
}

interface StudentGrade {
  student_id: string;
  full_name: string;
  email: string;
  assignment_points: number;
  participation_points: number;
  overall_points: number;
  overall_percentage: number;
  letter_grade: string;
  semester: string;
}

export const Mus240AdminPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEnrollmentCollapsed, setIsEnrollmentCollapsed] = useState(true);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', user.id)
        .single();
      
      if (data && !error) {
        setIsAdmin(data.is_admin || data.is_super_admin);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Fetch all users and current enrollments
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchGrades();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, role, created_at')
        .order('full_name');

      if (error) throw error;

      // Check which users are currently enrolled in MUS 240
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('mus240_grade_summaries')
        .select('student_id')
        .eq('semester', 'Fall 2024');

      if (enrollmentError) throw enrollmentError;

      const enrolledIds = new Set(enrollments?.map(e => e.student_id) || []);

      const usersWithEnrollment: User[] = (profiles || []).map(profile => ({
        user_id: profile.user_id,
        full_name: profile.full_name || 'Unknown',
        email: profile.email || '',
        role: profile.role || 'student',
        created_at: profile.created_at,
        is_enrolled: enrolledIds.has(profile.user_id),
      }));

      setUsers(usersWithEnrollment);
      
      // Set currently enrolled users as selected
      setSelectedUsers(enrolledIds);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      // First get grade summaries
      const { data: summaries, error: summariesError } = await supabase
        .from('mus240_grade_summaries')
        .select('*')
        .eq('semester', 'Fall 2024');

      if (summariesError) throw summariesError;

      if (!summaries || summaries.length === 0) {
        setGrades([]);
        return;
      }

      // Then get profile information for each student
      const studentIds = summaries.map(s => s.student_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      if (profilesError) throw profilesError;

      // Create a map for quick lookup
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const formattedGrades: StudentGrade[] = summaries.map((summary: any) => {
        const profile = profileMap.get(summary.student_id);
        return {
          student_id: summary.student_id,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          assignment_points: summary.assignment_points || 0,
          participation_points: summary.participation_points || 0,
          overall_points: summary.overall_points || 0,
          overall_percentage: summary.overall_percentage || 0,
          letter_grade: summary.letter_grade || 'N/A',
          semester: summary.semester,
        };
      });

      setGrades(formattedGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const updateStudentRoles = async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('No valid session found');
      }

      console.log('Calling update-student-roles function...');
      const { data, error } = await supabase.functions.invoke('update-student-roles', {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`
        }
      });

      if (error) {
        console.error('Error updating student roles:', error);
        toast({
          title: "Error",
          description: `Failed to update student roles: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Student roles update result:', data);
      toast({
        title: "Success",
        description: data.message || `Updated ${data.updated} student roles to 'student'`,
      });
      
      // Refresh the data
      await Promise.all([fetchUsers(), fetchGrades()]);
    } catch (error) {
      console.error('Error calling update-student-roles function:', error);
      toast({
        title: "Error",
        description: `Failed to update student roles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelection = (userId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (isSelected) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const saveEnrollments = async () => {
    setLoading(true);
    try {
      // Get currently enrolled users
      const { data: currentEnrollments } = await supabase
        .from('mus240_grade_summaries')
        .select('student_id')
        .eq('semester', 'Fall 2024');

      const currentlyEnrolled = new Set(currentEnrollments?.map(e => e.student_id) || []);
      
      // Users to add (selected but not currently enrolled)
      const usersToAdd = Array.from(selectedUsers).filter(id => !currentlyEnrolled.has(id));
      
      // Users to remove (currently enrolled but not selected)
      const usersToRemove = Array.from(currentlyEnrolled).filter(id => !selectedUsers.has(id));

      // Add new enrollments
      if (usersToAdd.length > 0) {
        const newEnrollments = usersToAdd.map(userId => ({
          student_id: userId,
          semester: 'Fall 2024',
          assignment_points: 0,
          participation_points: 0,
          overall_points: 0,
          overall_percentage: 0,
          letter_grade: 'N/A',
          assignment_possible: 650,
          participation_possible: 75,
          overall_possible: 725,
        }));

        const { error: insertError } = await supabase
          .from('mus240_grade_summaries')
          .insert(newEnrollments);

        if (insertError) throw insertError;
      }

      // Remove enrollments
      if (usersToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('mus240_grade_summaries')
          .delete()
          .in('student_id', usersToRemove)
          .eq('semester', 'Fall 2024');

        if (deleteError) throw deleteError;
      }

      toast({
        title: "Success",
        description: `Enrollments updated: ${usersToAdd.length} added, ${usersToRemove.length} removed`,
      });

      // Refresh data
      await fetchUsers();
      await fetchGrades();
    } catch (error) {
      console.error('Error saving enrollments:', error);
      toast({
        title: "Error",
        description: "Failed to save enrollments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = ['Student Name', 'Email', 'Assignment Points', 'Participation Points', 'Overall Points', 'Overall Percentage', 'Letter Grade'];
    const csvData = grades.map(grade => [
      grade.full_name,
      grade.email,
      grade.assignment_points.toString(),
      grade.participation_points.toString(),
      grade.overall_points.toString(),
      grade.overall_percentage.toFixed(2),
      grade.letter_grade
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mus240_grades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "CSV file downloaded successfully",
    });
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true; // Show all users if no search term
    
    const fullName = (user.full_name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  const getLetterGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800 border-green-300';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'D': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'F': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!isAdmin) {
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center text-destructive">
            Access denied. Administrator privileges required.
          </div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20"></div>
        
        <main className="relative z-10 max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/classes/mus240" 
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to MUS 240
            </Link>
            
            <div className="text-center">
              <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <Users className="h-6 w-6 text-amber-300" />
                <span className="text-white/90 font-medium">Administrator</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
                Course Management
              </h1>
              <h2 className="text-xl md:text-2xl text-white/80 mb-6">Manage MUS 240 enrollments and view grades</h2>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex flex-wrap gap-4 justify-center">
            <Button 
              onClick={saveEnrollments} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Enrollments
            </Button>
            <Button 
              onClick={updateStudentRoles} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Update to Student Role
            </Button>
            <Button 
              onClick={downloadCSV} 
              variant="outline" 
              disabled={grades.length === 0}
              className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Grades CSV
            </Button>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* User Selection - Collapsible */}
            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <Collapsible open={!isEnrollmentCollapsed} onOpenChange={setIsEnrollmentCollapsed}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <UserCheck className="h-5 w-5 text-amber-600" />
                          Student Enrollment ({selectedUsers.size} selected)
                        </CardTitle>
                        <CardDescription>
                          Select users to enroll in MUS 240 Fall 2024
                        </CardDescription>
                      </div>
                      {isEnrollmentCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardHeader className="pt-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.user_id}
                          className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <Checkbox
                            checked={selectedUsers.has(user.user_id)}
                            onCheckedChange={(checked) => 
                              handleUserSelection(user.user_id, checked as boolean)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.full_name}
                              </p>
                              {user.is_enrolled && (
                                <Badge variant="secondary" className="text-xs">
                                  Enrolled
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(user.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Current Grades */}
            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-amber-600" />
                      Current Enrolled Students ({grades.length})
                    </CardTitle>
                    <CardDescription>
                      Current grades for enrolled students
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Overall</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.map((grade) => (
                        <TableRow key={grade.student_id}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{grade.full_name}</div>
                              <div className="text-xs text-gray-500">{grade.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{grade.overall_points} pts</div>
                              <div className="text-xs text-gray-500">
                                {grade.overall_percentage.toFixed(1)}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={getLetterGradeColor(grade.letter_grade)}
                            >
                              {grade.letter_grade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </UniversalLayout>
  );
};