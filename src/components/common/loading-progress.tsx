'use client';

import { Progress } from '@/src/components/ui/progress';
import { useState, useEffect } from 'react';

interface LoadingProgressProps {
  isLoading: boolean;
  initialProgress?: number;
  duration?: number;
}

export function LoadingProgress({
  isLoading,
  initialProgress = 5,
  duration = 15000,
}: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      // Reset progress when not loading
      setProgress(0);
      return;
    }

    // Set initial progress
    setProgress(initialProgress);

    // Start progress animation
    const startTime = Date.now();
    const midpointDuration = duration * 0.6; // 60% of total time for middle section

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let newProgress = 0;

      if (elapsed < duration * 0.1) {
        // First 10% of time: 0-30%
        newProgress = initialProgress + (elapsed / (duration * 0.1)) * 25;
      } else if (elapsed < duration * 0.1 + midpointDuration) {
        // Middle section: 30-80%
        const midpointElapsed = elapsed - duration * 0.1;
        newProgress = 30 + (midpointElapsed / midpointDuration) * 50;
      } else if (elapsed < duration) {
        // Last section: 80-95%
        const finalElapsed = elapsed - (duration * 0.1 + midpointDuration);
        const finalDuration = duration - (duration * 0.1 + midpointDuration);
        newProgress = 80 + (finalElapsed / finalDuration) * 15;
      } else {
        // Cap at 95% until data is loaded
        newProgress = 95;
      }

      setProgress(Math.min(newProgress, 95));
    }, 50);

    // Clean up interval
    return () => clearInterval(progressInterval);
  }, [isLoading, initialProgress, duration]);

  // Complete progress when isLoading changes from true to false
  useEffect(() => {
    if (!isLoading && progress > 0) {
      setProgress(100);
      const timer = setTimeout(() => {
        setProgress(0);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isLoading, progress]);

  if (progress === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Progress value={progress} className="h-1 rounded-none" />
    </div>
  );
}
