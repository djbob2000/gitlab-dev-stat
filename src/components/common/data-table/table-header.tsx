'use client';

import React from 'react';

// Table header without refresh button
interface TableHeaderProps {
  title: string;
  lastUpdated?: Date;
  action?: React.ReactNode;
}

export function TableHeader({ title, lastUpdated, action }: TableHeaderProps) {
  // State to track current time for updating "time ago" display
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Effect to update current time every minute
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute (60000ms)

    return () => clearInterval(intervalId);
  }, []);

  let formattedTime = '';
  let timeAgo = '';

  if (lastUpdated) {
    const hours = lastUpdated.getHours().toString().padStart(2, '0');
    const minutes = lastUpdated.getMinutes().toString().padStart(2, '0');
    formattedTime = `${hours}:${minutes}`;

    const diffMs = Math.max(0, currentTime.getTime() - lastUpdated.getTime());
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;

    timeAgo = `${String(diffHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')} ago`;
  }

  return (
    <div className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        {action}
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        {lastUpdated && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {formattedTime} ({timeAgo})
          </span>
        )}
      </div>
    </div>
  );
}
