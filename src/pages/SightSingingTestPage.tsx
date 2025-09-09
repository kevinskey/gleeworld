import React from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { SightSingingStudio } from "@/components/sight-singing/SightSingingStudio";

const SightSingingTestPage = () => {
  return (
    <UniversalLayout>
      <div className="space-y-6">
        <div className="border-b border-border pb-4">
          <h1 className="text-3xl font-bold text-foreground">Sight Singing Test</h1>
          <p className="text-muted-foreground mt-2">
            Practice and test your sight singing skills with interactive exercises.
          </p>
        </div>
        
        <SightSingingStudio />
      </div>
    </UniversalLayout>
  );
};

export default SightSingingTestPage;