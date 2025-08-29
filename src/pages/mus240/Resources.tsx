import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, ExternalLink, BookOpen, Globe, FileText, Settings, Download } from 'lucide-react';
import { useMus240Resources, type Mus240Resource } from '@/integrations/supabase/hooks/useMus240Resources';
import backgroundImage from '@/assets/mus240-background.jpg';

export default function Resources() {
  const { data: resources, isLoading } = useMus240Resources();

  const getCategoryIcon = (category: Mus240Resource['category']) => {
    switch (category) {
      case 'reading': return BookOpen;
      case 'website': return Globe;
      case 'video': return FileText;
      case 'article': return FileText;
      case 'database': return Users;
      default: return FileText;
    }
  };

  const getCategoryColor = (category: Mus240Resource['category']) => {
    switch (category) {
      case 'reading': return 'bg-blue-100 text-blue-800';
      case 'website': return 'bg-green-100 text-green-800';
      case 'video': return 'bg-purple-100 text-purple-800';
      case 'article': return 'bg-orange-100 text-orange-800';
      case 'database': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20"></div>
        
        <main className="relative z-10 max-w-6xl mx-auto p-6">
          {/* Header with back navigation */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Link 
                to="/classes/mus240" 
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to MUS 240
              </Link>
              
              <Link 
                to="/classes/mus240/resources/admin" 
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
                Manage Resources
              </Link>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <Users className="h-6 w-6 text-amber-300" />
                <span className="text-white/90 font-medium">Resources</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
                MUS 240 Resources
              </h1>
              <p className="text-white/80 text-lg">Readings, citations, media, and research materials</p>
            </div>
          </div>

          {/* Resources Grid */}
          <div className="space-y-8">
            {isLoading ? (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Loading Resources...</h3>
                  <p className="text-white/60">Please wait while we fetch the resources</p>
                </CardContent>
              </Card>
            ) : !resources || resources.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">No Resources Yet</h3>
                  <p className="text-white/60">Resources will be added throughout the semester</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {resources.map((resource) => {
                  const IconComponent = getCategoryIcon(resource.category);
                  
                  return (
                    <Card 
                      key={resource.id} 
                      className="group bg-white/95 backdrop-blur-sm border border-white/30 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-md">
                                <IconComponent className="h-4 w-4 text-white" />
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(resource.category)}`}>
                                {resource.category}
                              </span>
                            </div>
                            <CardTitle className="text-lg text-gray-900 group-hover:text-primary transition-colors">
                              {resource.title}
                            </CardTitle>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {resource.description}
                        </p>
                        
                        <Button 
                          asChild
                          size="sm" 
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
                        >
                          {resource.is_file_upload ? (
                            <a 
                              href={resource.url} 
                              download={resource.file_name}
                              className="inline-flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download {resource.file_name?.split('.').pop()?.toUpperCase() || 'File'}
                            </a>
                          ) : (
                            <a 
                              href={resource.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Access Resource
                            </a>
                          )}
                        </Button>
                        
                        {/* Show file size for downloads */}
                        {resource.is_file_upload && resource.file_size && (
                          <p className="text-xs text-white/60 mt-2 text-center">
                            {(resource.file_size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </UniversalLayout>
  );
}