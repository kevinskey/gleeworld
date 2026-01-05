import React, { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ModuleProps } from '@/types/unified-modules';

// Lazy load to break circular dependency with unified-modules.ts
const PermissionsModuleContent = lazy(() => 
  import('./PermissionsModule').then(mod => ({ default: mod.PermissionsModule }))
);

export const LazyPermissionsModule = (props: ModuleProps) => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PermissionsModuleContent {...props} />
    </Suspense>
  );
};
