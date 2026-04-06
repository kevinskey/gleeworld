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
  primary: [0, 51, 102] as [number, number, number],       // Spelman blue
  primaryLight: [0, 71, 132] as [number, number, number],
  dark: [30, 30, 45] as [number, number, number],
  gray: [100, 100, 115] as [number, number, number],
  lightBg: [240, 242, 248] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  accent: [210, 215, 228] as [number, number, number],
  performance: [0, 100, 60] as [number, number, number],
  travel: [140, 100, 20] as [number, number, number],
  free: [60, 120, 60] as [number, number, number],
};

const PAGE_MARGIN = 14;
const BOTTOM_MARGIN = 22;

function getPageContentBottom(doc: jsPDF) {
  return doc.internal.pageSize.getHeight() - BOTTOM_MARGIN;
}

function addPageHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 28, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, PAGE_MARGIN, 15);
  
  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, PAGE_MARGIN, 22);
  }
  
  const pageNum = doc.getNumberOfPages();
  doc.setFontSize(7);
  doc.text(`Page ${pageNum}`, pageWidth - PAGE_MARGIN, 22, { align: 'right' });
}

function addPageFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, pageHeight - 14, pageWidth - PAGE_MARGIN, pageHeight - 14);
  
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.gray);
  doc.text('Spelman College Glee Club  |  Confidential', PAGE_MARGIN, pageHeight - 9);
  doc.text(`Generated ${format(new Date(), 'MMM d, yyyy h:mm a')}`, pageWidth - PAGE_MARGIN, pageHeight - 9, { align: 'right' });
}

function newPage(doc: jsPDF, title: string, subtitle?: string): number {
  doc.addPage();
  addPageHeader(doc, title, subtitle);
  addPageFooter(doc);
  return 34;
}

function ensureSpace(doc: jsPDF, y: number, needed: number, title: string, subtitle?: string): number {
  if (y + needed > getPageContentBottom(doc)) {
    return newPage(doc, title, subtitle);
  }
  return y;
}

function getEventTypeColor(type: string | null): [number, number, number] {
  switch (type) {
    case 'performance': return COLORS.performance;
    case 'travel': return COLORS.travel;
    case 'free': return COLORS.free;
    default: return COLORS.gray;
  }
}

export function exportItineraryPdf(events: TourEvent[], tourName?: string) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (PAGE_MARGIN * 2);
  
  const title = tourName || 'Tour Itinerary';
  
  // Sort events by date ascending
  const sorted = [...events].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  
  if (sorted.length === 0) {
    addPageHeader(doc, title, 'No events found');
    addPageFooter(doc);
    doc.save(`${title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_Itinerary.pdf`);
    return;
  }
  
  // Date range
  const firstDate = format(new Date(sorted[0].start_date), 'MMM d, yyyy');
  const lastDate = format(new Date(sorted[sorted.length - 1].start_date), 'MMM d, yyyy');
  const subtitle = `${firstDate} - ${lastDate}  |  ${sorted.length} events`;
  
  addPageHeader(doc, title, subtitle);
  addPageFooter(doc);
  
  let y = 34;
  
  // Summary table at top
  y = ensureSpace(doc, y, 20, title, subtitle);
  doc.setFillColor(...COLORS.lightBg);
  doc.roundedRect(PAGE_MARGIN, y, contentWidth, 14, 2, 2, 'F');
  
  const performances = sorted.filter(e => e.event_type === 'performance').length;
  const travelDays = sorted.filter(e => e.event_type === 'travel').length;
  const workshops = sorted.filter(e => e.event_type === 'workshop').length;
  const freeDays = sorted.filter(e => e.event_type === 'free').length;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(`SUMMARY:  ${performances} Performances  |  ${travelDays} Travel Days  |  ${workshops} Workshops  |  ${freeDays} Free Days  |  ${sorted.length} Total`, PAGE_MARGIN + 4, y + 9);
  y += 20;
  
  // Render each event as its own block
  sorted.forEach((event, index) => {
    // Estimate space needed for this event
    const details = buildEventDetails(event);
    const estimatedHeight = 18 + (details.length * 5) + 6;
    
    y = ensureSpace(doc, y, Math.min(estimatedHeight, 50), title, subtitle);
    
    // Event type color bar
    const typeColor = getEventTypeColor(event.event_type);
    doc.setFillColor(...typeColor);
    doc.rect(PAGE_MARGIN, y, 3, 14, 'F');
    
    // Event card background
    doc.setFillColor(...COLORS.lightBg);
    doc.rect(PAGE_MARGIN + 3, y, contentWidth - 3, 14, 'F');
    
    // Event number
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.setFillColor(...typeColor);
    doc.circle(PAGE_MARGIN + 10, y + 5, 3.5, 'F');
    doc.text(`${index + 1}`, PAGE_MARGIN + 10, y + 6.5, { align: 'center' });
    
    // Event title
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const titleText = doc.splitTextToSize(event.title, contentWidth - 50);
    doc.text(titleText[0], PAGE_MARGIN + 17, y + 6);
    
    // Event type badge
    const typeLabel = event.event_type ? event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1) : 'Event';
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...typeColor);
    doc.text(typeLabel.toUpperCase(), pageWidth - PAGE_MARGIN - 4, y + 5, { align: 'right' });
    
    // Date line
    const startDate = new Date(event.start_date);
    let dateStr = format(startDate, 'EEEE, MMMM d, yyyy');
    if (event.end_date) {
      const endDate = new Date(event.end_date);
      if (startDate.toDateString() !== endDate.toDateString()) {
        dateStr += ` - ${format(endDate, 'EEEE, MMMM d, yyyy')}`;
      }
    }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(dateStr, PAGE_MARGIN + 17, y + 11);
    
    // Location
    if (event.location) {
      doc.setTextColor(...COLORS.primaryLight);
      doc.text(event.location, pageWidth - PAGE_MARGIN - 4, y + 11, { align: 'right' });
    }
    
    y += 16;
    
    // Details
    if (details.length > 0) {
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.dark);
      
      details.forEach(detail => {
        y = ensureSpace(doc, y, 5, title, subtitle);
        
        // Label in bold
        doc.setFont('helvetica', 'bold');
        doc.text(detail.label + ':', PAGE_MARGIN + 6, y);
        
        // Value in normal
        doc.setFont('helvetica', 'normal');
        const labelWidth = doc.getTextWidth(detail.label + ':  ');
        const valueWidth = contentWidth - 10 - labelWidth;
        const valueLines = doc.splitTextToSize(detail.value, Math.max(valueWidth, 80));
        doc.text(valueLines, PAGE_MARGIN + 6 + labelWidth, y);
        
        y += valueLines.length * 3.8;
      });
    }
    
    y += 4;
    
    // Separator
    if (index < sorted.length - 1) {
      doc.setDrawColor(...COLORS.accent);
      doc.setLineWidth(0.2);
      doc.line(PAGE_MARGIN + 4, y, pageWidth - PAGE_MARGIN - 4, y);
      y += 4;
    }
  });
  
  const fileName = `${title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_Itinerary.pdf`;
  doc.save(fileName);
}

function buildEventDetails(event: TourEvent): { label: string; value: string }[] {
  const details: { label: string; value: string }[] = [];
  
  if (event.venue_name) details.push({ label: 'Venue', value: event.venue_name });
  if (event.venue_address) details.push({ label: 'Address', value: event.venue_address });
  if (event.concert_time) details.push({ label: 'Concert Time', value: event.concert_time });
  if (event.host_name) {
    let hostStr = event.host_name;
    if (event.host_phone) hostStr += `  |  ${event.host_phone}`;
    if (event.host_email) hostStr += `  |  ${event.host_email}`;
    details.push({ label: 'Host', value: hostStr });
  }
  if (event.departure_time) details.push({ label: 'Departure', value: event.departure_time });
  if (event.arrival_time) details.push({ label: 'Arrival', value: event.arrival_time });
  if (event.lodging_name) {
    let lodgingStr = event.lodging_name;
    if (event.lodging_address) lodgingStr += `  |  ${event.lodging_address}`;
    details.push({ label: 'Lodging', value: lodgingStr });
  }
  if (event.meal_info) details.push({ label: 'Meals', value: event.meal_info });
  if (event.description) details.push({ label: 'Description', value: event.description });
  if (event.notes) details.push({ label: 'Notes', value: event.notes });
  
  return details;
}

export function exportRosterPdf(members: RosterMember[], tourName?: string) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (PAGE_MARGIN * 2);
  
  const title = tourName ? `${tourName} - Roster` : 'Tour Roster';
  const subtitle = `${members.length} confirmed members`;
  
  addPageHeader(doc, title, subtitle);
  addPageFooter(doc);
  
  let y = 34;
  
  // Voice part groups
  const voiceParts = ['S1', 'S2', 'A1', 'A2'];
  const grouped: { part: string; members: RosterMember[] }[] = [];
  
  voiceParts.forEach(vp => {
    const m = members.filter(m => m.voice_part === vp);
    if (m.length > 0) grouped.push({ part: vp, members: m });
  });
  
  const unassigned = members.filter(m => !m.voice_part || !voiceParts.includes(m.voice_part));
  if (unassigned.length > 0) grouped.push({ part: 'Unassigned', members: unassigned });
  
  // Summary bar
  doc.setFillColor(...COLORS.lightBg);
  doc.roundedRect(PAGE_MARGIN, y, contentWidth, 12, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  
  const summaryText = grouped.map(g => `${g.part}: ${g.members.length}`).join('   |   ');
  doc.text(`Total: ${members.length}   |   ${summaryText}`, PAGE_MARGIN + 4, y + 8);
  y += 18;
  
  const colX = { num: PAGE_MARGIN + 2, name: PAGE_MARGIN + 12, voicePart: 140, status: 172 };
  let globalNum = 0;
  
  grouped.forEach(group => {
    y = ensureSpace(doc, y, 22, title, subtitle);
    
    // Section header
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(PAGE_MARGIN, y, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${group.part}  (${group.members.length})`, PAGE_MARGIN + 4, y + 5.5);
    y += 11;
    
    // Column headers
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('#', colX.num, y);
    doc.text('NAME', colX.name, y);
    doc.text('VOICE PART', colX.voicePart, y);
    doc.text('STATUS', colX.status, y);
    y += 1.5;
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
    y += 3.5;
    
    group.members.sort((a, b) => a.full_name.localeCompare(b.full_name)).forEach((member, i) => {
      y = ensureSpace(doc, y, 6, title, subtitle);
      globalNum++;
      
      if (i % 2 === 0) {
        doc.setFillColor(...COLORS.lightBg);
        doc.rect(PAGE_MARGIN, y - 3, contentWidth, 5.5, 'F');
      }
      
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${globalNum}`, colX.num, y);
      doc.setFont('helvetica', 'bold');
      doc.text(member.full_name, colX.name, y);
      doc.setFont('helvetica', 'normal');
      doc.text(member.voice_part || '-', colX.voicePart, y);
      
      const statusText = member.status.charAt(0).toUpperCase() + member.status.slice(1);
      doc.text(statusText, colX.status, y);
      
      y += 5.5;
    });
    
    y += 5;
  });
  
  const fileName = `${(tourName || 'Tour').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_Roster.pdf`;
  doc.save(fileName);
}
