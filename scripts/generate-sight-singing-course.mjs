// scripts/generate-sight-singing-course.mjs
// Regenerates scripts/sight-singing-courses.json deterministically. Then seed with:
//   node scripts/seed-course-templates.mjs scripts/sight-singing-courses.json | psql ...
import { writeFileSync } from 'node:fs';
import { buildCollegeCourse } from './ssat/college.mjs';

const out = {
  template_courses: [buildCollegeCourse()],
  // Phase 1: college product only. The bundle and other level products ship with
  // their courses in Phase 2 — a level product whose course isn't seeded would get
  // template_course_id = null, which grant_course_entitlement treats as a bundle.
  products: [{
    sku: 'COURSE-SSAT-COLL',
    slug: 'sight-singing-college',
    name: 'Sight Singing and Aural Skills — College',
    level: 'college',
    price_cents: 0, // pricing deferred until launch; stripe_price_id stays null
    bundle_key: 'sight-singing',
  }],
};
writeFileSync(new URL('./sight-singing-courses.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.error(`wrote sight-singing-courses.json: ${out.template_courses.length} course(s), ${out.products.length} product(s)`);
