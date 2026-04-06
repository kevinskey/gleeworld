import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface TourEvent {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  event_type: string | null;
  venue_name: string | null;
  venue_address: string | null;
  concert_time: string | null;
  host_name: string | null;
  host_phone: string | null;
  host_email: string | null;
  meal_info: string | null;
  notes: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  lodging_name: string | null;
  lodging_address: string | null;
}

interface RosterMember {
  full_name: string;
  voice_part: string | null;
  status: string;
}

const COLORS = {
  primary: [79, 70, 229] as [number, number, number],    // indigo
  dark: [30, 30, 50] as [number, number, number],
  gray: [100, 100, 120] as [number, number, number],
  lightBg: [245, 245, 250] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  accent: [220, 220, 235] as [number, number, number],
};

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 32, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 18);
  
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 26);
  }
  
  // Date generated
  doc.setFontSize(8);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, pageWidth - 14, 26, { align: 'right' });
}

function addFooter(doc: jsPDF, pageNum: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
  
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.gray);
  doc.text('Spelman College Glee Club', 14, pageHeight - 9);
  doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 9, { align: 'right' });
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 25) {
    addFooter(doc, doc.getNumberOfPages());
    doc.addPage();
    addFooter(doc, doc.getNumberOfPages());
    return 42;
  }
  return y;
}

export function exportItineraryPdf(events: TourEvent[], tourName?: string) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 28;
  
  const title = tourName || 'Tour Itinerary';
  
  // Sort events by date
  const sorted = [...events].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  
  // Group by city
  const getCityKey = (e: TourEvent) => {
    if (!e.location) return 'Unknown Location';
    return e.location.split(',')[0].trim();
  };
  
  const cityGroups: { city: string; fullLocation: string; events: TourEvent[] }[] = [];
  const cityMap = new Map<string, number>();
  
  sorted.forEach(event => {
    const city = getCityKey(event);
    if (cityMap.has(city)) {
      cityGroups[cityMap.get(city)!].events.push(event);
    } else {
      cityMap.set(city, cityGroups.length);
      cityGroups.push({ city, fullLocation: event.location, events: [event] });
    }
  });
  
  addHeader(doc, title, `${sorted.length} stops · ${cityGroups.length} cities`);
  addFooter(doc, 1);
  
  let y = 42;
  
  cityGroups.forEach((group, gi) => {
    y = checkPageBreak(doc, y, 25);
    
    // City header
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(14, y, contentWidth, 10, 2, 2, 'F');
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`📍 ${group.city}`, 18, y + 7);
    
    const dateRange = group.events.length > 1
      ? `${format(new Date(group.events[0].start_date), 'MMM d')} – ${format(new Date(group.events[group.events.length - 1].start_date), 'MMM d, yyyy')}`
      : format(new Date(group.events[0].start_date), 'MMM d, yyyy');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(dateRange, pageWidth - 18, y + 7, { align: 'right' });
    
    y += 14;
    
    group.events.forEach((event, ei) => {
      y = checkPageBreak(doc, y, 30);
      
      // Event card
      const typeLabel = event.event_type ? event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1) : 'Event';
      
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(event.title, 18, y);
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.gray);
      
      const dateLine = format(new Date(event.start_date), 'EEE, MMM d, yyyy');
      doc.text(`${typeLabel} · ${dateLine}`, 18, y + 5);
      
      y += 10;
      
      const details: string[] = [];
      if (event.venue_name) details.push(`Venue: ${event.venue_name}`);
      if (event.venue_address) details.push(`Address: ${event.venue_address}`);
      if (event.concert_time) details.push(`Time: ${event.concert_time}`);
      if (event.host_name) details.push(`Host: ${event.host_name}${event.host_phone ? ` · ${event.host_phone}` : ''}${event.host_email ? ` · ${event.host_email}` : ''}`);
      if (event.departure_time) details.push(`Departure: ${event.departure_time}`);
      if (event.arrival_time) details.push(`Arrival: ${event.arrival_time}`);
      if (event.lodging_name) details.push(`Lodging: ${event.lodging_name}${event.lodging_address ? ` — ${event.lodging_address}` : ''}`);
      if (event.meal_info) details.push(`Meals: ${event.meal_info}`);
      if (event.notes) details.push(`Notes: ${event.notes}`);
      if (event.description) details.push(`Details: ${event.description}`);
      
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.dark);
      details.forEach(line => {
        y = checkPageBreak(doc, y, 5);
        const lines = doc.splitTextToSize(line, contentWidth - 8);
        doc.text(lines, 20, y);
        y += lines.length * 4;
      });
      
      // Divider between events in same city
      if (ei < group.events.length - 1) {
        doc.setDrawColor(...COLORS.accent);
        doc.setLineWidth(0.3);
        doc.line(20, y + 1, pageWidth - 20, y + 1);
        y += 5;
      }
    });
    
    y += 6;
  });
  
  doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}_Itinerary.pdf`);
}

export function exportRosterPdf(members: RosterMember[], tourName?: string) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 28;
  
  const title = tourName ? `${tourName} — Roster` : 'Tour Roster';
  
  addHeader(doc, title, `${members.length} members`);
  addFooter(doc, 1);
  
  let y = 42;
  
  // Voice part groups
  const voiceParts = ['S1', 'S2', 'A1', 'A2'];
  const grouped: Record<string, RosterMember[]> = {};
  
  voiceParts.forEach(vp => {
    const m = members.filter(m => m.voice_part === vp);
    if (m.length > 0) grouped[vp] = m;
  });
  
  const unassigned = members.filter(m => !m.voice_part || !voiceParts.includes(m.voice_part));
  if (unassigned.length > 0) grouped['Unassigned'] = unassigned;
  
  // Summary bar
  doc.setFillColor(...COLORS.lightBg);
  doc.roundedRect(14, y, contentWidth, 12, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  
  const summaryParts = Object.entries(grouped).map(([part, members]) => `${part}: ${members.length}`);
  doc.text(`Total: ${members.length}  ·  ${summaryParts.join('  ·  ')}`, 18, y + 8);
  y += 18;
  
  // Table header
  const colX = { num: 14, name: 24, voicePart: 140, status: 170 };
  
  Object.entries(grouped).forEach(([part, partMembers]) => {
    y = checkPageBreak(doc, y, 20);
    
    // Section header
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(14, y, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${part} (${partMembers.length})`, 18, y + 5.5);
    y += 12;
    
    // Column headers
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('#', colX.num, y);
    doc.text('Name', colX.name, y);
    doc.text('Voice Part', colX.voicePart, y);
    doc.text('Status', colX.status, y);
    y += 2;
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.4);
    doc.line(14, y, pageWidth - 14, y);
    y += 4;
    
    partMembers.sort((a, b) => a.full_name.localeCompare(b.full_name)).forEach((member, i) => {
      y = checkPageBreak(doc, y, 7);
      
      // Alternating row bg
      if (i % 2 === 0) {
        doc.setFillColor(...COLORS.lightBg);
        doc.rect(14, y - 3, contentWidth, 6, 'F');
      }
      
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${i + 1}`, colX.num, y);
      doc.text(member.full_name, colX.name, y);
      doc.text(member.voice_part || '—', colX.voicePart, y);
      
      const statusText = member.status.charAt(0).toUpperCase() + member.status.slice(1);
      doc.text(statusText, colX.status, y);
      
      y += 6;
    });
    
    y += 4;
  });
  
  doc.save(`${(tourName || 'Tour').replace(/[^a-zA-Z0-9]/g, '_')}_Roster.pdf`);
}
