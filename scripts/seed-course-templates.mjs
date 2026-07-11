// Generates idempotent SQL that seeds global template courses from the
// course-content JSON plus the gw_course_product rows. Pipe the output to psql:
//   node scripts/seed-course-templates.mjs path/to/courses.json | psql ...
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/seed-course-templates.mjs <courses.json>');
  process.exit(1);
}
const { template_courses, products: jsonProducts = [] } = JSON.parse(readFileSync(file, 'utf8'));

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const qj = (v) => `${q(JSON.stringify(v ?? []))}::jsonb`;

const out = ['begin;'];

for (const c of template_courses) {
  // Idempotent: skip the whole course if a template with this slug already exists
  out.push(`do $seed$
declare v_course uuid; v_unit uuid; v_lesson uuid;
begin
  if exists (select 1 from gw_academy_courses where slug = ${q(c.slug)} and is_template) then
    raise notice 'template % already seeded — skipping', ${q(c.slug)};
    return;
  end if;
  insert into gw_academy_courses (tenant_id, is_template, slug, title, level, grades, description)
  values (null, true, ${q(c.slug)}, ${q(c.title)}, ${q(c.level)}, ${q(c.grades)}, ${q(c.description)})
  returning id into v_course;`);

  c.units.forEach((u, ui) => {
    out.push(`  insert into gw_academy_units (course_id, tenant_id, is_template, sort_order, title)
  values (v_course, null, true, ${ui}, ${q(u.title)}) returning id into v_unit;`);
    u.lessons.forEach((l, li) => {
      out.push(`  insert into gw_academy_lessons (unit_id, tenant_id, is_template, sort_order, title, objectives, content, listening)
  values (v_unit, null, true, ${li}, ${q(l.title)}, ${qj(l.objectives)}, ${q(l.content)}, ${qj(l.listening)}) returning id into v_lesson;`);
      (l.exercises ?? []).forEach((e, ei) => {
        const { type, ...data } = e;
        out.push(`  insert into gw_academy_exercises (lesson_id, tenant_id, is_template, sort_order, type, data)
  values (v_lesson, null, true, ${ei}, ${q(type)}, ${q(JSON.stringify(data))}::jsonb);`);
      });
    });
  });
  out.push('end $seed$;');
}

// Products: 4 courses + bundle. Placeholder prices; create-stripe-prices.js fills stripe_price_id.
const products = [
  { sku: 'COURSE-HCM-ELEM', slug: 'history-choral-elementary', name: 'History of Choral Music — Elementary', level: 'elementary', price: 2900 },
  { sku: 'COURSE-HCM-MS', slug: 'history-choral-middle', name: 'History of Choral Music — Middle School', level: 'middle_school', price: 3900 },
  { sku: 'COURSE-HCM-HS', slug: 'history-choral-high', name: 'History of Choral Music — High School', level: 'high_school', price: 4900 },
  { sku: 'COURSE-HCM-COLL', slug: 'history-choral-college', name: 'History of Choral Music — College', level: 'college', price: 5900 },
  { sku: 'COURSE-HCM-BUNDLE', slug: null, name: 'History of Choral Music — All Four Levels', level: null, price: 11900 },
];
for (const p of products) {
  out.push(`insert into gw_course_product (template_course_id, sku, name, level, price_cents, bundle_key)
select ${p.slug ? `(select id from gw_academy_courses where slug = ${q(p.slug)} and is_template)` : 'null'},
  ${q(p.sku)}, ${q(p.name)}, ${q(p.level)}, ${p.price}, 'history-choral'
on conflict (sku) do nothing;`);
}

// Products supplied by the JSON itself (newer course families carry their own).
for (const p of jsonProducts) {
  out.push(`insert into gw_course_product (template_course_id, sku, name, level, price_cents, bundle_key)
select ${p.slug ? `(select id from gw_academy_courses where slug = ${q(p.slug)} and is_template)` : 'null'},
  ${q(p.sku)}, ${q(p.name)}, ${q(p.level)}, ${Number(p.price_cents) || 0}, ${q(p.bundle_key)}
on conflict (sku) do nothing;`);
}

out.push('commit;');
console.log(out.join('\n'));
