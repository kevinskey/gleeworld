import React from 'react';
import { WardrobeMistressHub } from '@/components/tour-manager/WardrobeMistressHub';
import { UniversalLayout } from "@/components/layout/UniversalLayout";

const Wardrobe = () => {
  return (
    <UniversalLayout>
      <div className="container mx-auto p-6">
        <WardrobeMistressHub />
      </div>
    </UniversalLayout>
  );
};

export default Wardrobe;
