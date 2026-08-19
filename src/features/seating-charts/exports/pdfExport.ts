// PDF export for seating charts. Landscape chart page + optional equipment
// list page for stage-plot mode.
import jsPDF from 'jspdf';
import type { SeatingAssignment, SeatingChart, SeatingObject } from '@/types/seatingCharts';

export interface PdfExportInput {
  chart: SeatingChart;
  objects: SeatingObject[];
  assignments: SeatingAssignment[];
  svg: SVGSVGElement;
}

// Group stage-plot objects by object_type → subtype → count, alphabetized.
export interface EquipmentRow { category: string; label: string; count: number; }

const EQUIPMENT_TYPES = new Set([
  'instrument', 'microphone', 'monitor', 'music_stand', 'chair', 'table',
]);

const TYPE_LABEL: Record<string, string> = {
  instrument: 'Instruments',
  microphone: 'Microphones',
  monitor: 'Monitors',
  music_stand: 'Music stands',
  chair: 'Chairs',
  table: 'Tables',
};

export function buildEquipmentList(objects: SeatingObject[]): EquipmentRow[] {
  const buckets = new Map<string, Map<string, number>>();
  for (const o of objects) {
    if (!EQUIPMENT_TYPES.has(o.object_type)) continue;
    const cat = TYPE_LABEL[o.object_type] ?? o.object_type;
    const label = (o.label ?? o.subtype ?? o.object_type).toString();
    if (!buckets.has(cat)) buckets.set(cat, new Map());
    const inner = buckets.get(cat)!;
    inner.set(label, (inner.get(label) ?? 0) + 1);
  }
  const rows: EquipmentRow[] = [];
  const categoriesSorted = Array.from(buckets.keys()).sort();
  for (const cat of categoriesSorted) {
    const inner = buckets.get(cat)!;
    const labelsSorted = Array.from(inner.entries()).sort(([a], [b]) => a.localeCompare(b));
    for (const [label, count] of labelsSorted) {
      rows.push({ category: cat, label, count });
    }
  }
  return rows;
}

async function svgToPng(svg: SVGSVGElement, width: number, height: number): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const g = clone.querySelector('g');
  if (g) g.setAttribute('transform', '');
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG load failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportChartPdf({ chart, objects, svg }: PdfExportInput): Promise<void> {
  const doc = new jsPDF({
    orientation: chart.orientation === 'portrait' ? 'portrait' : 'landscape',
    unit: 'pt',
    format: 'letter',
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Title strip
  doc.setFontSize(16);
  doc.text(chart.name || 'Seating Chart', margin, margin);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Exported ${new Date().toLocaleString()}`, margin, margin + 16);
  doc.setTextColor(0);

  // Chart image
  const imgW = pageW - margin * 2;
  const imgH = pageH - margin * 2 - 40;
  const dataUrl = await svgToPng(svg, chart.canvas_width, chart.canvas_height);
  doc.addImage(dataUrl, 'PNG', margin, margin + 30, imgW, imgH);

  // Equipment list — always for stage plots, optional for everything else.
  if (chart.chart_mode === 'stage_plot') {
    doc.addPage('letter', 'portrait');
    const rows = buildEquipmentList(objects);
    doc.setFontSize(16);
    doc.text(`${chart.name} — Equipment list`, margin, margin);
    doc.setFontSize(10);
    let y = margin + 32;
    let currentCat = '';
    for (const row of rows) {
      if (row.category !== currentCat) {
        currentCat = row.category;
        y += 8;
        doc.setFont('helvetica', 'bold');
        doc.text(currentCat, margin, y);
        doc.setFont('helvetica', 'normal');
        y += 14;
      }
      doc.text(`${row.count} × ${row.label}`, margin + 12, y);
      y += 12;
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage('letter', 'portrait');
        y = margin;
      }
    }
    if (rows.length === 0) {
      doc.text('No equipment on chart.', margin, y);
    }
  }

  doc.save(`${chart.name || 'seating-chart'}.pdf`);
}
