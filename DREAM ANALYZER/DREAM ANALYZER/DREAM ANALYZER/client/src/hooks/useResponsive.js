import { useState, useEffect } from 'react';

const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const [deviceType, setDeviceType] = useState('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });

      // Determine device type based on width
      if (width < 480) {
        setDeviceType('mobile');
      } else if (width < 768) {
        setDeviceType('tablet');
      } else if (width < 1024) {
        setDeviceType('laptop');
      } else {
        setDeviceType('desktop');
      }
    };

    // Set initial size
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isLaptop = deviceType === 'laptop';
  const isDesktop = deviceType === 'desktop';
  const isMobileOrTablet = isMobile || isTablet;
  const isLaptopOrDesktop = isLaptop || isDesktop;

  return {
    screenSize,
    deviceType,
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isMobileOrTablet,
    isLaptopOrDesktop,
  };
};

export default useResponsive;
