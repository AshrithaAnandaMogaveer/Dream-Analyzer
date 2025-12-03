import React, { Suspense, lazy } from 'react';
import LoadingSpinner from './LoadingSpinner';

const LazyComponent = ({ 
  componentPath, 
  fallback = null, 
  loadingMessage = 'Loading component...',
  ...props 
}) => {
  const LazyComponent = lazy(() => import(`../${componentPath}`));

  return (
    <Suspense 
      fallback={
        fallback || (
          <LoadingSpinner 
            message={loadingMessage} 
            size="medium" 
          />
        )
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );
};

export default LazyComponent;
