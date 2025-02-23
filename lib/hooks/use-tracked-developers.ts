import { useState, useEffect } from 'react';

const STORAGE_KEY = 'tracked-developers';

export interface TrackedDeveloper {
  username: string;
  selected: boolean;
}

export function useTrackedDevelopers() {
  const [developers, setDevelopers] = useState<TrackedDeveloper[]>([]);

  // Load developers from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setDevelopers(JSON.parse(stored));
    }
  }, []);

  // Save developers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(developers));
  }, [developers]);

  const updateDevelopers = (newDevelopers: TrackedDeveloper[]) => {
    setDevelopers(newDevelopers);
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
    updateDevelopers,
    toggleDeveloper,
    getSelectedDevelopers,
  };
} 