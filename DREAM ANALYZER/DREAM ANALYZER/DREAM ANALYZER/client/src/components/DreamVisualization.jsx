import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { FiImage, FiRefreshCw } from 'react-icons/fi';

const DreamVisualization = ({ dreamId, dreamText, interpretation, className = '' }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { getAuthToken } = useAuth();

  const generateVisualization = useCallback(async () => {
    if (!dreamText) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch('/api/image/generate-dream-visualization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dreamId,
          dreamText,
          interpretation
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate visualization');
      }

      const data = await response.json();
      setImageUrl(data.imageUrl);
      
      // If we got a fallback URL, show a warning
      if (data.fallbackUrl) {
        toast('Using fallback image - AI generation limit may have been reached', { icon: '⚠️' });
      }
      
    } catch (err) {
      console.error('Error generating dream visualization:', err);
      setError(err.message);
      toast.error('Failed to generate dream visualization');
      
      // If we have a fallback URL from the error, use it
      if (err.fallbackUrl) {
        setImageUrl(err.fallbackUrl);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dreamId, dreamText, interpretation, getAuthToken]);

  // Auto-generate visualization when component mounts or dream text changes
  useEffect(() => {
    if (dreamText) {
      generateVisualization();
    }
  }, [dreamText, generateVisualization]);

  if (!dreamText) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <FiImage className="mr-2" />
          Dream Visualization
        </h3>
        <button
          onClick={generateVisualization}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <FiRefreshCw className="animate-spin mr-1.5 h-3.5 w-3.5" />
              Generating...
            </>
          ) : (
            <>
              <FiRefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Regenerate
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden" style={{ paddingBottom: '100%' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Dream visualization"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              console.error('Error loading image:', imageUrl);
              e.target.onerror = null; // Prevent infinite loop
              setError('Failed to load image');
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {isLoading ? (
              <div className="animate-pulse text-gray-500">Generating visualization...</div>
            ) : (
              <div className="text-gray-500 text-center p-4">
                <FiImage className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>Click to generate a visualization of your dream</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        AI-generated visualization based on your dream content
      </p>
    </div>
  );
};

export default DreamVisualization;
