import React from 'react';
import { Shirt, Palette } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { WardrobeManagementHub } from '@/components/wardrobe/WardrobeManagementHub';
import { HairNailSubmissionDialog } from '@/components/wardrobe/HairNailSubmissionDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModuleProps } from '@/types/unified-modules';

export const WardrobeModule = ({ user, isFullPage = false }: ModuleProps) => {
  if (!isFullPage) {
    // Show compact view for dashboard with hair/nail submission button
    return (
      <ModuleWrapper
        id="wardrobe-management"
        title="Wardrobe Management"
        description="Manage costumes, fittings, inventory, and garment distribution"
        icon={Shirt}
        iconColor="purple"
        fullPage={false}
      >
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Hair & Nail Design Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Submit photos of your hair and nail designs for wardrobe mistress approval before events.
              </p>
              <HairNailSubmissionDialog>
                <Button className="w-full">
                  <Palette className="h-4 w-4 mr-2" />
                  Submit Hair & Nail Design
                </Button>
              </HairNailSubmissionDialog>
            </CardContent>
          </Card>
        </div>
      </ModuleWrapper>
    );
  }

  return (
    <ModuleWrapper
      id="wardrobe-management"
      title="Wardrobe Management"
      description="Manage costumes, fittings, inventory, and garment distribution"
      icon={Shirt}
      iconColor="purple"
      fullPage={isFullPage}
    >
      <WardrobeManagementHub />
    </ModuleWrapper>
  );
};