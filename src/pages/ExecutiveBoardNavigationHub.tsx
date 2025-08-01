import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ExecutiveBoardNavigationHub } from '@/components/executive-board/ExecutiveBoardNavigationHub';

const ExecutiveBoardNavigationPage = () => {
  return (
    <UniversalLayout>
      <ExecutiveBoardNavigationHub />
    </UniversalLayout>
  );
};

export default ExecutiveBoardNavigationPage;