-- Insert sample scholarship data for testing
INSERT INTO public.scholarships (title, description, deadline, amount, eligibility, tags, link, is_featured, is_active) VALUES
(
  'Spelman Excellence Scholarship',
  'A prestigious scholarship for outstanding academic achievement and leadership potential at Spelman College.',
  '2024-03-15',
  '$5,000',
  'Current Spelman students with GPA 3.5 or higher',
  ARRAY['merit-based', 'academic', 'leadership'],
  'https://spelman.edu/scholarships/excellence',
  true,
  true
),
(
  'UNCF/Koch Scholars Program',
  'Merit-based scholarship providing financial assistance and mentorship opportunities.',
  '2024-02-28',
  '$10,000',
  'Undergraduate students studying business, economics, or STEM fields',
  ARRAY['merit-based', 'STEM', 'business', 'mentorship'],
  'https://uncf.org/koch-scholars',
  true,
  true
),
(
  'Glee Club Performance Grant',
  'Special funding for students participating in musical performances and tours.',
  '2024-04-30',
  '$1,500',
  'Active members of the Spelman College Glee Club',
  ARRAY['performance', 'music', 'travel'],
  'https://gleeworld.org/grants',
  false,
  true
),
(
  'Women in STEM Leadership Award',
  'Supporting women pursuing careers in science, technology, engineering, and mathematics.',
  '2024-05-15',
  '$7,500',
  'Female students majoring in STEM fields with demonstrated leadership',
  ARRAY['STEM', 'women', 'leadership', 'research'],
  'https://stemsupport.org/women-leadership',
  false,
  true
),
(
  'Community Service Excellence Grant',
  'Recognizing students who have made significant contributions to their communities.',
  '2024-03-30',
  '$2,000',
  'Students with 100+ hours of documented community service',
  ARRAY['community-service', 'volunteer', 'civic-engagement'],
  'https://communityawards.org/excellence',
  false,
  true
),
(
  'Gates Millennium Scholars Program',
  'Full scholarship for outstanding minority students with strong academic records.',
  '2024-01-15',
  'Full Tuition',
  'African American, Hispanic, Native American, or Asian Pacific Islander students',
  ARRAY['full-tuition', 'minority', 'academic-excellence'],
  'https://gmsp.org/apply',
  true,
  true
);