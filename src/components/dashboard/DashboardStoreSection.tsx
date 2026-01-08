import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, ChevronDown, GraduationCap, BookOpen, Play, Users, Music, Monitor, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUnifiedModules } from '@/hooks/useUnifiedModules';
import { UNIFIED_MODULES } from '@/config/unified-modules';

// Course highlights mapping based on course type
const getCourseHighlights = (title: string): string[] => {
  if (title.toLowerCase().includes('glee')) {
    return ['Choral Performance', 'Vocal Training', 'Tours & Concerts', 'Community'];
  }
  if (title.toLowerCase().includes('conducting')) {
    return ['Conducting Technique', 'Score Analysis', 'Repertoire', 'Rehearsal Skills'];
  }
  if (title.toLowerCase().includes('african') || title.toLowerCase().includes('survey')) {
    return ['Music History', 'Cultural Context', 'Listening Journals', 'Critical Analysis'];
  }
  return ['Course Materials', 'Assignments', 'Discussions', 'Resources'];
};
const getCourseIcon = (title: string) => {
  if (title.toLowerCase().includes('glee')) return Users;
  if (title.toLowerCase().includes('conducting')) return Music;
  return Monitor;
};
const getCourseLevel = (title: string): string => {
  if (title.toLowerCase().includes('glee')) return 'Audition Required';
  if (title.toLowerCase().includes('conducting')) return 'Intermediate';
  return 'All Levels';
};
interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
  instructor_name: string | null;
}
interface Product {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
}
const categories = ['(ALL)', 'Apparel', 'Accessories', 'Music'];
export const DashboardStoreSection = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('(ALL)');
  const [showMore, setShowMore] = useState(false);
  const navigate = useNavigate();
  const {
    modules,
    loading: modulesLoading
  } = useUnifiedModules();
  useEffect(() => {
    const fetchData = async () => {
      // Fetch products
      const {
        data: productsData,
        error: productsError
      } = await supabase.from('gw_products').select('id, title, price, images').eq('is_active', true).limit(9).order('created_at', {
        ascending: false
      });
      if (!productsError && productsData) {
        setProducts(productsData);
      }

      // Fetch courses from gw_courses
      const {
        data: coursesData,
        error: coursesError
      } = await supabase.from('gw_courses').select('id, title, description, course_code, instructor_name').eq('is_active', true).limit(10).order('created_at', {
        ascending: false
      });
      if (!coursesError && coursesData) {
        setCourses(coursesData);
      }
      setLoading(false);
    };
    fetchData();
  }, []);
  const displayedProducts = showMore ? products : products.slice(0, 6);
  if (loading) {
    return <div className="w-full bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="h-24 w-64 bg-muted animate-pulse rounded mb-8" />
          
          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-lg" />)}
          </div>
        </div>
      </div>;
  }
  return <div className="w-full bg-background">
      {/* Glee Academy - Edge to Edge (FIRST on desktop) */}
      <Button onClick={() => navigate('/glee-academy')} className="w-full gap-2 py-[40px] text-2xl bg-[#003666] justify-start text-left px-4 sm:px-6 lg:px-8 rounded-none mt-[10px] pb-[35px] pt-[35px] my-[5px]">
        <GraduationCap className="h-5 w-5" />
        Glee Academy
      </Button>

      {/* Courses Section - Academic Black & White Design */}
      <div className="w-full">
        {/* Courses Horizontal Scroll - No Gap, Full Width */}
        <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth" style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
          {courses.length > 0 ? courses.map((course, index) => {
          const CourseIcon = getCourseIcon(course.title);
          const level = getCourseLevel(course.title);
          return <div key={course.id} onClick={() => navigate(`/academy/${(course.course_code || '').toLowerCase().replace(' ', '-')}`)} className="flex-shrink-0 w-72 snap-start cursor-pointer group bg-white border-r border-r-black border-b border-b-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all min-h-[320px]">
                <div className="p-6 h-full flex flex-col pb-[48px]">
                  {/* Course Code Badge */}
                  <div className="flex items-center justify-between mb-4">
                    {course.course_code && <span style={{
                  fontFamily: "'Cinzel', serif"
                }} className="tracking-wide text-gray-500 uppercase border border-gray-300 px-2 py-1 text-2xl whitespace-nowrap">
                        {course.course_code}
                      </span>}
                    
                  </div>
                  
                  {/* Course Title - Academic Font */}
                  <h4 className="font-serif text-xl font-bold text-gray-900 leading-tight mb-2 group-hover:text-gray-700 transition-colors">
                    {course.title}
                  </h4>
                  
                  {/* Duration */}
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Semester</p>
                  
                  {/* Description */}
                  {course.description && <p className="text-xs text-gray-600 leading-snug line-clamp-3 flex-1 pb-[30px]">
                      {course.description}
                    </p>}
                  
                  {/* Enter Arrow */}
                  <div className="mt-4 border-t border-gray-100 flex items-center justify-between pt-0">
                    <span className="text-xs font-medium text-gray-900 uppercase tracking-wide">Enter Course</span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>;
        }) : <div className="flex-shrink-0 w-72 snap-start bg-white p-6 flex items-center justify-center min-h-[200px]">
              <p className="text-sm text-gray-400 uppercase tracking-wide">No courses available</p>
            </div>}
        </div>
      </div>

      {/* Shop Section Header - Edge to Edge */}
      <h2 className="text-2xl font-bold mb-6 bg-accent-foreground text-primary-foreground px-4 sm:px-6 lg:px-8 w-full pt-[20px] py-[20px] pb-[20px]">
        Shop
      </h2>
      
      <div className="w-full px-[50px]">
        {/* Product Horizontal Scroll */}
        {products.length > 0 ? <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth flex-nowrap" style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
            {products.map(product => <div key={product.id} onClick={() => navigate(`/shop/${product.id}`)} className="group cursor-pointer flex-shrink-0 w-64 snap-start">
                {/* Product Image */}
                <div className="relative aspect-[3/4] bg-muted/50 rounded-lg overflow-hidden mb-4">
                  {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
                    </div>}
                  
                  {/* Add Button Overlay */}
                  <button className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-background/80 backdrop-blur-sm border border-border rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background" onClick={e => {
              e.stopPropagation();
            }}>
                    <Plus className="h-4 w-4 text-foreground" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">Glee Merch</span>
                      {product.images && product.images.length > 1 && <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <span className="w-3 h-3 border border-muted-foreground/50 rounded-sm" />
                          +{product.images.length - 1}
                        </span>}
                    </div>
                    <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors text-xl">
                      {product.title}
                    </h3>
                  </div>
                  <span className="text-foreground font-medium whitespace-nowrap">
                    $ {product.price.toFixed(0)}
                  </span>
                </div>
              </div>)}
          </div> : <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No products available yet</p>
            <Button onClick={() => navigate('/shop')} className="mt-4">
              Visit Shop
            </Button>
          </div>}
      </div>

      {/* My Modules - Edge to Edge */}
      <Button onClick={() => navigate('/modules')} className="w-full gap-2 py-[40px] text-2xl bg-[#003666] justify-start text-left px-4 sm:px-6 lg:px-8 rounded-none">
        <BookOpen className="h-5 w-5" />
        My Modules
      </Button>

      {/* Modules Grid Section */}
      <div className="w-full px-[50px] py-8">
        {modulesLoading ? <div className="text-center py-8 text-muted-foreground">Loading modules...</div> : modules.length === 0 ? <div className="text-center py-8 text-muted-foreground">No modules available</div> : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {modules.map(module => {
          const unifiedModule = UNIFIED_MODULES.find(m => m.id === module.id);
          const IconComponent = unifiedModule?.icon;
          return <Card key={module.id} className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-primary/80 border border-primary-foreground/30 hover:bg-primary/70" onClick={() => navigate(`/modules/${module.id}`)}>
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      {IconComponent && <div className="p-2 rounded-lg bg-primary-foreground/10">
                          <IconComponent className="h-5 w-5 text-primary-foreground" />
                        </div>}
                      <CardTitle className="text-sm font-medium leading-tight line-clamp-2 text-primary-foreground">
                        {module.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                </Card>;
        })}
          </div>}
      </div>

      {/* Fan Zone - Edge to Edge */}
      
    </div>;
};