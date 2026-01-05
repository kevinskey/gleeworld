import React from 'react';
import { RoleCard } from './RoleCard';
import { Star, Calendar, Music, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const FanFeaturesCard = () => {
  const navigate = useNavigate();
  
  const fanLinks = [
    { label: 'Upcoming Events', icon: Calendar, path: '/events' },
    { label: 'Listen Now', icon: Music, path: '/radio' },
    { label: 'Shop Merch', icon: ShoppingBag, path: '/shop' },
  ];

  return (
    <RoleCard 
      title="Fan Zone" 
      icon={Star} 
      accentColor="text-yellow-500"
    >
      <div className="space-y-2">
        {fanLinks.map((link) => (
          <Button
            key={link.path}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => navigate(link.path)}
          >
            <link.icon className="h-4 w-4 text-muted-foreground" />
            <span>{link.label}</span>
          </Button>
        ))}
      </div>
    </RoleCard>
  );
};
