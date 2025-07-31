import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  Plus,
  Trash2,
  FileText,
  GraduationCap,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";

export const AuditionLogs = () => {
  const { 
    logs, 
    allTimeSlots,
    loading, 
    updateLogStatus, 
    saveGradeData: saveGrade, 
    addSampleData,
    deleteAuditionLog
  } = useAuditionLogs();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditionLog | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [gradeData, setGradeData] = useState({
    vocal_score: "",
    musicality_score: "",
    stage_presence_score: "",
    overall_score: "",
    feedback: "",
    recommendation: "",
    is_soloist: false,
    potential_section: "",
    pass_fail: false
  });

  const openReviewDialog = (log: AuditionLog) => {
    setSelectedLog(log);
    setGradeData(log.grade_data || {
      vocal_score: "",
      musicality_score: "",
      stage_presence_score: "",
      overall_score: "",
      feedback: "",
      recommendation: "",
      is_soloist: false,
      potential_section: "",
      pass_fail: false
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

  const handleDeleteLog = async () => {
    if (!logToDelete) return;
    
    try {
      await deleteAuditionLog(logToDelete);
      setDeleteConfirmOpen(false);
      setLogToDelete(null);
    } catch (error) {
      console.error('Failed to delete audition log:', error);
    }
  };

  const totalSlots = allTimeSlots.length;
  const scheduledSlots = allTimeSlots.filter(slot => slot.isScheduled).length;
  const availableSlots = totalSlots - scheduledSlots;

  const openDeleteConfirm = (logId: string) => {
    setLogToDelete(logId);
    setDeleteConfirmOpen(true);
  };

  const filteredSlots = allTimeSlots.filter(slot => {
    if (slot.isScheduled && slot.auditionLog) {
      const log = slot.auditionLog;
      const matchesSearch = log.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.applicant_email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;
      return matchesSearch && matchesStatus;
    } else {
      // For unscheduled slots, show them when no specific filter is applied
      return statusFilter === "all" && searchTerm === "";
    }
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
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">{totalSlots}</span> total slots • 
                <span className="font-medium text-green-600 ml-1">{availableSlots}</span> available • 
                <span className="font-medium text-blue-600 ml-1">{scheduledSlots}</span> scheduled
              </div>
              {logs.length === 0 && (
                <Button onClick={addSampleData} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sample Data
                </Button>
              )}
            </div>
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
            {filteredSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audition slots found</p>
                {logs.length === 0 && (
                  <Button onClick={addSampleData} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sample Audition Logs
                  </Button>
                )}
              </div>
            ) : (
              filteredSlots.map((slot) => (
                <Card key={slot.id} className={`hover:shadow-md transition-shadow ${!slot.isScheduled ? 'border-dashed opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    {slot.isScheduled && slot.auditionLog ? (
                      // Scheduled audition slot
                       <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">{/* Modified to be responsive */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{slot.auditionLog.applicant_name}</span>
                            <Badge className={getStatusColor(slot.auditionLog.status)}>
                              {slot.auditionLog.status.charAt(0).toUpperCase() + slot.auditionLog.status.slice(1)}
                            </Badge>
                            {slot.auditionLog.voice_part && (
                              <Badge variant="outline">{slot.auditionLog.voice_part}</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(slot.auditionLog.audition_date), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {slot.auditionLog.audition_time}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-500">{slot.auditionLog.applicant_email}</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 shrink-0">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                                <Eye className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">View Application</span>
                                <span className="sm:hidden">View</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Application Details - {slot.auditionLog.applicant_name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-6">
                                {/* Header section with picture and basic info */}
                                <div className="flex gap-6 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg">
                                   {/* Applicant Picture */}
                                   <div className="flex-shrink-0">
                                     {slot.auditionLog.applicant_picture_url ? (
                                       <div className="relative">
                                         <Dialog>
                                           <DialogTrigger asChild>
                                             <img 
                                               src={slot.auditionLog.applicant_picture_url} 
                                               alt={`${slot.auditionLog.applicant_name}'s headshot`}
                                               className="w-24 h-24 rounded-full object-cover border-2 border-primary/20 cursor-pointer hover:opacity-80 transition-opacity"
                                               onError={(e) => {
                                                 console.log('Image failed to load:', slot.auditionLog.applicant_picture_url);
                                                 e.currentTarget.style.display = 'none';
                                                 e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                               }}
                                               onLoad={() => {
                                                 console.log('Image loaded successfully:', slot.auditionLog.applicant_picture_url);
                                               }}
                                             />
                                           </DialogTrigger>
                                           <DialogContent className="max-w-2xl">
                                             <img 
                                               src={slot.auditionLog.applicant_picture_url} 
                                               alt={`${slot.auditionLog.applicant_name}'s full photo`}
                                               className="w-full h-auto rounded-lg"
                                             />
                                           </DialogContent>
                                         </Dialog>
                                         <div className="hidden w-24 h-24 rounded-full bg-muted border-2 border-primary/20 flex items-center justify-center">
                                           <User className="h-8 w-8 text-muted-foreground" />
                                         </div>
                                       </div>
                                     ) : (
                                       <div className="w-24 h-24 rounded-full bg-muted border-2 border-primary/20 flex items-center justify-center">
                                         <User className="h-8 w-8 text-muted-foreground" />
                                         <span className="sr-only">No photo available</span>
                                       </div>
                                     )}
                                   </div>
                                  
                                  {/* Basic Info */}
                                  <div className="flex-1 space-y-2">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <strong className="text-sm text-muted-foreground">Name:</strong>
                                        <p className="font-semibold">{slot.auditionLog.applicant_name}</p>
                                      </div>
                                      <div>
                                        <strong className="text-sm text-muted-foreground">Email:</strong>
                                        <p className="text-sm">{slot.auditionLog.applicant_email}</p>
                                      </div>
                                      <div>
                                        <strong className="text-sm text-muted-foreground">Voice Part:</strong>
                                        <p>{slot.auditionLog.voice_part || 'Not specified'}</p>
                                      </div>
                                      <div>
                                        <strong className="text-sm text-muted-foreground">Status:</strong>
                                        <Badge className={`ml-2 ${getStatusColor(slot.auditionLog.status)}`}>
                                          {slot.auditionLog.status.charAt(0).toUpperCase() + slot.auditionLog.status.slice(1)}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Application Data */}
                                {slot.auditionLog.application_data && Object.keys(slot.auditionLog.application_data).length > 0 && (
                                  <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                      <FileText className="h-5 w-5" />
                                      Application Information
                                    </h3>
                                    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                                      {typeof slot.auditionLog.application_data === 'object' ? 
                                        Object.entries(slot.auditionLog.application_data).map(([key, value]) => (
                                          <div key={key} className="flex justify-between items-start py-2 border-b border-border/30 last:border-0">
                                            <strong className="text-sm text-muted-foreground min-w-0 flex-1 mr-4">
                                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                                            </strong>
                                            <span className="text-sm min-w-0 flex-1 text-right">{String(value)}</span>
                                          </div>
                                        )) : 
                                        <pre className="text-sm bg-background p-3 rounded border overflow-x-auto">
                                          {JSON.stringify(slot.auditionLog.application_data, null, 2)}
                                        </pre>
                                      }
                                    </div>
                                  </div>
                                )}

                                {/* Current Grades Display */}
                                {slot.auditionLog.grade_data && Object.keys(slot.auditionLog.grade_data).length > 0 && (
                                  <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                      <Star className="h-5 w-5 text-yellow-500" />
                                      Current Grades
                                    </h3>
                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg space-y-3">
                                      {Object.entries(slot.auditionLog.grade_data).map(([key, value]) => (
                                        <div key={key} className="flex justify-between items-center py-2 border-b border-yellow-200/50 dark:border-yellow-800/30 last:border-0">
                                          <strong className="text-sm">
                                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                                          </strong>
                                          <span className="font-semibold text-yellow-700 dark:text-yellow-300">{String(value)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Quick Grading Section */}
                                <div className="border-t pt-6">
                                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5 text-primary" />
                                    Grading Section
                                  </h3>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-primary/5 rounded-lg">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Vocal Quality</label>
                                      <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((rating) => (
                                          <button
                                            key={rating}
                                            className="w-8 h-8 rounded-full border-2 border-yellow-300 hover:bg-yellow-100 flex items-center justify-center text-sm font-medium transition-colors"
                                          >
                                            {rating}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Musicality</label>
                                      <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((rating) => (
                                          <button
                                            key={rating}
                                            className="w-8 h-8 rounded-full border-2 border-blue-300 hover:bg-blue-100 flex items-center justify-center text-sm font-medium transition-colors"
                                          >
                                            {rating}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Overall</label>
                                      <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((rating) => (
                                          <button
                                            key={rating}
                                            className="w-8 h-8 rounded-full border-2 border-green-300 hover:bg-green-100 flex items-center justify-center text-sm font-medium transition-colors"
                                          >
                                            {rating}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4 space-y-3">
                                    <label className="text-sm font-medium">Grading Notes</label>
                                    <textarea 
                                      placeholder="Add grading notes and feedback..."
                                      className="w-full h-20 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <Button variant="outline" size="sm">
                                        Save Draft
                                      </Button>
                                      <Button size="sm">
                                        Submit Grade
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                {/* Notes */}
                                {slot.auditionLog.notes && (
                                  <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                      <MessageSquare className="h-5 w-5" />
                                      Additional Notes
                                    </h3>
                                    <div className="p-4 bg-muted/30 rounded-lg">
                                      <p className="text-sm leading-relaxed">{slot.auditionLog.notes}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => openReviewDialog(slot.auditionLog)}
                            disabled={slot.auditionLog.status === 'graded'}
                            className="w-full sm:w-auto text-xs sm:text-sm"
                          >
                            <Star className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">{slot.auditionLog.status === 'graded' ? 'View Grade' : 'Grade'}</span>
                            <span className="sm:hidden">{slot.auditionLog.status === 'graded' ? 'View' : 'Grade'}</span>
                          </Button>

                          <Select
                            value={slot.auditionLog.status}
                            onValueChange={(value) => updateLogStatus(slot.auditionLog.id, value)}
                          >
                            <SelectTrigger className="w-full sm:w-32 text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="graded">Graded</SelectItem>
                              <SelectItem value="no_show">No Show</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDeleteConfirm(slot.auditionLog.id)}
                            className="w-full sm:w-auto text-xs sm:text-sm"
                          >
                            <Trash2 className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Delete</span>
                            <span className="sm:hidden">Del</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Available but unscheduled slot
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-500">Available Slot</span>
                            <Badge variant="outline" className="border-dashed">
                              Available
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(slot.date), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {slot.time}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-400">
                          No audition scheduled
                        </div>
                      </div>
                    )}
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
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Potential Section</label>
                <Select
                  value={gradeData.potential_section}
                  onValueChange={(value) => setGradeData(prev => ({ ...prev, potential_section: value }))}
                  disabled={selectedLog?.status === 'graded'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="s1">Soprano 1</SelectItem>
                    <SelectItem value="s2">Soprano 2</SelectItem>
                    <SelectItem value="a1">Alto 1</SelectItem>
                    <SelectItem value="a2">Alto 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_soloist"
                    checked={gradeData.is_soloist}
                    onCheckedChange={(checked) => setGradeData(prev => ({ ...prev, is_soloist: !!checked }))}
                    disabled={selectedLog?.status === 'graded'}
                  />
                  <label 
                    htmlFor="is_soloist" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Soloist Potential
                  </label>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="pass_fail"
                  checked={gradeData.pass_fail}
                  onCheckedChange={(checked) => setGradeData(prev => ({ ...prev, pass_fail: !!checked }))}
                  disabled={selectedLog?.status === 'graded'}
                  className="h-5 w-5"
                />
                <label 
                  htmlFor="pass_fail" 
                  className="text-lg font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  PASS - Accept into Glee Club
                </label>
              </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Audition Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete this audition log? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteLog}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};