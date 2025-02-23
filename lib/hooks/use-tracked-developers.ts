import { useState, useEffect } from 'react';

const STORAGE_KEY = 'tracked-developers';

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
    const stored = localStorage.getItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(developers));
    }
  }, [developers, isInitialized]);

  const updateDevelopers = (newDevelopers: TrackedDeveloper[]) => {

    const existingSelections = new Map(
      developers.filter(dev => dev.selected).map(dev => [dev.userId, true])
    );

    const updatedDevelopers = newDevelopers.map(dev => ({
      ...dev,
      selected: existingSelections.has(dev.userId)
    }));

    setDevelopers(updatedDevelopers);
  };

  const toggleDeveloper = (username: string) => {
    setDevelopers(prev => 
      prev.map(dev => 
        dev.username === username 
          ? { ...dev, selected: !dev.selected }
          : dev
      )
    );
  };

  const getSelectedDevelopers = () => {
    return developers.filter(dev => dev.selected).map(dev => dev.username);
  };

  return {
    developers,
    isInitialized,
    updateDevelopers,
    toggleDeveloper,
    getSelectedDevelopers,
  };
} 