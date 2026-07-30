// Classroom templates (25-33). Simpler geometry; teacher desk + smartboard
// live at the front of every layout.
import type { TemplateEntry, TemplateSpec } from '@/types/seatingCharts';
import { SECTION_COLORS, obj } from './utils';

const W = 1400;
const H = 800;

function room() {
  return obj({
    object_type: 'stage_boundary', subtype: 'room', x: 60, y: 60, width: W - 120, height: H - 120,
    z_index: 0, style: { fill: 'transparent', stroke: '#94a3b8', strokeWidth: 2 }, locked: true,
  });
}
function frontOfRoom() {
  return [
    obj({ object_type: 'label', subtype: 'smartboard', x: W / 2 - 120, y: 80, width: 240, height: 30,
      label: 'Smartboard', style: { fill: '#0f172a', color: '#fff', fontWeight: 700 }, locked: true }),
    obj({ object_type: 'desk', subtype: 'teacher', x: 100, y: 130, width: 140, height: 60,
      label: 'Teacher', style: { fill: '#fef3c7', stroke: '#92400e', strokeWidth: 2, radius: 4 }, locked: true }),
  ];
}

function studentDesk(x: number, y: number, label: string) {
  return obj({
    object_type: 'desk', subtype: 'student', x, y, width: 60, height: 44, label,
    style: { fill: SECTION_COLORS.student, stroke: '#4338ca', strokeWidth: 1, radius: 4 },
    properties: { seat: label },
  });
}

// 25. Traditional Rows
function traditionalRows(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  const rows = 5;
  const cols = 6;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      objects.push(studentDesk(280 + c * 90, 240 + r * 80, `${r + 1}${String.fromCharCode(65 + c)}`));
    }
  }
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 26. Pairs
function pairs(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  for (let r = 0; r < 4; r++) {
    for (let p = 0; p < 4; p++) {
      const baseX = 300 + p * 220;
      const baseY = 240 + r * 90;
      objects.push(studentDesk(baseX, baseY, `${r + 1}${p + 1}A`));
      objects.push(studentDesk(baseX + 70, baseY, `${r + 1}${p + 1}B`));
    }
  }
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 27. Small Groups / Pods
function pods(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  for (let g = 0; g < 6; g++) {
    const groupX = 300 + (g % 3) * 340;
    const groupY = 240 + Math.floor(g / 3) * 220;
    objects.push(
      obj({ object_type: 'table', subtype: 'group', x: groupX + 20, y: groupY + 30, width: 160, height: 90,
        label: `Group ${g + 1}`, style: { fill: '#f1f5f9', stroke: '#475569', strokeWidth: 2, radius: 8 } }),
    );
    const seats = [
      { x: 0, y: -30 }, { x: 60, y: -30 }, { x: 120, y: -30 },
      { x: 0, y: 130 }, { x: 60, y: 130 }, { x: 120, y: 130 },
    ];
    seats.forEach((s, i) =>
      objects.push(studentDesk(groupX + 20 + s.x, groupY + 30 + s.y, `${g + 1}·${i + 1}`)),
    );
  }
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 28. U-Shape
function uShape(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  // Bottom
  for (let i = 0; i < 8; i++) {
    objects.push(studentDesk(320 + i * 80, H - 180, `B${i + 1}`));
  }
  // Left up
  for (let i = 0; i < 5; i++) {
    objects.push(studentDesk(280, 240 + i * 80, `L${i + 1}`));
  }
  // Right up
  for (let i = 0; i < 5; i++) {
    objects.push(studentDesk(W - 340, 240 + i * 80, `R${i + 1}`));
  }
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 29. Horseshoe
function horseshoe(): TemplateSpec {
  const spec = uShape();
  spec.objects = spec.objects.map((o) =>
    o.object_type === 'desk' ? { ...o, style: { ...(o.style ?? {}), fill: '#dbeafe' } } : o,
  );
  return spec;
}

// 30. Seminar Circle
function seminarCircle(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  const cx = W / 2;
  const cy = 460;
  const n = 14;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    objects.push(
      obj({
        object_type: 'chair', subtype: 'seminar',
        x: cx + 260 * Math.cos(angle) - 22,
        y: cy + 200 * Math.sin(angle) - 22,
        width: 44, height: 44, label: `${i + 1}`,
        style: { fill: SECTION_COLORS.student, radius: 22, stroke: '#4338ca', strokeWidth: 1 },
        properties: { seat: i + 1 },
      }),
    );
  }
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 31. Lab Tables
function labTables(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = 260 + c * 340;
      const y = 240 + r * 160;
      objects.push(
        obj({ object_type: 'table', subtype: 'lab', x, y, width: 240, height: 60,
          label: `Bench ${r * 3 + c + 1}`, style: { fill: '#e2e8f0', stroke: '#334155', strokeWidth: 2, radius: 4 } }),
      );
      for (let s = 0; s < 4; s++) {
        objects.push(studentDesk(x + 20 + s * 55, y + 70, `${r * 3 + c + 1}·${s + 1}`));
      }
    }
  }
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 32. Lecture Hall
function lectureHall(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 14; c++) {
      objects.push(studentDesk(200 + c * 76, 220 + r * 60, `${r + 1}${String.fromCharCode(65 + c)}`));
    }
  }
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 33. Custom Classroom — 3×4 seed
function customClassroom(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      objects.push(studentDesk(400 + c * 120, 300 + r * 100, `${r + 1}${String.fromCharCode(65 + c)}`));
    }
  }
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

export const CLASSROOM_TEMPLATES: TemplateEntry[] = [
  { key: 'class_rows',       name: 'Traditional Rows',     category: 'classroom', description: '5 × 6 desks facing front.', generate: traditionalRows },
  { key: 'class_pairs',      name: 'Pairs',                category: 'classroom', description: 'Desks paired side-by-side.', generate: pairs },
  { key: 'class_pods',       name: 'Small Groups / Pods',  category: 'classroom', description: '6 pods of 6 students each.', generate: pods },
  { key: 'class_u_shape',    name: 'U-Shape',              category: 'classroom', description: 'Open front, desks along three walls.', generate: uShape },
  { key: 'class_horseshoe',  name: 'Horseshoe',            category: 'classroom', description: 'Softer U-shape with blue accent.', generate: horseshoe },
  { key: 'class_seminar',    name: 'Seminar Circle',       category: 'classroom', description: '14 chairs in an oval.', generate: seminarCircle },
  { key: 'class_lab',        name: 'Lab Tables',           category: 'classroom', description: '9 lab benches, 4 seats each.', generate: labTables },
  { key: 'class_lecture',    name: 'Lecture Hall',         category: 'classroom', description: '8 rows × 14 seats.', generate: lectureHall },
  { key: 'class_custom',     name: 'Custom Classroom',     category: 'classroom', description: 'Small starting grid; edit freely.', generate: customClassroom },
];
