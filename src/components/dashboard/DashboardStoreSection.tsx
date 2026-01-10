import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, ChevronDown, GraduationCap, BookOpen, Play, Users, Music, Monitor, ChevronRight, Search, LayoutGrid } from 'lucide-react';
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
  const [moduleSearch, setModuleSearch] = useState('');
  const navigate = useNavigate();
  const {
    modules,
    loading: modulesLoading
  } = useUnifiedModules();

  // Filter and sort modules alphabetically
  const filteredModules = useMemo(() => {
    const sorted = [...modules].sort((a, b) => a.title.localeCompare(b.title));
    if (!moduleSearch.trim()) return sorted;
    return sorted.filter(m => m.title.toLowerCase().includes(moduleSearch.toLowerCase()));
  }, [modules, moduleSearch]);
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
      <div className="h-[12px] bg-background w-full" />
      <Button onClick={() => navigate('/glee-academy')} variant="ghost" style={{
      fontFamily: "'Cinzel', serif"
    }} className="w-full h-12 gap-2 text-sm sm:text-xl bg-gradient-to-b from-[#002244] via-[#003666] to-[#0B5A8B] text-white [&_svg]:text-white justify-start text-left px-3 sm:px-6 lg:px-8 rounded-none shadow-lg border-t border-t-white/20 hover:brightness-110">
        <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
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
          return <div key={course.id} onClick={() => navigate(`/academy/${(course.course_code || '').toLowerCase().replace(' ', '-')}`)} className="flex-shrink-0 w-72 snap-start cursor-pointer group bg-white border-r border-r-black border-b border-b-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all min-h-[280px]">
                <div className="p-6 h-full flex flex-col pt-[40px] pb-[70px] py-[4px]">
                  {/* Course Code Badge */}
                  <div className="flex items-center justify-between mb-4">
                    {course.course_code && <span style={{
                  fontFamily: "'Cinzel', serif"
                }} className="tracking-wide text-gray-500 uppercase border border-gray-300 px-2 py-1 whitespace-nowrap text-2xl">
                        {course.course_code}
                      </span>}
                    
                  </div>
                  
                  {/* Course Title - Academic Font */}
                  <h4 className="font-serif text-xl font-bold text-gray-900 leading-tight mb-2 group-hover:text-gray-700 transition-colors pb-[10px] line-clamp-2 min-h-[56px] whitespace-pre-wrap">
                    {course.title}
                  </h4>
                  
                  {/* Duration */}
                  
                  
                  {/* Description */}
                  {course.description && <p className="text-gray-600 leading-snug line-clamp-3 pt-[15px] pb-[40px] text-base">
                      {course.description}
                    </p>}
                  
                  {/* Enter Script */}
                  <div className="mt-2 py-3 flex items-center justify-center">
                    <span style={{
                  fontFamily: "'Allura', cursive"
                }} className="text-4xl text-[#003666] drop-shadow-[1px_2px_2px_rgba(0,0,0,0.2)] hover:drop-shadow-[2px_3px_3px_rgba(0,0,0,0.25)] transition-all">
                      Enter Course
                    </span>
                  </div>
                </div>
              </div>;
        }) : <div className="flex-shrink-0 w-72 snap-start bg-white p-6 flex items-center justify-center min-h-[200px]">
              <p className="text-sm text-gray-400 uppercase tracking-wide">No courses available</p>
            </div>}
        </div>
        <div className="h-[25px] bg-[#003666] w-full" />
      </div>

      {/* Shop Section Header - Edge to Edge */}
      <div className="h-[12px] bg-background w-full" />
      <h2 style={{
      fontFamily: "'Cinzel', serif",
      color: 'white'
    }} className="relative z-10 h-12 text-sm sm:text-xl font-bold bg-gradient-to-b from-[#002244] via-[#003666] to-[#0B5A8B] px-3 sm:px-6 lg:px-8 w-full flex items-center justify-start gap-2 shadow-lg border-t border-t-white/20 [&_svg]:text-white">
        <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
        Shop
      </h2>
      
      <div className="w-full">
        {/* Product Horizontal Scroll */}
        {products.length > 0 ? <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth flex-nowrap" style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
            {products.map(product => <div key={product.id} onClick={() => navigate(`/shop/${product.id}`)} className="group cursor-pointer flex-shrink-0 w-72 snap-start">
                {/* Product Image */}
                <div className="relative aspect-square bg-muted/50 overflow-hidden">
                  {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full group-hover:scale-105 transition-transform duration-500 object-fill" /> : <div className="w-full h-full flex items-center justify-center">
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
                      
                      {product.images && product.images.length > 1 && <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <span className="w-3 h-3 border border-muted-foreground/50 rounded-sm" />
                          +{product.images.length - 1}
                        </span>}
                    </div>
                    <h3 style={{
                fontFamily: "'Cinzel', serif"
              }} className="font-medium text-[#003666] truncate group-hover:text-[#002244] transition-colors text-lg">
                      {product.title}
                    </h3>
                  </div>
                  <span style={{
              fontFamily: "'Cinzel', serif"
            }} className="text-[#003666] font-medium whitespace-nowrap">
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
        <div className="h-[25px] bg-[#003666] w-full" />
      </div>

      {/* My Modules - Edge to Edge */}
      <div className="h-[12px] bg-background w-full" />
      <Button onClick={() => navigate('/modules')} variant="ghost" style={{
      fontFamily: "'Cinzel', serif"
    }} className="w-full h-12 gap-2 text-sm sm:text-xl bg-gradient-to-b from-[#002244] via-[#003666] to-[#0B5A8B] text-white [&_svg]:text-white justify-start text-left px-3 sm:px-6 lg:px-8 rounded-none shadow-lg border-t border-t-white/20 hover:brightness-110">
        <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
        My Modules
      </Button>

      {/* Modules Section with Search */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 bg-white">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search modules..."
            value={moduleSearch}
            onChange={(e) => setModuleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border-2 border-gray-300 bg-white text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003666] focus:border-[#003666]"
          />
        </div>

        {/* Modules 2-Column Grid with Pill Buttons */}
        {modulesLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading modules...</div>
        ) : filteredModules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {moduleSearch ? 'No modules match your search' : 'No modules available'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredModules.map(module => {
              const unifiedModule = UNIFIED_MODULES.find(m => m.id === module.id);
              const IconComponent = unifiedModule?.icon;
              const Icon = IconComponent || LayoutGrid;
              return (
                <button
                  key={module.id}
                  onClick={() => navigate(`/modules/${module.id}`)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#002244] to-[#003666] hover:from-[#003666] hover:to-[#0B5A8B] transition-all duration-200 shadow-md hover:shadow-lg text-left"
                  style={{ color: '#ffffff' }}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0 text-white" />
                  <span className="text-xs font-normal truncate text-white">{module.title.toLowerCase()}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fan Zone - Edge to Edge */}
      
    </div>;
};