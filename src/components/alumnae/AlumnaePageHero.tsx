 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { ChevronLeft, ChevronRight } from "lucide-react";
 import { Button } from "@/components/ui/button";
 
 interface HeroSlide {
   id: string;
   image_url: string;
   mobile_image_url?: string;
   link_url?: string;
   link_target?: string;
   display_order: number;
 }
 
 export const AlumnaePageHero = () => {
   const [slides, setSlides] = useState<HeroSlide[]>([]);
   const [currentSlide, setCurrentSlide] = useState(0);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     fetchHeroSlides();
   }, []);
 
   useEffect(() => {
     if (slides.length > 1) {
       const timer = setInterval(() => {
         setCurrentSlide((prev) => (prev + 1) % slides.length);
       }, 5000);
       return () => clearInterval(timer);
     }
   }, [slides.length]);
 
   const fetchHeroSlides = async () => {
     try {
       const { data, error } = await supabase
        .from('alumnae_page_hero')
         .select('id, image_url, mobile_image_url, link_url, link_target, display_order')
         .eq('is_active', true)
         .order('display_order', { ascending: true });
 
       if (error) throw error;
       setSlides(data || []);
     } catch (error) {
       console.error('Error fetching alumnae hero slides:', error);
     } finally {
       setLoading(false);
     }
   };
 
   const nextSlide = () => {
     setCurrentSlide((prev) => (prev + 1) % slides.length);
   };
 
   const prevSlide = () => {
     setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
   };
 
   if (loading) {
     return (
       <div className="w-full h-[300px] md:h-[500px] bg-muted animate-pulse" />
     );
   }
 
   if (slides.length === 0) {
     return null;
   }
 
   const slide = slides[currentSlide];
 
   const ImageContent = (
     <div 
       className="absolute inset-0 bg-cover bg-center transition-all duration-500"
       style={{ 
         backgroundImage: `url(${slide.image_url})`,
       }}
     />
   );
 
   return (
     <div className="relative w-full h-[300px] md:h-[500px] overflow-hidden group bg-background">
       {slide.link_url ? (
         <a 
           href={slide.link_url} 
           target={slide.link_target || '_self'}
           rel={slide.link_target === '_blank' ? 'noopener noreferrer' : undefined}
           className="block absolute inset-0"
         >
           {ImageContent}
         </a>
       ) : (
         ImageContent
       )}
 
       {/* Navigation Buttons */}
       {slides.length > 1 && (
         <>
           <Button
             variant="ghost"
             size="icon"
             className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
             onClick={(e) => { e.preventDefault(); prevSlide(); }}
           >
             <ChevronLeft className="h-6 w-6" />
           </Button>
           <Button
             variant="ghost"
             size="icon"
             className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
             onClick={(e) => { e.preventDefault(); nextSlide(); }}
           >
             <ChevronRight className="h-6 w-6" />
           </Button>
 
           {/* Dots Indicator */}
           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
             {slides.map((_, index) => (
               <button
                 key={index}
                 onClick={(e) => { e.preventDefault(); setCurrentSlide(index); }}
                 className={`w-2 h-2 rounded-full transition-all ${
                   index === currentSlide 
                     ? 'bg-white w-8' 
                     : 'bg-white/50 hover:bg-white/75'
                 }`}
                 aria-label={`Go to slide ${index + 1}`}
               />
             ))}
           </div>
         </>
       )}
     </div>
   );
 };