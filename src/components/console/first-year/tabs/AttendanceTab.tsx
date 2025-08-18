import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  Search, 
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { useFirstYearConsoleData } from "@/hooks/useFirstYearConsoleData";
import { useFirstYearStudents } from "@/hooks/useFirstYearStudents";

export const AttendanceTab = () => {
  const { cohortStats, attendanceData } = useFirstYearConsoleData();
  const { data: students = [], isLoading: studentsLoading } = useFirstYearStudents();
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excellent": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "good": return <Clock className="h-4 w-4 text-blue-600" />;
      case "concerning": return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "critical": return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent": return "default";
      case "good": return "secondary";
      case "concerning": return "outline";
      case "critical": return "destructive";
      default: return "outline";
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "low": return "default";
      case "medium": return "outline";
      case "high": return "destructive";
      default: return "secondary";
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance Monitoring</h2>
          <p className="text-muted-foreground">Track student engagement and check-in patterns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Overall Rate</p>
                <p className="text-xl font-bold">{cohortStats?.attendanceRate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-xl font-bold">{students.filter(s => s.riskLevel === 'high').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-xl font-bold">{students.reduce((sum, s) => sum + s.checkinsThisWeek, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Mood</p>
                <p className="text-xl font-bold">{students.length > 0 ? (students.reduce((sum, s) => sum + s.averageMood, 0) / students.length).toFixed(1) : "0.0"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle>Student Attendance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={student.avatar || ""} />
                    <AvatarFallback>
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{student.name}</h3>
                      {getStatusIcon(student.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Last check-in: {student.lastCheckin ? new Date(student.lastCheckin).toLocaleDateString() : "Never"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-semibold">
                      {student.checkinsThisWeek}/{student.totalRequired}
                    </p>
                    <p className="text-xs text-muted-foreground">This week</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getStatusBadge(student.status)}>
                      {student.status}
                    </Badge>
                    <Badge variant={getRiskBadge(student.riskLevel)}>
                      {student.riskLevel} risk
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};