
import React from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import PublicAppointmentBooking from '@/components/appointments/PublicAppointmentBooking';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, User, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const OfficeHoursPage: React.FC = () => {
  const currentDate = new Date();
  const resumeDate = new Date('2025-01-13'); // Spring semester start (adjust as needed)
  const isBookingPaused = currentDate < new Date('2024-12-09') || 
                         (currentDate >= new Date('2024-12-10') && currentDate < resumeDate);

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              Office Hours with Dr. Johnson
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Schedule individual consultation time with Dr. Kevin Phillip Johnson for 
              academic guidance, career mentoring, and musical instruction.
            </p>

            {/* Key Information Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-800 mb-2">Available Days</h3>
                  <p className="text-sm text-gray-600">Monday & Wednesday<br />Tuesday & Thursday</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-800 mb-2">Duration</h3>
                  <p className="text-sm text-gray-600">30-minute sessions<br />Up to 1 hour per booking</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <User className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-800 mb-2">What to Expect</h3>
                  <p className="text-sm text-gray-600">Academic advising<br />Music lessons & guidance</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Booking Status Alert */}
          {isBookingPaused && (
            <Alert className="mb-8 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {currentDate < new Date('2024-12-09') 
                  ? "Office hours booking is currently paused until December 9th."
                  : "Office hours booking will resume at the start of the spring semester."}
              </AlertDescription>
            </Alert>
          )}

          {/* Booking Component */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-8">
              {!isBookingPaused ? (
                <PublicAppointmentBooking
                  title="Schedule Your Office Hours"
                  subtitle="Select your preferred date and time below"
                  appointmentType="office-hours"
                  defaultDuration={30}
                  maxDuration={60}
                  allowedDays={[1, 2, 3, 4]} // Mon, Tue, Wed, Thu
                  startHour={{
                    1: 11, // Monday: 11am start (after 11am rule)
                    2: 13, // Tuesday: 1pm start (not before 1pm rule) 
                    3: 11, // Wednesday: 11am start
                    4: 13  // Thursday: 1pm start
                  }}
                  endHour={{
                    1: 17, // Monday: 5pm end (before Glee Club)
                    2: 19, // Tuesday: 7pm end (available until evening)
                    3: 17, // Wednesday: 5pm end (before Glee Club)
                    4: 19  // Thursday: 7pm end (before Lyke House)
                  }}
                  busyCalendarName="Doc's Schedule"
                />
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Booking Temporarily Unavailable
                  </h3>
                  <p className="text-gray-600">
                    Office hours booking will resume after the winter break. 
                    Please check back after the start of the spring semester.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <div className="mt-12 text-center">
            <Card className="bg-blue-50/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Preparation Tips
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p className="mb-2">• Come prepared with specific questions</p>
                    <p className="mb-2">• Bring relevant materials or assignments</p>
                  </div>
                  <div>
                    <p className="mb-2">• Have your academic goals in mind</p>
                    <p className="mb-2">• Be ready to discuss your progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default OfficeHoursPage;
