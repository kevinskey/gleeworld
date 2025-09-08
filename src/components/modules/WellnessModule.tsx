import React from 'react';
import { Heart } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { ModuleProps } from '@/types/unified-modules';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export const WellnessModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="wellness"
      title="Wellness"
      description="Support member wellness with check-ins, resources, and care."
      icon={Heart}
      iconColor="rose"
      fullPage={isFullPage}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground" style={{ fontSize: 'clamp(0.9rem, 0.8vw, 0.95rem)', maxWidth: '80ch' }}>Open the Wellness Suite for daily check-ins and resources.</p>
        <Button asChild className="btn-primary">
          <Link to={ROUTES.WELLNESS}>Open Wellness Suite</Link>
        </Button>
      </div>
    </ModuleWrapper>
  );
};