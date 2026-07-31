// Classroom templates. Teacher desk + smartboard live at the front of every
// layout so directors get a familiar anchor.
import type { TemplateEntry, TemplateSpec } from '@/types/seatingCharts';
import { SECTION_COLORS, arcPoints, obj } from './utils';

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
  for (let i = 0; i < 8; i++) {
    objects.push(studentDesk(320 + i * 80, H - 180, `B${i + 1}`));
  }
  for (let i = 0; i < 5; i++) {
    objects.push(studentDesk(280, 240 + i * 80, `L${i + 1}`));
  }
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

// 34. Music Room — 4-row choir riser + piano
function musicRoom(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  const parts = ['soprano', 'alto', 'tenor', 'bass'];
  for (let r = 0; r < 4; r++) {
    const pts = arcPoints(W / 2, r * 60 + 500, 380 - r * 15, 12, 130);
    pts.forEach((p, i) => {
      const sec = parts[Math.floor(i / 3)];
      objects.push(
        obj({ object_type: 'riser_slot', subtype: 'music_room', x: p.x - 20, y: p.y - 20, width: 40, height: 40,
          label: `${r + 1}·${i + 1}`,
          style: { fill: SECTION_COLORS[sec as keyof typeof SECTION_COLORS], radius: 8, stroke: '#0f172a', strokeWidth: 1 },
          properties: { row: r + 1, position: i + 1, section: sec } }),
      );
    });
  }
  objects.push(
    obj({ object_type: 'instrument', subtype: 'piano', x: W - 320, y: 130, width: 200, height: 90, label: 'Piano',
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
  );
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 35. Elementary Music (Orff) — carpet squares + instrument stations
function orffMusic(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  // Carpet squares in a circle
  const cx = W / 2;
  const cy = 460;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    objects.push(
      obj({ object_type: 'chair', subtype: 'carpet', x: cx + 240 * Math.cos(angle) - 22, y: cy + 200 * Math.sin(angle) - 22,
        width: 44, height: 44, label: `${i + 1}`,
        style: { fill: '#fde68a', radius: 6, stroke: '#78350f', strokeWidth: 1 },
        properties: { seat: i + 1 } }),
    );
  }
  const stations = [
    { label: 'Xylophones', x: 240, y: 240, w: 200, h: 60 },
    { label: 'Metallophones', x: 240, y: 320, w: 200, h: 60 },
    { label: 'Glockenspiels', x: W - 440, y: 240, w: 200, h: 60 },
    { label: 'Aux perc bin', x: W - 440, y: 320, w: 200, h: 60 },
  ];
  stations.forEach((s) => objects.push(
    obj({ object_type: 'instrument', subtype: 'orff', x: s.x, y: s.y, width: s.w, height: s.h, label: s.label,
      style: { fill: '#111827', color: '#fff', radius: 8 } }),
  ));
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 36. Art Studio — easels + shared tables
function artStudio(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  // 8 easels along back
  for (let i = 0; i < 8; i++) {
    objects.push(
      obj({ object_type: 'table', subtype: 'easel', x: 200 + i * 130, y: 220, width: 80, height: 100, label: `Easel ${i + 1}`,
        style: { fill: '#e5e7eb', stroke: '#334155', strokeWidth: 2, radius: 4 } }),
      obj({ object_type: 'chair', subtype: 'stool', x: 220 + i * 130, y: 340, width: 40, height: 40, label: `${i + 1}`,
        style: { fill: '#fef3c7', radius: 20, stroke: '#92400e', strokeWidth: 1 },
        properties: { easel: i + 1 } }),
    );
  }
  // Shared work tables
  for (let t = 0; t < 3; t++) {
    objects.push(
      obj({ object_type: 'table', subtype: 'work', x: 300 + t * 320, y: 460, width: 240, height: 80, label: `Work table ${t + 1}`,
        style: { fill: '#f1f5f9', stroke: '#475569', strokeWidth: 2, radius: 4 } }),
    );
    for (let s = 0; s < 4; s++) {
      objects.push(studentDesk(320 + t * 320 + s * 55, 560, `${t + 1}·${s + 1}`));
    }
  }
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 37. Computer Lab — perimeter workstations
function computerLab(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  // Top wall
  for (let i = 0; i < 8; i++) {
    objects.push(studentDesk(200 + i * 100, 220, `T${i + 1}`));
  }
  // Bottom wall
  for (let i = 0; i < 8; i++) {
    objects.push(studentDesk(200 + i * 100, H - 200, `B${i + 1}`));
  }
  // Right wall
  for (let i = 0; i < 4; i++) {
    objects.push(studentDesk(W - 200, 320 + i * 80, `R${i + 1}`));
  }
  // Left wall
  for (let i = 0; i < 4; i++) {
    objects.push(studentDesk(180, 320 + i * 80, `L${i + 1}`));
  }
  objects.push(
    obj({ object_type: 'label', subtype: 'note', x: W / 2 - 100, y: 400, width: 200, height: 20, label: 'Center: floor space',
      style: { fill: 'transparent', color: '#64748b' }, locked: true }),
  );
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 38. Science Lab (advanced) — perimeter benches + safety station
function scienceLab(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  // Perimeter benches (top / bottom / sides)
  const bench = (x: number, y: number, w: number, h: number, label: string) =>
    obj({ object_type: 'table', subtype: 'lab_bench', x, y, width: w, height: h, label,
      style: { fill: '#e2e8f0', stroke: '#334155', strokeWidth: 2, radius: 4 } });
  objects.push(
    bench(200, 220, W - 400, 60, 'Bench (back)'),
    bench(200, H - 260, W - 400, 60, 'Bench (front)'),
    bench(200, 300, 60, 220, 'Bench (left)'),
    bench(W - 260, 300, 60, 220, 'Bench (right)'),
  );
  // Stools around benches
  for (let i = 0; i < 8; i++) {
    objects.push(
      obj({ object_type: 'chair', subtype: 'lab_stool', x: 220 + i * 130, y: 300, width: 40, height: 40, label: `T${i + 1}`,
        style: { fill: '#fef3c7', radius: 20, stroke: '#92400e', strokeWidth: 1 } }),
      obj({ object_type: 'chair', subtype: 'lab_stool', x: 220 + i * 130, y: H - 300, width: 40, height: 40, label: `B${i + 1}`,
        style: { fill: '#fef3c7', radius: 20, stroke: '#92400e', strokeWidth: 1 } }),
    );
  }
  objects.push(
    obj({ object_type: 'instrument', subtype: 'safety', x: W / 2 - 60, y: H / 2 - 40, width: 120, height: 80, label: 'Safety station',
      style: { fill: '#dc2626', color: '#fff', radius: 8 } }),
    obj({ object_type: 'instrument', subtype: 'sink', x: 100, y: 720, width: 80, height: 40, label: 'Eye wash',
      style: { fill: '#0284c7', color: '#fff', radius: 4 } }),
  );
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 39. Kindergarten Circle Time — carpet circle + storytime chair
function kindergartenCircle(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  const cx = W / 2;
  const cy = 480;
  const n = 20;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    objects.push(
      obj({ object_type: 'chair', subtype: 'carpet_square', x: cx + 260 * Math.cos(angle) - 22, y: cy + 200 * Math.sin(angle) - 22,
        width: 44, height: 44, label: `${i + 1}`,
        style: { fill: ['#fecaca', '#fed7aa', '#fde68a', '#bbf7d0', '#bfdbfe', '#c4b5fd'][i % 6], radius: 4, stroke: '#334155', strokeWidth: 1 },
        properties: { seat: i + 1 } }),
    );
  }
  objects.push(
    obj({ object_type: 'chair', subtype: 'story_chair', x: cx - 30, y: cy - 30, width: 60, height: 60, label: 'Teacher',
      style: { fill: '#fef3c7', radius: 8, stroke: '#92400e', strokeWidth: 2 }, locked: true }),
  );
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 40. Testing Rows — extra-spaced rows for exams
function testingRows(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room(), ...frontOfRoom()];
  const rows = 5;
  const cols = 5;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      objects.push(studentDesk(280 + c * 180, 240 + r * 100, `${r + 1}${String.fromCharCode(65 + c)}`));
    }
  }
  objects.push(
    obj({ object_type: 'label', subtype: 'note', x: W / 2 - 100, y: H - 90, width: 200, height: 20, label: 'Exam spacing (6ft)',
      style: { fill: 'transparent', color: '#dc2626', fontWeight: 700 }, locked: true }),
  );
  return { chart_mode: 'classroom', canvas_width: W, canvas_height: H, orientation: 'landscape', objects };
}

// 41. Rehearsal Room — chairs + music stands (private-lesson / small ensemble room)
function rehearsalRoom(): TemplateSpec {
  const objects: TemplateSpec['objects'] = [room()];
  // Piano at front
  objects.push(
    obj({ object_type: 'instrument', subtype: 'piano', x: W / 2 - 120, y: 120, width: 240, height: 100, label: 'Piano',
      style: { fill: '#111827', color: '#fff', radius: 8 }, locked: true }),
  );
  // Chairs in a semi-circle facing piano
  const pts = arcPoints(W / 2, 620, 340, 12, 160);
  pts.forEach((p, i) => {
    objects.push(
      obj({ object_type: 'chair', subtype: 'rehearsal', x: p.x - 24, y: p.y - 24, width: 48, height: 48,
        label: `${i + 1}`, style: { fill: SECTION_COLORS.neutral, radius: 24, stroke: '#0f172a', strokeWidth: 1 },
        properties: { seat: i + 1 } }),
      obj({ object_type: 'music_stand', subtype: 'stand', x: p.x - 10, y: p.y - 60, width: 20, height: 20, label: '♪',
        style: { fill: '#64748b', color: '#fff' } }),
    );
  });
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
  { key: 'class_music_room', name: 'Music Room (choir + piano)', category: 'classroom',
    description: '4-row choir riser with a piano at front-of-room.', generate: musicRoom },
  { key: 'class_orff',       name: 'Elementary Music (Orff)', category: 'classroom',
    description: 'Carpet-square circle plus Orff instrument stations.', generate: orffMusic },
  { key: 'class_art_studio', name: 'Art Studio',           category: 'classroom',
    description: 'Easels + shared work tables for painting or drawing classes.', generate: artStudio },
  { key: 'class_computer_lab', name: 'Computer Lab',       category: 'classroom',
    description: 'Perimeter workstation seating with open floor center.', generate: computerLab },
  { key: 'class_science_lab', name: 'Science Lab (advanced)', category: 'classroom',
    description: 'Perimeter benches with lab stools, safety station, and eye wash.', generate: scienceLab },
  { key: 'class_kinder_circle', name: 'Kindergarten Circle Time', category: 'classroom',
    description: 'Carpet-square ring around a teacher storytime chair.', generate: kindergartenCircle },
  { key: 'class_testing',    name: 'Testing Rows (spaced)', category: 'classroom',
    description: 'Extra spacing between desks for exams.', generate: testingRows },
  { key: 'class_rehearsal_room', name: 'Rehearsal Room',    category: 'classroom',
    description: '12 chairs with music stands facing a front piano.', generate: rehearsalRoom },
];
