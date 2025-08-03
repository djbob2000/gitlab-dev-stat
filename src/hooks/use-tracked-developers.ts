import { useState, useEffect } from 'react';
import { TRACKED_DEVELOPERS_KEY } from '@/constants/storage-keys';

export interface TrackedDeveloper {
  userId: number;
  username: string;
  selected: boolean;
}

export function useTrackedDevelopers() {
  const [developers, setDevelopers] = useState<TrackedDeveloper[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load developers from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TRACKED_DEVELOPERS_KEY);
    if (stored) {
      const parsedDevelopers = JSON.parse(stored);
      setDevelopers(parsedDevelopers);
    }
    setIsInitialized(true);

    return () => {
      setIsInitialized(false);
    };
  }, []);

  // Save developers to localStorage whenever they change
  useEffect(() => {
    // Only save after initial load to prevent overwriting
    if (isInitialized && developers.length > 0) {
      localStorage.setItem(TRACKED_DEVELOPERS_KEY, JSON.stringify(developers));
    }
  }, [developers, isInitialized]);

  const updateDevelopers = (newDevelopers: TrackedDeveloper[]) => {
    const existingSelections = new Map(
      developers.filter(dev => dev.selected).map(dev => [dev.userId, true])
    );

    const updatedDevelopers = newDevelopers.map(dev => ({
      ...dev,
      selected: existingSelections.has(dev.userId),
    }));

    setDevelopers(updatedDevelopers);
  };

  const toggleDeveloper = (userId: number) => {
    setDevelopers(prev =>
      prev.map(dev => (dev.userId === userId ? { ...dev, selected: !dev.selected } : dev))
    );
  };

  const getSelectedDevelopers = () => {
    return developers.filter(dev => dev.selected);
  };

  return {
    developers,
    isInitialized,
    updateDevelopers,
    toggleDeveloper,
    getSelectedDevelopers,
  };
}
