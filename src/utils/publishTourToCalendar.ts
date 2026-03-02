import { supabase } from "@/integrations/supabase/client";
// Tour calendar publish utility - v2

const MUS_070_CALENDAR_ID = '7053fa69-0d24-45c2-bd42-b191b5460e83';
const MUS_070_COURSE_ID = 'a0000000-0000-0000-0000-000000000070';

interface TourCalendarEvent {
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  location: string;
}

export const publishTourToCalendar = async () => {
  // First, remove any previously published tour events to avoid duplicates
  const { error: deleteError } = await supabase
    .from('gw_events')
    .delete()
    .eq('calendar_id', MUS_070_CALENDAR_ID)
    .eq('category', 'spring-tour-2026');

  if (deleteError) {
    console.error('Error clearing old tour events:', deleteError);
    throw deleteError;
  }

  const events: TourCalendarEvent[] = [
    // Day 1 - March 7: Atlanta Departure
    { title: '🍳 Breakfast before Departure', description: 'Spring Tour 2026 - Breakfast at Spelman before boarding the bus.', event_type: 'tour', start_date: '2026-03-07T07:00:00-05:00', end_date: '2026-03-07T08:30:00-05:00', location: 'Spelman College, Atlanta GA' },
    { title: '🚌 Depart Atlanta', description: 'Spring Tour 2026 begins! Bagged lunches provided.', event_type: 'tour', start_date: '2026-03-07T09:00:00-05:00', end_date: '2026-03-07T09:30:00-05:00', location: 'Spelman College, Atlanta GA' },

    // Day 2 - March 8: Huntsville
    { title: '📍 Arrive Huntsville', description: 'Spring Tour 2026 - Arrival in Huntsville, Alabama', event_type: 'tour', start_date: '2026-03-08T12:30:00-06:00', end_date: '2026-03-08T13:00:00-06:00', location: 'Huntsville, AL' },
    { title: '🎵 Performance – Huntsville, AL', description: 'Spring Tour 2026 Concert in Huntsville', event_type: 'performance', start_date: '2026-03-08T19:00:00-06:00', end_date: '2026-03-08T21:00:00-06:00', location: 'Huntsville, Alabama' },

    // Day 3 - March 9: Kansas City
    { title: '📍 Arrive Kansas City', description: 'Spring Tour 2026 - Arrival in Kansas City', event_type: 'tour', start_date: '2026-03-09T06:00:00-06:00', end_date: '2026-03-09T07:00:00-06:00', location: 'Kansas City' },
    { title: '🎵 Performance – Kansas City', description: 'Spring Tour 2026 Concert', event_type: 'performance', start_date: '2026-03-09T19:00:00-06:00', end_date: '2026-03-09T21:00:00-06:00', location: 'Kansas City' },

    // Day 4 - March 10: Travel to Chicago
    { title: '🚌 Depart Kansas City → Chicago', description: 'Spring Tour 2026 - Travel day', event_type: 'tour', start_date: '2026-03-10T07:00:00-06:00', end_date: '2026-03-10T08:00:00-06:00', location: 'Kansas City' },
    { title: '📍 Arrive Chicago', description: 'Spring Tour 2026 - Arrival in Chicago', event_type: 'tour', start_date: '2026-03-10T16:30:00-06:00', end_date: '2026-03-10T17:00:00-06:00', location: 'Chicago, IL' },
    { title: '🎵 Performance – Chicago, IL', description: 'Spring Tour 2026 Concert in Chicago', event_type: 'performance', start_date: '2026-03-10T19:00:00-06:00', end_date: '2026-03-10T21:00:00-06:00', location: 'Chicago, IL' },

    // Day 5 - March 11: Free Day
    { title: '🌟 Free Day – Chicago', description: 'Spring Tour 2026 - Enjoy your free day in Chicago!', event_type: 'tour', start_date: '2026-03-11T10:00:00-06:00', end_date: '2026-03-11T22:00:00-06:00', location: 'Chicago, IL' },

    // Day 6 - March 12: Kalamazoo
    { title: '🚌 Depart Chicago → Kalamazoo', description: 'Spring Tour 2026 - Travel to Kalamazoo', event_type: 'tour', start_date: '2026-03-12T09:00:00-06:00', end_date: '2026-03-12T09:30:00-06:00', location: 'Chicago, IL' },
    { title: '📍 Arrive Kalamazoo', description: 'Spring Tour 2026 - Arrival', event_type: 'tour', start_date: '2026-03-12T10:00:00-05:00', end_date: '2026-03-12T10:30:00-05:00', location: 'Kalamazoo, MI' },
    { title: '🎵 Performance – Kalamazoo, MI', description: 'Spring Tour 2026 Concert', event_type: 'performance', start_date: '2026-03-12T19:00:00-05:00', end_date: '2026-03-12T21:00:00-05:00', location: 'Kalamazoo, MI' },

    // Day 7 - March 13: Detroit
    { title: '🚌 Depart Kalamazoo → Detroit', description: 'Spring Tour 2026 - Travel to Detroit', event_type: 'tour', start_date: '2026-03-13T10:00:00-05:00', end_date: '2026-03-13T10:30:00-05:00', location: 'Kalamazoo, MI' },
    { title: '🎵 Performance – Detroit, MI', description: 'Spring Tour 2026 Concert', event_type: 'performance', start_date: '2026-03-13T19:00:00-05:00', end_date: '2026-03-13T21:00:00-05:00', location: 'Detroit, MI' },

    // Day 8 - March 14: Flint
    { title: '🎵 Performance – Flint, MI', description: 'Spring Tour 2026 Concert', event_type: 'performance', start_date: '2026-03-14T19:00:00-05:00', end_date: '2026-03-14T21:00:00-05:00', location: 'Flint, MI' },
    { title: '🚌 Depart Flint (Late Night)', description: 'Spring Tour 2026 - Overnight travel to Baltimore area', event_type: 'tour', start_date: '2026-03-14T23:00:00-05:00', end_date: '2026-03-14T23:30:00-05:00', location: 'Flint, MI' },

    // Day 9 - March 15: Baltimore
    { title: '📍 Arrive Baltimore Area', description: 'Spring Tour 2026 - Hotel: Holiday Inn Express & Suites, 6064 Marshalee Drive, Elkridge MD. Ph: (410) 579-8888', event_type: 'tour', start_date: '2026-03-15T09:00:00-05:00', end_date: '2026-03-15T09:30:00-05:00', location: 'Elkridge, MD' },
    { title: '🏨 Hotel Check-in – Baltimore', description: 'Holiday Inn Express & Suites Columbia East, 6064 Marshalee Drive, Elkridge MD 21075', event_type: 'tour', start_date: '2026-03-15T15:00:00-05:00', end_date: '2026-03-15T16:00:00-05:00', location: '6064 Marshalee Drive, Elkridge, MD 21075' },

    // Day 10 - March 16: New Brunswick
    { title: '🚌 Depart Baltimore → New Brunswick', description: 'Spring Tour 2026 - Travel to New Brunswick, NJ', event_type: 'tour', start_date: '2026-03-16T11:00:00-05:00', end_date: '2026-03-16T11:30:00-05:00', location: 'Elkridge, MD' },
    { title: '📍 Arrive New Brunswick', description: 'Spring Tour 2026 - Arrival in New Brunswick', event_type: 'tour', start_date: '2026-03-16T13:00:00-05:00', end_date: '2026-03-16T13:30:00-05:00', location: 'New Brunswick, NJ' },
    { title: '🎵 Performance – New Brunswick, NJ', description: 'Spring Tour 2026 Concert', event_type: 'performance', start_date: '2026-03-16T19:00:00-05:00', end_date: '2026-03-16T21:00:00-05:00', location: 'New Brunswick, NJ' },

    // Day 11 - March 17: New York
    { title: '📍 Arrive New York City', description: 'Spring Tour 2026 - Welcome to NYC!', event_type: 'tour', start_date: '2026-03-17T12:30:00-05:00', end_date: '2026-03-17T13:00:00-05:00', location: 'New York, NY' },
    { title: '🎵 Performance – New York City', description: 'Spring Tour 2026 Concert in NYC', event_type: 'performance', start_date: '2026-03-17T19:00:00-05:00', end_date: '2026-03-17T21:00:00-05:00', location: 'New York, NY' },

    // Day 12 - March 18: Return Home
    { title: '🚌 Depart NYC → Atlanta', description: 'Spring Tour 2026 - Heading home!', event_type: 'tour', start_date: '2026-03-18T08:00:00-05:00', end_date: '2026-03-18T08:30:00-05:00', location: 'New York, NY' },
    { title: '🏠 Arrive Atlanta – Tour Complete!', description: 'Spring Tour 2026 - Welcome home Glee Club! Tour complete.', event_type: 'tour', start_date: '2026-03-18T20:00:00-05:00', end_date: '2026-03-18T21:00:00-05:00', location: 'Spelman College, Atlanta GA' },
  ];

  const eventsToInsert = events.map(e => ({
    ...e,
    calendar_id: MUS_070_CALENDAR_ID,
    course_id: MUS_070_COURSE_ID,
    is_public: false,
    status: 'confirmed',
    category: 'spring-tour-2026',
    tags: ['tour', 'spring-2026'],
    attendance_required: e.event_type === 'performance',
    attendance_type: e.event_type === 'performance' ? 'required' : 'none',
  }));

  const { data, error } = await supabase
    .from('gw_events')
    .insert(eventsToInsert)
    .select('id, title');

  if (error) {
    console.error('Error publishing tour events:', error);
    throw error;
  }

  return data;
};
