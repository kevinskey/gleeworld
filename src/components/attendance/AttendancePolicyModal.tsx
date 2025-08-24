import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, AlertTriangle, Calendar, Users } from 'lucide-react';

interface AttendancePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttendancePolicyModal = ({ isOpen, onClose }: AttendancePolicyModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-600" />
            Attendance Policy
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-4">
          {/* Main Policy */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Attendance Policy
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-medium">•</span>
                    <span>Each student is allowed to miss <strong>3 classes</strong> with no penalty.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-medium">•</span>
                    <span>Any absence <strong>beyond three</strong> lowers the grade by <strong>one letter grade</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 font-medium">•</span>
                    <span>Students who miss <strong>6 classes</strong> will be <strong>dropped from the class</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-medium">•</span>
                    <span>Exceptions will be made for <strong>extenuating circumstances</strong> (chronic illness or family emergencies), at the professor's discretion.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 font-medium">•</span>
                    <span>It is the student's responsibility to <strong>communicate with the professor</strong> about attendance issues.</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tardiness Policy */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Tardiness Policy
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-medium">•</span>
                    <span>Each student is allowed <strong>3 tardies</strong> without penalty.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-medium">•</span>
                    <span>A tardy will be issued when a student is not in the classroom when class begins.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-medium">•</span>
                    <span><strong>Every 2 tardies beyond the first 3</strong> will result in <strong>1 unexcused absence</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 font-medium">•</span>
                    <span><strong>Missing a performance</strong> = <strong>2 unexcused absences</strong></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Additional Attendance Notes
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-medium">•</span>
                    <span>Students with classes beginning at <strong>5:05 PM</strong> are excused until <strong>5:15 PM</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 font-medium">•</span>
                    <span>Students must <strong>fill out an absence form</strong> with the Secretary at least <strong>one day before</strong> any missed rehearsal or performance.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-medium">•</span>
                    <span>Students must <strong>register for Glee Club</strong> through <strong>Banner Web</strong> (0 or 1 credit).</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rehearsal Expectations */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-red-600" />
                  Rehearsal Expectations
                </h3>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    Failure to meet rehearsal expectations may result in <strong>dismissal from rehearsal</strong> and an <strong>unexcused absence</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Reference */}
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-purple-800 mb-4">Quick Reference</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <Badge className="bg-green-100 text-green-800 mb-2">Allowed</Badge>
                  <div className="text-2xl font-bold text-green-600">3</div>
                  <div className="text-xs text-muted-foreground">Absences & Tardies</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <Badge className="bg-amber-100 text-amber-800 mb-2">Penalty</Badge>
                  <div className="text-2xl font-bold text-amber-600">4+</div>
                  <div className="text-xs text-muted-foreground">Grade Reduction</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <Badge className="bg-red-100 text-red-800 mb-2">Dropped</Badge>
                  <div className="text-2xl font-bold text-red-600">6</div>
                  <div className="text-xs text-muted-foreground">Absences = Drop</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};