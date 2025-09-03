import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Music, Calendar, BookOpen, Users, TrendingUp } from 'lucide-react';
import backgroundImage from '@/assets/mus240-background.jpg';
import { AdminGradesCard } from '@/components/mus240/admin/AdminGradesCard';
import { Mus240UserAvatar } from '@/components/mus240/Mus240UserAvatar';

export default function ClassLanding() {
  const cards = [
    { 
      title: 'Syllabus', 
      to: '/classes/mus240/syllabus', 
      desc: 'Policies, grading, schedule',
      icon: BookOpen
    },
    { 
      title: 'Listening Hub', 
      to: '/classes/mus240/listening', 
      desc: 'Weekly listening + comments',
      icon: Music
    },
    { 
      title: 'Assignments', 
      to: '/classes/mus240/assignments', 
      desc: 'Prompts, rubrics, due dates',
      icon: Calendar
    },
    { 
      title: 'Grades & Progress', 
      to: '/classes/mus240/grades', 
      desc: 'Your performance & attendance',
      icon: TrendingUp
    },
    { 
      title: 'Resources', 
      to: '/classes/mus240/resources', 
      desc: 'Readings, citations, media',
      icon: Users
    },
  ];

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <Mus240UserAvatar />
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative bg-gradient-to-br from-orange-800 to-amber-600"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10"></div>
        
        <main className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-8 py-12">
          {/* Hero Section with Redesigned Title */}
          <div className="text-center mb-16 flex flex-col items-center justify-center">
            <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Music className="h-6 w-6 md:h-7 md:w-7 text-amber-300" />
              <span className="text-white/90 font-medium text-2xl md:text-3xl lg:text-2xl xl:text-3xl">Spelman College</span>
            </div>
            
            <h1 className="text-8xl md:text-9xl lg:text-10xl xl:text-[14rem] font-bold mb-4 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
              MUS 240
            </h1>
            
            <h2 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light text-white/95 mb-6 mx-auto leading-relaxed">
              Survey of African American Music
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-white/80 text-3xl md:text-4xl lg:text-4xl xl:text-5xl">
              <div className="flex items-center gap-3">
                <Calendar className="h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 xl:h-12 xl:w-12" />
                <span className="text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-medium">Fall 2025</span>
              </div>
              <div className="hidden sm:block w-2 h-2 bg-white/60 rounded-full"></div>
              <div className="flex items-center gap-3">
                <Users className="h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 xl:h-12 xl:w-12" />
                <span className="text-2xl md:text-4xl lg:text-3xl xl:text-5xl font-medium">Dr. Kevin Johnson</span>
              </div>
            </div>
          </div>

          {/* Navigation Cards */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {cards.map((card) => {
              const IconComponent = card.icon;
              return (
                <Link 
                  key={card.title} 
                  to={card.to} 
                  className="group block"
                >
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl lg:rounded-3xl px-6 py-4 sm:px-4 sm:py-3 lg:px-8 lg:py-5 xl:px-10 xl:py-6 shadow-xl border border-white/30 hover:bg-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
                    <div className="flex items-center gap-4 sm:gap-3 lg:gap-6 mb-4 sm:mb-3 lg:mb-6">
                      <div className="p-3 sm:p-2 md:p-5 lg:p-4 xl:p-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg lg:rounded-xl">
                        <IconComponent className="h-6 w-6 sm:h-5 sm:w-5 md:h-8 md:w-8 lg:h-10 lg:w-10 xl:h-12 xl:w-12 text-white" />
                      </div>
                      <h3 className="text-5xl sm:text-2xl md:text-4xl lg:text-3xl xl:text-4xl font-semibold text-gray-900">{card.title}</h3>
                    </div>
                    <p className="text-gray-600 text-xl sm:text-sm md:text-lg lg:text-base xl:text-lg leading-relaxed">{card.desc}</p>
                  </div>
                </Link>
              );
            })}
            
            {/* Admin Card - Only visible to administrators */}
            <AdminGradesCard />
          </section>
          
          {/* Course Description */}
          <div className="mt-16 text-center">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <p className="text-white/90 text-lg md:text-xl lg:text-lg xl:text-xl leading-relaxed">
                Explore the rich tapestry of African American musical traditions, from spirituals and blues to jazz, gospel, R&B, and hip-hop. Discover how music has been a vehicle for cultural expression, social change, and artistic innovation.
              </p>
            </div>
          </div>
        </main>
      </div>
    </UniversalLayout>
  );
}