'use client';

import { Progress } from '@/src/components/ui/progress';
import { useState, useEffect, useRef } from 'react';

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
  const progressRef = useRef(0);
  const isCompletingRef = useRef(false);
  const startTimeRef = useRef(0);
  const isFirstRenderRef = useRef(true);
  const animationFrameIdRef = useRef<number | null>(null);
  const isLoadingRef = useRef(isLoading);

  // Update ref when prop changes
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Animation function - defined outside useEffect to avoid re-creation
  const animate = () => {
    const elapsed = Date.now() - startTimeRef.current;
    const midpointDuration = duration * 0.6;
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

    // Only update if value has changed significantly
    const roundedProgress = Math.min(Math.round(newProgress * 10) / 10, 95);
    if (Math.abs(roundedProgress - progressRef.current) >= 0.5) {
      progressRef.current = roundedProgress;
      setProgress(roundedProgress);
    }

    // Continue animation if still loading
    if (isLoadingRef.current && !isCompletingRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(animate);
    }
  };

  // Cleanup function
  const cleanup = () => {
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  };

  // Main loading effect
  useEffect(() => {
    // Initialize on first render if loading
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;

      // If we should be loading on initial render, start immediately
      if (isLoading) {
        startTimeRef.current = Date.now();
        progressRef.current = initialProgress;
        setProgress(initialProgress);
        animationFrameIdRef.current = requestAnimationFrame(animate);
      }
      return;
    }

    // Start loading animation
    if (isLoading && !isCompletingRef.current) {
      // Reset state
      isCompletingRef.current = false;
      startTimeRef.current = Date.now();
      progressRef.current = initialProgress;
      setProgress(initialProgress);

      // Clean up any existing animation
      cleanup();

      // Start new animation loop
      animationFrameIdRef.current = requestAnimationFrame(animate);
    }
    // Handle completion
    else if (!isLoading && progressRef.current > 0 && !isCompletingRef.current) {
      isCompletingRef.current = true;
      cleanup();
      setProgress(100);

      // Reset after animation completes
      const timer = setTimeout(() => {
        setProgress(0);
        progressRef.current = 0;
        isCompletingRef.current = false;
      }, 300);

      return () => {
        clearTimeout(timer);
        cleanup();
      };
    }

    return cleanup;
  }, [isLoading, initialProgress, duration]);

  if (progress === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Progress value={progress} className="h-1 rounded-none" />
    </div>
  );
}
