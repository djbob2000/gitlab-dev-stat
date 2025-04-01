import { useState, useEffect, useCallback } from 'react';
import { ColumnOrderState, Updater } from '@tanstack/react-table';
import { TABLE_COLUMN_ORDER_PREFIX } from '@/src/constants/storage-keys';

/**
 * Hook for managing column order with localStorage persistence
 */
export const useColumnOrder = (tableId: string, defaultColumnIds: string[]) => {
  // State for column order
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => {
    // Check if there is a saved order in localStorage
    if (typeof window !== 'undefined') {
      try {
        const savedOrder = localStorage.getItem(`${TABLE_COLUMN_ORDER_PREFIX}${tableId}`);
        if (savedOrder) {
          const parsedOrder = JSON.parse(savedOrder) as string[];

          // Check that it's an array
          if (!Array.isArray(parsedOrder)) {
            return defaultColumnIds;
          }

          // Ensure all IDs are strings
          const stringOrder = parsedOrder.map(id => String(id));

          // Add new columns that are not in the saved order
          const combinedOrder = [...stringOrder];
          defaultColumnIds.forEach(id => {
            if (!combinedOrder.includes(id)) {
              combinedOrder.push(id);
            }
          });

          // Remove columns that no longer exist
          const filteredOrder = combinedOrder.filter(id => defaultColumnIds.includes(id));

          return filteredOrder;
        }
      } catch (error) {
        console.error('Failed to load column order from localStorage:', error);
      }
    }

    // If there is no saved order or an error occurred, use the default order
    return defaultColumnIds;
  });

  // Update column order when defaultColumnIds changes
  useEffect(() => {
    // Check that all columns from defaultColumnIds are present in columnOrder
    const missingColumns = defaultColumnIds.filter(id => !columnOrder.includes(id));

    // If there are new columns, add them to the end
    if (missingColumns.length > 0) {
      setColumnOrder(prev => [...prev, ...missingColumns]);
    }

    // Remove columns that no longer exist
    const columnsToRemove = columnOrder.filter(id => !defaultColumnIds.includes(id));
    if (columnsToRemove.length > 0) {
      setColumnOrder(prev => prev.filter(id => defaultColumnIds.includes(id)));
    }
  }, [defaultColumnIds, columnOrder]);

  // Handler for changing column order
  const handleColumnOrderChange = useCallback(
    (updaterOrValue: Updater<ColumnOrderState>) => {
      // Handle both update function and direct value
      const newOrder =
        typeof updaterOrValue === 'function' ? updaterOrValue(columnOrder) : updaterOrValue;

      // Update state
      setColumnOrder(newOrder);

      // Save to localStorage
      try {
        localStorage.setItem(`${TABLE_COLUMN_ORDER_PREFIX}${tableId}`, JSON.stringify(newOrder));
      } catch (error) {
        console.error('Failed to save column order to localStorage:', error);
      }
    },
    [tableId, columnOrder]
  );

  return { columnOrder, handleColumnOrderChange };
};
