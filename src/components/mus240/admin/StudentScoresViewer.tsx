import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { GraduationCap, Search, Download, Eye, TrendingUp, Award, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StudentScore {
  student_id: string;
  student_name: string;
  student_email: string;
  assignment_points: number;
  participation_points: number;
  overall_points: number;
  overall_percentage: number;
  letter_grade: string;
  calculated_at: string;
  submissions_count: number;
  latest_submission: string;
}

interface GradeDistribution {
  grade: string;
  count: number;
  percentage: number;
}

interface AssignmentStats {
  assignment_name: string;
  submissions_count: number;
  average_grade: number;
  highest_grade: number;
  lowest_grade: number;
}

export const StudentScoresViewer = () => {
  const [students, setStudents] = useState<StudentScore[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentScore[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<AssignmentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'grade' | 'percentage'>('percentage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedStudent, setSelectedStudent] = useState<StudentScore | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStudentScores();
    loadAssignmentStats();
  }, []);

  useEffect(() => {
    filterAndSortStudents();
  }, [students, searchTerm, sortBy, sortOrder]);

  const loadStudentScores = async () => {
    try {
      setLoading(true);

      // Get grade summaries
      const { data: summaryData, error: summaryError } = await supabase
        .from('mus240_grade_summaries')
        .select('*')
        .eq('semester', 'Fall 2024')
        .order('overall_percentage', { ascending: false });

      if (summaryError) throw summaryError;

      // Get student profiles
      const studentIds = summaryData?.map(s => s.student_id) || [];
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      if (profileError) throw profileError;

      // Get submission counts for each student
      const { data: submissionData, error: submissionError } = await supabase
        .from('assignment_submissions')
        .select('student_id, submission_date')
        .order('submission_date', { ascending: false });

      if (submissionError) throw submissionError;

      // Process student data
      const submissionCounts: Record<string, { count: number; latest: string }> = {};
      submissionData?.forEach(sub => {
        if (!submissionCounts[sub.student_id]) {
          submissionCounts[sub.student_id] = { count: 0, latest: sub.submission_date };
        }
        submissionCounts[sub.student_id].count++;
      });

      // Create profile lookup
      const profileLookup: Record<string, { full_name: string; email: string }> = {};
      profileData?.forEach(profile => {
        profileLookup[profile.user_id] = {
          full_name: profile.full_name || 'Unknown Student',
          email: profile.email || ''
        };
      });

      const studentsWithStats = summaryData?.map(summary => ({
        student_id: summary.student_id,
        student_name: profileLookup[summary.student_id]?.full_name || 'Unknown Student',
        student_email: profileLookup[summary.student_id]?.email || '',
        assignment_points: summary.assignment_points || 0,
        participation_points: summary.participation_points || 0,
        overall_points: summary.overall_points || 0,
        overall_percentage: summary.overall_percentage || 0,
        letter_grade: summary.letter_grade || 'F',
        calculated_at: summary.calculated_at,
        submissions_count: submissionCounts[summary.student_id]?.count || 0,
        latest_submission: submissionCounts[summary.student_id]?.latest || 'Never'
      })) || [];

      setStudents(studentsWithStats);
      calculateGradeDistribution(studentsWithStats);
    } catch (error) {
      console.error('Error loading student scores:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student scores',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAssignmentStats = async () => {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, grade')
        .not('grade', 'is', null);

      if (error) throw error;

      const stats: Record<string, number[]> = {};
      data?.forEach(submission => {
        const assignmentName = submission.assignment_id || 'Unknown Assignment';
        if (!stats[assignmentName]) {
          stats[assignmentName] = [];
        }
        stats[assignmentName].push(Number(submission.grade));
      });

      const assignmentStats = Object.entries(stats).map(([name, grades]) => ({
        assignment_name: name,
        submissions_count: grades.length,
        average_grade: Math.round(grades.reduce((sum, grade) => sum + grade, 0) / grades.length),
        highest_grade: Math.max(...grades),
        lowest_grade: Math.min(...grades)
      }));

      setAssignmentStats(assignmentStats);
    } catch (error) {
      console.error('Error loading assignment stats:', error);
    }
  };

  const calculateGradeDistribution = (studentData: StudentScore[]) => {
    const gradeCounts: Record<string, number> = {};
    studentData.forEach(student => {
      gradeCounts[student.letter_grade] = (gradeCounts[student.letter_grade] || 0) + 1;
    });

    const total = studentData.length;
    const distribution = Object.entries(gradeCounts).map(([grade, count]) => ({
      grade,
      count,
      percentage: Math.round((count / total) * 100)
    }));

    // Sort by grade order
    const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
    distribution.sort((a, b) => gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade));

    setGradeDistribution(distribution);
  };

  const filterAndSortStudents = () => {
    let filtered = students.filter(student =>
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.student_name;
          bValue = b.student_name;
          break;
        case 'grade':
          const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
          aValue = gradeOrder.indexOf(a.letter_grade);
          bValue = gradeOrder.indexOf(b.letter_grade);
          break;
        case 'percentage':
          aValue = a.overall_percentage;
          bValue = b.overall_percentage;
          break;
        default:
          aValue = a.overall_percentage;
          bValue = b.overall_percentage;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue as string) : (bValue as string).localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
      }
    });

    setFilteredStudents(filtered);
  };

  const exportScores = () => {
    const csvContent = [
      ['Student Name', 'Email', 'Assignment Points', 'Participation Points', 'Overall Points', 'Percentage', 'Letter Grade', 'Submissions'],
      ...filteredStudents.map(student => [
        student.student_name,
        student.student_email,
        student.assignment_points,
        student.participation_points,
        student.overall_points,
        `${student.overall_percentage}%`,
        student.letter_grade,
        student.submissions_count
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mus240-student-scores-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
    if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading student scores...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-gray-600">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(students.reduce((sum, s) => sum + s.overall_percentage, 0) / students.length)}%
                </p>
                <p className="text-sm text-gray-600">Class Average</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {students.filter(s => s.letter_grade.startsWith('A') || s.letter_grade.startsWith('B')).length}
                </p>
                <p className="text-sm text-gray-600">A/B Grades</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Search className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{assignmentStats.length}</p>
                <p className="text-sm text-gray-600">Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution Chart */}
      <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
        <CardHeader>
          <CardTitle>Grade Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Student Scores Table */}
      <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Student Scores</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadStudentScores}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportScores}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="percentage">Score</SelectItem>
                  <SelectItem value="grade">Grade</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Desc</SelectItem>
                  <SelectItem value="asc">Asc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Assignment Points</TableHead>
                <TableHead>Participation</TableHead>
                <TableHead>Overall Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.student_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{student.student_name}</p>
                      <p className="text-sm text-gray-600">{student.student_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{student.assignment_points}/650</p>
                      <Progress 
                        value={(student.assignment_points / 650) * 100} 
                        className="h-2 mt-1" 
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{student.participation_points}/75</p>
                      <Progress 
                        value={(student.participation_points / 75) * 100} 
                        className="h-2 mt-1" 
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{student.overall_percentage}%</p>
                      <p className="text-sm text-gray-600">{student.overall_points}/725</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getGradeColor(student.letter_grade)}>
                      {student.letter_grade}
                    </Badge>
                  </TableCell>
                  <TableCell>{student.submissions_count}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Student Details</DialogTitle>
                        </DialogHeader>
                        {selectedStudent && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold">{selectedStudent.student_name}</h4>
                              <p className="text-sm text-gray-600">{selectedStudent.student_email}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium">Assignment Points</p>
                                <p className="text-lg">{selectedStudent.assignment_points}/650</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Participation</p>
                                <p className="text-lg">{selectedStudent.participation_points}/75</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Overall Score</p>
                                <p className="text-lg">{selectedStudent.overall_percentage}%</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Letter Grade</p>
                                <Badge className={getGradeColor(selectedStudent.letter_grade)}>
                                  {selectedStudent.letter_grade}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};