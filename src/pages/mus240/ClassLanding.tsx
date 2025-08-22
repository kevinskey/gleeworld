import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function ClassLanding() {
  const cards = [
    { title: 'Syllabus', to: '/classes/mus240/syllabus', desc: 'Policies, grading, schedule' },
    { title: 'Listening Hub', to: '/classes/mus240/listening', desc: 'Weekly listening + comments' },
    { title: 'Assignments', to: '/classes/mus240/assignments', desc: 'Prompts, rubrics, due dates' },
    { title: 'Resources', to: '/classes/mus240/resources', desc: 'Readings, citations, media' },
  ];

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <main className="max-w-5xl mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">MUS 240 — Survey of African American Music</h1>
          <p className="text-sm text-muted-foreground">Fall 2025 · Spelman College</p>
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Link key={c.title} to={c.to} className="block rounded-2xl border p-4 hover:shadow-md transition-shadow">
              <h2 className="text-xl font-medium">{c.title}</h2>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </Link>
          ))}
        </section>
      </main>
    </UniversalLayout>
  );
}