import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Image as ImageIcon, User, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewsletterContentManagerProps {
  newsletterId: string;
}

export const NewsletterContentManager = ({ newsletterId }: NewsletterContentManagerProps) => {
  const [activeTab, setActiveTab] = useState<'hero' | 'spotlights' | 'announcements'>('hero');

  // Hero Slides
  const [heroSlides, setHeroSlides] = useState([
    { image_url: '', title: '', description: '', display_order: 0 }
  ]);

  // Spotlights
  const [alumnaeSpotlight, setAlumnaeSpotlight] = useState({
    name: '', title: '', description: '', photo_url: ''
  });
  const [studentSpotlight, setStudentSpotlight] = useState({
    name: '', title: '', description: '', photo_url: ''
  });

  // Announcements
  const [announcements, setAnnouncements] = useState([
    { title: '', content: '', display_order: 0 }
  ]);

  const handleSaveHeroSlides = async () => {
    try {
      // Delete existing slides
      await supabase
        .from('alumnae_newsletter_hero_slides')
        .delete()
        .eq('newsletter_id', newsletterId);

      // Insert new slides
      const slidesWithNewsletterId = heroSlides.map((slide, index) => ({
        ...slide,
        newsletter_id: newsletterId,
        display_order: index
      }));

      const { error } = await supabase
        .from('alumnae_newsletter_hero_slides')
        .insert(slidesWithNewsletterId);

      if (error) throw error;
      toast.success('Hero slides saved successfully');
    } catch (error) {
      console.error('Error saving hero slides:', error);
      toast.error('Failed to save hero slides');
    }
  };

  const handleSaveSpotlights = async () => {
    try {
      // Delete existing spotlights
      await supabase
        .from('alumnae_newsletter_spotlights')
        .delete()
        .eq('newsletter_id', newsletterId);

      // Insert new spotlights
      const spotlightsToInsert = [];
      if (alumnaeSpotlight.name) {
        spotlightsToInsert.push({
          ...alumnaeSpotlight,
          newsletter_id: newsletterId,
          spotlight_type: 'alumnae',
          display_order: 0
        });
      }
      if (studentSpotlight.name) {
        spotlightsToInsert.push({
          ...studentSpotlight,
          newsletter_id: newsletterId,
          spotlight_type: 'student',
          display_order: 1
        });
      }

      if (spotlightsToInsert.length > 0) {
        const { error } = await supabase
          .from('alumnae_newsletter_spotlights')
          .insert(spotlightsToInsert);

        if (error) throw error;
      }

      toast.success('Spotlights saved successfully');
    } catch (error) {
      console.error('Error saving spotlights:', error);
      toast.error('Failed to save spotlights');
    }
  };

  const handleSaveAnnouncements = async () => {
    try {
      // Delete existing announcements
      await supabase
        .from('alumnae_newsletter_announcements')
        .delete()
        .eq('newsletter_id', newsletterId);

      // Insert new announcements
      const announcementsWithNewsletterId = announcements
        .filter(a => a.title && a.content)
        .map((announcement, index) => ({
          ...announcement,
          newsletter_id: newsletterId,
          display_order: index
        }));

      if (announcementsWithNewsletterId.length > 0) {
        const { error } = await supabase
          .from('alumnae_newsletter_announcements')
          .insert(announcementsWithNewsletterId);

        if (error) throw error;
      }

      toast.success('Announcements saved successfully');
    } catch (error) {
      console.error('Error saving announcements:', error);
      toast.error('Failed to save announcements');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Newsletter Content</CardTitle>
        <div className="flex gap-2 mt-4">
          <Button
            variant={activeTab === 'hero' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('hero')}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Hero Slides
          </Button>
          <Button
            variant={activeTab === 'spotlights' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('spotlights')}
          >
            <User className="h-4 w-4 mr-2" />
            Spotlights
          </Button>
          <Button
            variant={activeTab === 'announcements' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('announcements')}
          >
            <Megaphone className="h-4 w-4 mr-2" />
            Announcements
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hero Slides Tab */}
        {activeTab === 'hero' && (
          <div className="space-y-4">
            {heroSlides.map((slide, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Slide {index + 1}</Label>
                  {heroSlides.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHeroSlides(heroSlides.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Image URL"
                  value={slide.image_url}
                  onChange={(e) => {
                    const newSlides = [...heroSlides];
                    newSlides[index].image_url = e.target.value;
                    setHeroSlides(newSlides);
                  }}
                />
                <Input
                  placeholder="Title"
                  value={slide.title}
                  onChange={(e) => {
                    const newSlides = [...heroSlides];
                    newSlides[index].title = e.target.value;
                    setHeroSlides(newSlides);
                  }}
                />
                <Textarea
                  placeholder="Description"
                  value={slide.description}
                  onChange={(e) => {
                    const newSlides = [...heroSlides];
                    newSlides[index].description = e.target.value;
                    setHeroSlides(newSlides);
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                setHeroSlides([...heroSlides, { image_url: '', title: '', description: '', display_order: heroSlides.length }])
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Slide
            </Button>
            <Button onClick={handleSaveHeroSlides} className="w-full">
              Save Hero Slides
            </Button>
          </div>
        )}

        {/* Spotlights Tab */}
        {activeTab === 'spotlights' && (
          <div className="space-y-6">
            <div className="p-4 border rounded-lg space-y-3">
              <Label className="text-base font-semibold">Alumnae Spotlight</Label>
              <Input
                placeholder="Name"
                value={alumnaeSpotlight.name}
                onChange={(e) => setAlumnaeSpotlight({ ...alumnaeSpotlight, name: e.target.value })}
              />
              <Input
                placeholder="Title (e.g., Class of 2015)"
                value={alumnaeSpotlight.title}
                onChange={(e) => setAlumnaeSpotlight({ ...alumnaeSpotlight, title: e.target.value })}
              />
              <Input
                placeholder="Photo URL"
                value={alumnaeSpotlight.photo_url}
                onChange={(e) => setAlumnaeSpotlight({ ...alumnaeSpotlight, photo_url: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={alumnaeSpotlight.description}
                onChange={(e) => setAlumnaeSpotlight({ ...alumnaeSpotlight, description: e.target.value })}
              />
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <Label className="text-base font-semibold">Student Spotlight</Label>
              <Input
                placeholder="Name"
                value={studentSpotlight.name}
                onChange={(e) => setStudentSpotlight({ ...studentSpotlight, name: e.target.value })}
              />
              <Input
                placeholder="Title (e.g., Sophomore, Soprano)"
                value={studentSpotlight.title}
                onChange={(e) => setStudentSpotlight({ ...studentSpotlight, title: e.target.value })}
              />
              <Input
                placeholder="Photo URL"
                value={studentSpotlight.photo_url}
                onChange={(e) => setStudentSpotlight({ ...studentSpotlight, photo_url: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={studentSpotlight.description}
                onChange={(e) => setStudentSpotlight({ ...studentSpotlight, description: e.target.value })}
              />
            </div>

            <Button onClick={handleSaveSpotlights} className="w-full">
              Save Spotlights
            </Button>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Announcement {index + 1}</Label>
                  {announcements.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAnnouncements(announcements.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Title"
                  value={announcement.title}
                  onChange={(e) => {
                    const newAnnouncements = [...announcements];
                    newAnnouncements[index].title = e.target.value;
                    setAnnouncements(newAnnouncements);
                  }}
                />
                <Textarea
                  placeholder="Content"
                  value={announcement.content}
                  onChange={(e) => {
                    const newAnnouncements = [...announcements];
                    newAnnouncements[index].content = e.target.value;
                    setAnnouncements(newAnnouncements);
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                setAnnouncements([...announcements, { title: '', content: '', display_order: announcements.length }])
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Announcement
            </Button>
            <Button onClick={handleSaveAnnouncements} className="w-full">
              Save Announcements
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
