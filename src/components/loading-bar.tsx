"use client";

import { useState, useEffect } from 'react';
import './loading-bar.css';

interface LoadingBarProps {
  isLoading: boolean;
  message?: string;
  variant?: 'public' | 'erp'; // Add variant prop to differentiate between public website and ERP
}

export function LoadingBar({ isLoading, message = "Loading...", variant = 'erp' }: LoadingBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLoading) {
      // Reset progress when loading starts
      setProgress(0);
      
      // Increment progress every 100ms until 90%
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 100);
    } else {
      // When loading is done, jump to 100%
      setProgress(100);
      
      // Reset after a short delay
      const resetTimer = setTimeout(() => {
        setProgress(0);
      }, 300);
      
      return () => clearTimeout(resetTimer);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  if (!isLoading && progress === 0) {
    return null;
  }

  // Determine the variant class
  const variantClass = variant === 'public' ? 'public-website' : 'erp-system';

  return (
    <div className={`loading-bar-container ${variantClass}`}>
      <div className="loading-bar">
        <div 
          className="loading-bar-progress"
          style={{ width: `${progress}%` }}
        />
      </div>
      {message && (
        <div className="loading-message">
          {message}
        </div>
      )}
    </div>
  );
}