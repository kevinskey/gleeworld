import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuditionLogs, AuditionLog } from "@/hooks/useAuditionLogs";
import { 
  Calendar, 
  Clock, 
  User, 
  Star, 
  Music,
  Search,
  Filter,
  Eye,
  Save,
  X,
  Plus
} from "lucide-react";
import { format } from "date-fns";

export const AuditionLogs = () => {
  const { 
    logs, 
    loading, 
    updateLogStatus, 
    saveGradeData: saveGrade, 
    addSampleData 
  } = useAuditionLogs();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditionLog | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [gradeData, setGradeData] = useState({
    vocal_score: "",
    musicality_score: "",
    stage_presence_score: "",
    overall_score: "",
    feedback: "",
    recommendation: ""
  });

  const openReviewDialog = (log: AuditionLog) => {
    setSelectedLog(log);
    setGradeData(log.grade_data || {
      vocal_score: "",
      musicality_score: "",
      stage_presence_score: "",
      overall_score: "",
      feedback: "",
      recommendation: ""
    });
    setIsReviewDialogOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedLog) return;
    
    await saveGrade(selectedLog.id, gradeData);
    setIsReviewDialogOpen(false);
    setSelectedLog(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-yellow-100 text-yellow-800';
      case 'graded': return 'bg-green-100 text-green-800';
      case 'no_show': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.applicant_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Audition Logs
            </CardTitle>
            {logs.length === 0 && (
              <Button onClick={addSampleData} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Sample Data
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Logs List */}
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audition logs found</p>
                {logs.length === 0 && (
                  <Button onClick={addSampleData} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sample Audition Logs
                  </Button>
                )}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <Card key={log.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{log.applicant_name}</span>
                          <Badge className={getStatusColor(log.status)}>
                            {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                          </Badge>
                          {log.voice_part && (
                            <Badge variant="outline">{log.voice_part}</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(log.audition_date), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.audition_time}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-500">{log.applicant_email}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View Application
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Application Details - {log.applicant_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <strong>Name:</strong> {log.applicant_name}
                                </div>
                                <div>
                                  <strong>Email:</strong> {log.applicant_email}
                                </div>
                                <div>
                                  <strong>Voice Part:</strong> {log.voice_part || 'Not specified'}
                                </div>
                                <div>
                                  <strong>Status:</strong> 
                                  <Badge className={`ml-2 ${getStatusColor(log.status)}`}>
                                    {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                                  </Badge>
                                </div>
                              </div>
                              
                              {log.application_data && Object.keys(log.application_data).length > 0 && (
                                <div>
                                  <strong>Application Data:</strong>
                                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                    {typeof log.application_data === 'object' ? 
                                      Object.entries(log.application_data).map(([key, value]) => (
                                        <div key={key} className="mb-2">
                                          <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {String(value)}
                                        </div>
                                      )) : 
                                      <pre>{JSON.stringify(log.application_data, null, 2)}</pre>
                                    }
                                  </div>
                                </div>
                              )}
                              
                              {log.grade_data && Object.keys(log.grade_data).length > 0 && (
                                <div>
                                  <strong>Grade Data:</strong>
                                  <div className="mt-2 p-3 bg-green-50 rounded text-sm">
                                    {Object.entries(log.grade_data).map(([key, value]) => (
                                      <div key={key} className="mb-2">
                                        <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {String(value)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {log.notes && (
                                <div>
                                  <strong>Notes:</strong>
                                  <p className="mt-1 p-3 bg-gray-50 rounded">{log.notes}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => openReviewDialog(log)}
                          disabled={log.status === 'graded'}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          {log.status === 'graded' ? 'View Grade' : 'Grade'}
                        </Button>

                        <Select
                          value={log.status}
                          onValueChange={(value) => updateLogStatus(log.id, value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="graded">Graded</SelectItem>
                            <SelectItem value="no_show">No Show</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grading Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              {selectedLog?.status === 'graded' ? 'View Grade' : 'Grade Audition'} - {selectedLog?.applicant_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Vocal Score (1-10)</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={gradeData.vocal_score}
                  onChange={(e) => setGradeData(prev => ({ ...prev, vocal_score: e.target.value }))}
                  placeholder="Rate vocal ability"
                  disabled={selectedLog?.status === 'graded'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Musicality Score (1-10)</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={gradeData.musicality_score}
                  onChange={(e) => setGradeData(prev => ({ ...prev, musicality_score: e.target.value }))}
                  placeholder="Rate musicality"
                  disabled={selectedLog?.status === 'graded'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stage Presence (1-10)</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={gradeData.stage_presence_score}
                  onChange={(e) => setGradeData(prev => ({ ...prev, stage_presence_score: e.target.value }))}
                  placeholder="Rate stage presence"
                  disabled={selectedLog?.status === 'graded'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Overall Score (1-10)</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={gradeData.overall_score}
                  onChange={(e) => setGradeData(prev => ({ ...prev, overall_score: e.target.value }))}
                  placeholder="Overall rating"
                  disabled={selectedLog?.status === 'graded'}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Feedback</label>
              <Textarea
                value={gradeData.feedback}
                onChange={(e) => setGradeData(prev => ({ ...prev, feedback: e.target.value }))}
                placeholder="Detailed feedback for the auditionee..."
                rows={4}
                disabled={selectedLog?.status === 'graded'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Recommendation</label>
              <Select
                value={gradeData.recommendation}
                onValueChange={(value) => setGradeData(prev => ({ ...prev, recommendation: value }))}
                disabled={selectedLog?.status === 'graded'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recommendation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accept">Accept</SelectItem>
                  <SelectItem value="waitlist">Waitlist</SelectItem>
                  <SelectItem value="decline">Decline</SelectItem>
                  <SelectItem value="callback">Callback Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsReviewDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
              {selectedLog?.status !== 'graded' && (
                <Button onClick={handleSaveGrade}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Grade
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};