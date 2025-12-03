import { useState, useEffect, useCallback, useMemo } from 'react';

const usePerformance = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionSpeed, setConnectionSpeed] = useState('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection speed if available
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setConnectionSpeed(connection.effectiveType || 'unknown');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Debounce function for performance
  const debounce = useCallback((func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  // Throttle function for performance
  const throttle = useCallback((func, delay) => {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, delay);
      }
    };
  }, []);

  // Memoized performance settings based on connection
  const performanceSettings = useMemo(() => {
    const isSlowConnection = connectionSpeed === 'slow-2g' || connectionSpeed === '2g';
    const isMediumConnection = connectionSpeed === '3g';
    const isFastConnection = connectionSpeed === '4g' || connectionSpeed === '5g';

    return {
      enableAnimations: !isSlowConnection,
      enableLazyLoading: true,
      imageQuality: isSlowConnection ? 'low' : isMediumConnection ? 'medium' : 'high',
      chartComplexity: isSlowConnection ? 'simple' : 'detailed',
      batchSize: isSlowConnection ? 5 : isMediumConnection ? 10 : 20,
      debounceDelay: isSlowConnection ? 500 : isMediumConnection ? 300 : 100,
    };
  }, [connectionSpeed]);

  return {
    isOnline,
    connectionSpeed,
    performanceSettings,
    debounce,
    throttle,
  };
};

export default usePerformance;
