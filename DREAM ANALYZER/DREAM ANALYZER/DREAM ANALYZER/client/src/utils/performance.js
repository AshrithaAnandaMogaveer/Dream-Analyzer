// Performance utilities for the Dream Analyzer app

import React from 'react';

// Image optimization
export const optimizeImage = (src, quality = 'auto', width = null) => {
  if (!src) return src;
  
  // If it's a data URL, return as is
  if (src.startsWith('data:')) return src;
  
  // For external images, you can add optimization parameters
  if (src.includes('http')) {
    const url = new URL(src);
    
    // Add quality parameter if supported by the service
    if (quality !== 'auto') {
      url.searchParams.set('q', quality);
    }
    
    // Add width parameter if specified
    if (width) {
      url.searchParams.set('w', width);
    }
    
    return url.toString();
  }
  
  return src;
};

// Debounce function
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoization helper
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Lazy loading helper
export const lazyLoad = (importFunc) => {
  return React.lazy(importFunc);
};

// Performance monitoring
export const measurePerformance = (name, fn) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`${name} took ${end - start} milliseconds`);
  }
  
  return result;
};

// Memory usage monitoring
export const logMemoryUsage = () => {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memory = performance.memory;
    console.log('Memory usage:', {
      used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
      total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
    });
  }
};

// Bundle size optimization
export const preloadComponent = (componentPath) => {
  if (typeof window !== 'undefined') {
    import(/* webpackChunkName: "preload" */ `../${componentPath}`);
  }
};

// Service Worker registration for caching
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Image lazy loading
export const lazyLoadImage = (imgRef, src) => {
  if (imgRef.current) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            imgRef.current.src = src;
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    observer.observe(imgRef.current);
  }
};

// Chart performance optimization
export const optimizeChartData = (data, maxPoints = 100) => {
  if (!data || data.length <= maxPoints) return data;
  
  // Sample data points for better performance
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
};

// API request optimization
export const optimizeApiRequest = (url, options = {}) => {
  const optimizedOptions = {
    ...options,
    headers: {
      'Cache-Control': 'max-age=300', // 5 minutes cache
      ...options.headers,
    },
  };
  
  return fetch(url, optimizedOptions);
};
