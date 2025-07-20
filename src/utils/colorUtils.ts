// Utility function to get consistent event type colors across the calendar system
export const getEventTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'performance':
      return 'bg-event-performance text-event-performance-fg';
    case 'rehearsal':
      return 'bg-event-rehearsal text-event-rehearsal-fg';
    case 'sectionals':
      return 'bg-event-rehearsal text-event-rehearsal-fg';
    case 'meeting':
    case 'audition':
      return 'bg-event-meeting text-event-meeting-fg';
    case 'fundraiser':
    case 'workshop':
    case 'other':
    default:
      return 'bg-event-general text-event-general-fg';
  }
};

// Utility function to get consistent status colors
export const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'scheduled':
      return 'bg-status-scheduled text-status-scheduled-fg';
    case 'confirmed':
      return 'bg-status-confirmed text-status-confirmed-fg';
    case 'cancelled':
    case 'postponed':
      return 'bg-status-cancelled text-status-cancelled-fg';
    case 'completed':
      return 'bg-status-completed text-status-completed-fg';
    default:
      return 'bg-status-scheduled text-status-scheduled-fg';
  }
};