import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Download, Edit, Save, X, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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

interface EditingGrade extends StudentGrade {
  isEditing: boolean;
  tempAssignmentPoints?: number;
  tempParticipationPoints?: number;
}

export const AdminGradesCard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [grades, setGrades] = useState<EditingGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const { data: summaries, error: summariesError } = await supabase
        .from('mus240_grade_summaries')
        .select(`
          *,
          gw_profiles!inner(full_name, email)
        `)
        .eq('semester', 'Fall 2024')
        .order('gw_profiles(full_name)');

      if (summariesError) throw summariesError;

      const formattedGrades: EditingGrade[] = (summaries || []).map((summary: any) => ({
        student_id: summary.student_id,
        full_name: summary.gw_profiles.full_name || 'Unknown',
        email: summary.gw_profiles.email || '',
        assignment_points: summary.assignment_points || 0,
        participation_points: summary.participation_points || 0,
        overall_points: summary.overall_points || 0,
        overall_percentage: summary.overall_percentage || 0,
        letter_grade: summary.letter_grade || 'N/A',
        semester: summary.semester,
        isEditing: false,
      }));

      setGrades(formattedGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast({
        title: "Error",
        description: "Failed to fetch student grades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (studentId: string) => {
    setGrades(prev => prev.map(grade => 
      grade.student_id === studentId 
        ? { 
            ...grade, 
            isEditing: true, 
            tempAssignmentPoints: grade.assignment_points,
            tempParticipationPoints: grade.participation_points 
          }
        : grade
    ));
  };

  const handleCancel = (studentId: string) => {
    setGrades(prev => prev.map(grade => 
      grade.student_id === studentId 
        ? { 
            ...grade, 
            isEditing: false, 
            tempAssignmentPoints: undefined,
            tempParticipationPoints: undefined 
          }
        : grade
    ));
  };

  const handleSave = async (studentId: string) => {
    const grade = grades.find(g => g.student_id === studentId);
    if (!grade) return;

    try {
      const { error } = await supabase
        .from('mus240_grade_summaries')
        .update({
          assignment_points: grade.tempAssignmentPoints || grade.assignment_points,
          participation_points: grade.tempParticipationPoints || grade.participation_points,
          updated_at: new Date().toISOString(),
        })
        .eq('student_id', studentId)
        .eq('semester', 'Fall 2024');

      if (error) throw error;

      // Recalculate the grade summary
      const { error: calcError } = await supabase.rpc('calculate_mus240_grade_summary', {
        student_id_param: studentId,
        semester_param: 'Fall 2024'
      });

      if (calcError) {
        console.error('Error recalculating grade:', calcError);
      }

      toast({
        title: "Success",
        description: "Grade updated successfully",
      });

      // Refresh the grades
      await fetchGrades();
    } catch (error) {
      console.error('Error updating grade:', error);
      toast({
        title: "Error",
        description: "Failed to update grade",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (studentId: string, field: 'tempAssignmentPoints' | 'tempParticipationPoints', value: string) => {
    const numValue = parseFloat(value) || 0;
    setGrades(prev => prev.map(grade => 
      grade.student_id === studentId 
        ? { ...grade, [field]: numValue }
        : grade
    ));
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
    return null; // Don't show the card to non-admins
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/30 hover:bg-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Administrator</h3>
          </div>
          <p className="text-gray-600 leading-relaxed">Manage student grades and export data</p>
        </div>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            MUS 240 Student Grades Administration
          </DialogTitle>
          <DialogDescription>
            View, edit, and export student grades for Fall 2024
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Button onClick={fetchGrades} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh Data'}
            </Button>
            <Button 
              onClick={downloadCSV} 
              variant="outline" 
              disabled={grades.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {grades.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assignment Points</TableHead>
                    <TableHead>Participation Points</TableHead>
                    <TableHead>Overall Points</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Letter Grade</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((grade) => (
                    <TableRow key={grade.student_id}>
                      <TableCell className="font-medium">{grade.full_name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{grade.email}</TableCell>
                      <TableCell>
                        {grade.isEditing ? (
                          <Input
                            type="number"
                            value={grade.tempAssignmentPoints || 0}
                            onChange={(e) => handleInputChange(grade.student_id, 'tempAssignmentPoints', e.target.value)}
                            className="w-20"
                            min="0"
                            max="650"
                          />
                        ) : (
                          <span>{grade.assignment_points}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {grade.isEditing ? (
                          <Input
                            type="number"
                            value={grade.tempParticipationPoints || 0}
                            onChange={(e) => handleInputChange(grade.student_id, 'tempParticipationPoints', e.target.value)}
                            className="w-20"
                            min="0"
                            max="75"
                          />
                        ) : (
                          <span>{grade.participation_points}</span>
                        )}
                      </TableCell>
                      <TableCell>{grade.overall_points}</TableCell>
                      <TableCell>{grade.overall_percentage.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getLetterGradeColor(grade.letter_grade)}>
                          {grade.letter_grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {grade.isEditing ? (
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              onClick={() => handleSave(grade.student_id)}
                              className="h-8 w-8 p-0"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCancel(grade.student_id)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEdit(grade.student_id)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {loading ? 'Loading student grades...' : 'No student grades found. Click "Refresh Data" to load grades.'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};