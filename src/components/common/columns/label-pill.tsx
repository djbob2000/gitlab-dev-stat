'use client';

import { cn } from '@/src/lib/utils';

interface LabelPillProps {
  text: string;
  colorClass: string;
  className?: string;
}

/**
 * Component for rendering a colored label pill
 */
export const LabelPill = ({ text, colorClass, className }: LabelPillProps) => (
  <span
    className={cn(
      `inline-flex items-center px-2 rounded-full text-xs font-medium ${colorClass}`,
      className
    )}
  >
    {text}
  </span>
);
