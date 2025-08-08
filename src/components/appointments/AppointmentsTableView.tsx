import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Search,
  Calendar as CalendarIcon,
  Filter,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download
} from 'lucide-react';
import { format, parseISO, parse } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AppointmentRow {
  id: string;
  time: string;
  service: string;
  customer: string;
  duration: string;
  status: 'approved' | 'pending' | 'cancelled' | 'confirmed';
  employee: string;
  note?: string;
  serviceColor: string;
}

export const AppointmentsTableView = () => {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(5);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // Fetch auditions
      const { data: auditions, error: auditionsError } = await supabase
        .from('gw_auditions')
        .select('*')
        .order('audition_date', { ascending: true });

      if (auditionsError) throw auditionsError;

      // Fetch appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('gw_appointments')
        .select('*')
        .order('appointment_date', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Transform auditions to table format
      const auditionRows: AppointmentRow[] = (auditions || []).map(audition => {
        // Calculate duration from audition time if available, default to 30 min
        const duration = 30; // Standard audition duration
        
        return {
          id: audition.id,
          time: audition.audition_time || '12:00 PM',
          service: 'GLEE CLUB AUDITION',
          customer: `${audition.first_name} ${audition.last_name}`,
          duration: `${duration}min`,
          status: (audition.status as 'approved' | 'pending' | 'cancelled' | 'confirmed') || 'pending',
          employee: 'Glee Club Director',
          note: audition.additional_info || '',
          serviceColor: 'border-l-purple-500 bg-purple-50'
        };
      });

      // Transform appointments to table format
      const appointmentRows: AppointmentRow[] = (appointments || []).map(apt => {
        const aptDate = parseISO(apt.appointment_date);
        const startTime = format(aptDate, 'h:mm a');
        
        // Calculate actual duration from stored duration_minutes or default to 60
        const durationMinutes = apt.duration_minutes || 60;
        
        return {
          id: apt.id,
          time: startTime,
          service: apt.title || 'APPOINTMENT',
          customer: apt.client_name,
          duration: `${durationMinutes}min`,
          status: (apt.status as 'approved' | 'pending' | 'cancelled' | 'confirmed') || 'pending',
          employee: 'Provider',
          note: apt.notes || '',
          serviceColor: 'border-l-blue-500 bg-blue-50'
        };
      });

      const allRows = [...auditionRows, ...appointmentRows];
      setAppointments(allRows);

    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'confirmed':
        return (
          <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
            ✓ Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="text-yellow-700 border-yellow-200 bg-yellow-50">
            ⏳ Pending
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">
            ✕ Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAppointments(appointments.map(apt => apt.id));
    } else {
      setSelectedAppointments([]);
    }
  };

  const handleSelectAppointment = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAppointments(prev => [...prev, id]);
    } else {
      setSelectedAppointments(prev => prev.filter(aptId => aptId !== id));
    }
  };

  const filteredAppointments = appointments.filter(apt =>
    apt.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Appointments ({filteredAppointments.length})</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Aug 8, 2025'} - Aug 8, 2026
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedAppointments.length === filteredAppointments.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Customers</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAppointments.map((appointment) => (
              <TableRow key={appointment.id} className="hover:bg-gray-50">
                <TableCell>
                  <Checkbox
                    checked={selectedAppointments.includes(appointment.id)}
                    onCheckedChange={(checked) => handleSelectAppointment(appointment.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {appointment.time}
                </TableCell>
                <TableCell>
                  <div className={`border-l-4 pl-3 py-1 ${appointment.serviceColor} rounded-r`}>
                    {appointment.service}
                  </div>
                </TableCell>
                <TableCell>{appointment.customer}</TableCell>
                <TableCell>{appointment.duration}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-auto p-0">
                        {getStatusBadge(appointment.status)}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>Approved</DropdownMenuItem>
                      <DropdownMenuItem>Pending</DropdownMenuItem>
                      <DropdownMenuItem>Cancelled</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-gray-200">
                        {appointment.employee[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{appointment.employee}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    ⊕
                  </Button>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {[1, 2, 3, 4, 5].map(page => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="w-8"
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};