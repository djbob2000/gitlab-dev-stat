'use client';

import { cn } from '@/lib/utils';

interface LabelPillProps {
  text: string;
  colorClass: string;
  className?: string;
  count?: number;
}

/**
 * Component for rendering a colored label pill
 */
export const LabelPill = ({ text, colorClass, className, count }: LabelPillProps) => (
  <span
    className={cn(
      `inline-flex items-center px-2 rounded-full text-xs font-medium ${colorClass}`,
      className
    )}
  >
    {text}
    {count !== undefined && count > 0 && (
      <span className="ml-1 px-1 bg-white bg-opacity-30 rounded-sm font-bold">{count}</span>
    )}
  </span>
);
