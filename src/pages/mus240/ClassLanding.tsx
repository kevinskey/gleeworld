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
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "url('/lovable-uploads/59969fd2-0b8e-4be2-ada9-5cd9573aac66.png')"
        }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        
        <main className="relative z-10 max-w-5xl mx-auto p-4">
          <header className="mb-6 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">MUS 240 — Survey of African American Music</h1>
            <p className="text-lg text-white/90">Fall 2025 · Spelman College</p>
          </header>

          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((c) => (
              <Link 
                key={c.title} 
                to={c.to} 
                className="block rounded-2xl bg-white/90 backdrop-blur-sm border border-white/20 p-6 hover:bg-white/95 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{c.title}</h2>
                <p className="text-sm text-gray-700">{c.desc}</p>
              </Link>
            ))}
          </section>
        </main>
      </div>
    </UniversalLayout>
  );
}