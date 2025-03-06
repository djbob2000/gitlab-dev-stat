import { useState, useEffect, useCallback } from 'react';
import { ColumnSizingState, Updater } from '@tanstack/react-table';

/**
 * Hook for managing column widths with localStorage persistence
 */
export const useColumnSizing = (tableId: string) => {
  // State for column sizing
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  // Load saved column widths on mount
  useEffect(() => {
    try {
      const savedWidths = localStorage.getItem(`table-column-widths-${tableId}`);
      if (savedWidths) {
        setColumnSizing(JSON.parse(savedWidths));
      }
    } catch (error) {
      console.error('Failed to load column widths from localStorage:', error);
    }
  }, [tableId]);

  // Save column widths when they change
  const handleColumnSizingChange = useCallback(
    (updaterOrValue: Updater<ColumnSizingState>) => {
      // Handle both function updater and direct value
      const newSizing =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(columnSizing as ColumnSizingState)
          : updaterOrValue;

      setColumnSizing(newSizing);
      try {
        localStorage.setItem(`table-column-widths-${tableId}`, JSON.stringify(newSizing));
      } catch (error) {
        console.error('Failed to save column widths to localStorage:', error);
      }
    },
    [tableId, columnSizing]
  );

  return { columnSizing, handleColumnSizingChange };
};
