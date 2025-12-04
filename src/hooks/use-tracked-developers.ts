import { useEffect, useState } from 'react';
import { getTrackedDevelopersKey } from '@/constants/storage-keys';

export interface TrackedDeveloper {
  userId: number;
  username: string;
  excluded: boolean;
  projectId: number; // Required project association
}

// Legacy interface for migration
interface LegacyTrackedDeveloper {
  userId: number;
  username: string;
  selected: boolean;
}

/**
 * Migration function to convert from selection-based to exclusion-based tracking
 * Note: This function assumes developers are from the current project
 */
const migrateLegacyData = (
  legacyDevelopers: LegacyTrackedDeveloper[],
  projectId: number
): TrackedDeveloper[] => {
  return legacyDevelopers.map((dev) => ({
    ...dev,
    excluded: !dev.selected, // Invert logic: selected becomes not excluded
    projectId, // Add the current project ID
  }));
};

export function useTrackedDevelopers(projectId: number) {
  const [developers, setDevelopers] = useState<TrackedDeveloper[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const storageKey = getTrackedDevelopersKey(projectId);

  // Load developers from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsedData = JSON.parse(stored);

        // Check if data is in legacy format (has 'selected' property)
        const isLegacyFormat = parsedData.length > 0 && 'selected' in parsedData[0];

        if (isLegacyFormat) {
          // Migrate legacy data and add project ID
          const migratedDevelopers = migrateLegacyData(parsedData, projectId);
          setDevelopers(migratedDevelopers);

          // Save migrated data back to localStorage
          localStorage.setItem(storageKey, JSON.stringify(migratedDevelopers));
        } else {
          // Use current format and ensure all developers belong to this project
          const projectDevelopers = parsedData.filter(
            (dev: TrackedDeveloper) => dev.projectId === projectId
          );
          setDevelopers(projectDevelopers);
        }
      } catch (error) {
        console.error('Error parsing stored developers data:', error);
        localStorage.removeItem(storageKey);
        setDevelopers([]);
      }
    }
    setIsInitialized(true);

    return () => {
      setIsInitialized(false);
    };
  }, [storageKey, projectId]);

  // Save developers to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(storageKey, JSON.stringify(developers));
    }
  }, [developers, isInitialized, storageKey]);

  const updateDevelopers = (newDevelopers: TrackedDeveloper[]) => {
    // Ensure all developers have the correct projectId and are included by default
    const updatedDevelopers = newDevelopers.map((dev) => ({
      ...dev,
      projectId: projectId, // Ensure correct project association
      excluded: false, // New developers are included by default (excluded: false)
    }));

    setDevelopers(updatedDevelopers);
  };

  const toggleDeveloper = (userId: number) => {
    setDevelopers((prev) =>
      prev.map((dev) => (dev.userId === userId ? { ...dev, excluded: !dev.excluded } : dev))
    );
  };

  const getIncludedDevelopers = () => {
    return developers.filter((dev) => !dev.excluded);
  };

  const getExcludedDevelopers = () => {
    return developers.filter((dev) => dev.excluded);
  };

  // Legacy method for backward compatibility
  const getSelectedDevelopers = () => {
    return getIncludedDevelopers();
  };

  return {
    developers,
    isInitialized,
    updateDevelopers,
    toggleDeveloper,
    getIncludedDevelopers,
    getExcludedDevelopers,
    getSelectedDevelopers, // Legacy method for backward compatibility
  };
}
