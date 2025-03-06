/**
 * Formats a date into a readable time string
 */
export const formatLastUpdated = (date?: Date): string => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};
