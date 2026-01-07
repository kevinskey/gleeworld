import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, ChevronDown, GraduationCap, BookOpen, Play, Users, Music, Monitor, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      {/* Section Header - Edge to Edge */}
      <h2 className="text-2xl font-bold mb-6 bg-accent-foreground text-primary-foreground px-4 sm:px-6 lg:px-8 w-full pt-[20px] py-[20px] pb-[20px]">Shop</h2>
      
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

      {/* Glee Academy - Edge to Edge */}
      <Button onClick={() => navigate('/glee-academy')} className="w-full gap-2 py-[40px] text-2xl bg-[#003666] justify-start text-left px-4 sm:px-6 lg:px-8 rounded-none">
        <GraduationCap className="h-5 w-5" />
        Glee Academy
      </Button>


      {/* Courses Section */}
      <div className="w-full px-[50px] py-8">
        {/* Courses Horizontal Scroll */}
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth flex-nowrap" style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
          {courses.length > 0 ? courses.map(course => {
          const CourseIcon = getCourseIcon(course.title);
          const highlights = getCourseHighlights(course.title);
          const level = getCourseLevel(course.title);
          return <div key={course.id} className="flex-shrink-0 w-80 snap-start rounded-lg overflow-hidden shadow-lg">
                {/* Blue Header Section */}
                <div className="p-4 bg-[#53baee]">
                  {/* Top row with icon, code, and level */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CourseIcon className="h-5 w-5 text-white/80" />
                      {course.course_code && <span className="px-3 py-1 bg-[#003366] text-white text-sm font-medium rounded">
                          {course.course_code}
                        </span>}
                    </div>
                    <span className="text-white text-sm font-medium">{level}</span>
                  </div>
                  
                  {/* Course title and duration */}
                  <h4 className="text-white font-semibold text-lg leading-tight">
                    {course.title}
                  </h4>
                  <p className="text-white/70 text-sm mt-1">Semester</p>
                </div>
                
                {/* White Content Section */}
                <div className="bg-white p-4 flex flex-col min-h-[200px]">
                  {course.description && <p className="text-gray-700 text-sm leading-relaxed mb-4">
                      {course.description}
                    </p>}
                  
                  {/* Course Highlights */}
                  <div className="mb-4 flex-1">
                    <h5 className="font-semibold text-gray-900 mb-2">Course Highlights:</h5>
                    <ul className="space-y-1">
                      {highlights.map((highlight, idx) => <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <ChevronRight className="h-3 w-3 text-gray-400" />
                          {highlight}
                        </li>)}
                    </ul>
                  </div>
                  
                  {/* Enter Button */}
                  <button onClick={() => navigate(`/glee-academy/course/${course.id}`)} className="w-full bg-[#003366] hover:bg-[#002244] text-white py-3 px-4 flex items-center justify-center gap-2 transition-colors">
                    <span className="font-medium">Enter {course.course_code || course.title}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>;
        }) : <div className="flex-shrink-0 w-80 snap-start bg-muted/30 border border-dashed border-border rounded-lg p-4 flex items-center justify-center min-h-[300px]">
              <p className="text-sm text-muted-foreground">No courses available yet</p>
            </div>}
        </div>
      </div>

      {/* My Modules - Edge to Edge */}
      <Button onClick={() => navigate('/modules')} className="w-full gap-2 py-[40px] text-2xl bg-[#003666] justify-start text-left px-4 sm:px-6 lg:px-8 rounded-none">
        <BookOpen className="h-5 w-5" />
        My Modules
      </Button>

      {/* New Section Below My Modules */}
      <div className="w-full px-[50px] py-8">
        {/* Content goes here */}
      </div>

      {/* Fan Zone - Edge to Edge */}
      
    </div>;
};