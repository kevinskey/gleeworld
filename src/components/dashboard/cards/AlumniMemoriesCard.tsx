import React from 'react';
import { RoleCard } from './RoleCard';
import { Heart, Image, MessageCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
export const AlumniMemoriesCard = () => {
  const navigate = useNavigate();
  const alumniLinks = [{
    label: 'Memory Wall',
    icon: Image,
    path: '/alumnae?section=memories'
  }, {
    label: 'Stories',
    icon: MessageCircle,
    path: '/alumnae?section=stories'
  }, {
    label: 'Directory',
    icon: Users,
    path: '/alumnae?section=directory'
  }];
  return <RoleCard title="Alumni Memories" icon={Heart} accentColor="text-pink-500">
      <div className="space-y-2">
        {alumniLinks.map(link => (
          <Button
            key={link.label}
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => navigate(link.path)}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Button>
        ))}
      </div>
    </RoleCard>;
};