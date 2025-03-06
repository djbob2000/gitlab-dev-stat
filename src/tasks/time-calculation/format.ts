/**
 * Formats duration in milliseconds into "HH:MM" format (hours and minutes only)
 * for the In Progress column
 */
export const formatHoursAndMinutes = (durationMs: number): string => {
  if (!durationMs || isNaN(durationMs)) return '';

  // Convert milliseconds to hours and minutes
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  // Format as "HH:MM"
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
};

/**
 * Formats duration in milliseconds into "Xd HH:MM" format
 * where d represents calendar days (24 hours per day), excluding weekends
 */
export const formatDuration = (durationMs: number): string => {
  if (!durationMs || isNaN(durationMs)) return '';

  // Calculate weekends to subtract
  const startDate = new Date(Date.now() - durationMs);
  const endDate = new Date();

  // Count weekend days between start and end dates
  let weekendDays = 0;
  const tempDate = new Date(startDate);
  while (tempDate <= endDate) {
    if (tempDate.getUTCDay() === 0 || tempDate.getUTCDay() === 6) {
      weekendDays++;
    }
    tempDate.setUTCDate(tempDate.getUTCDate() + 1);
  }

  // Subtract weekend time from total milliseconds
  const weekendTimeMs = weekendDays * 24 * 60 * 60 * 1000;
  const adjustedMs = durationMs - weekendTimeMs;

  const seconds = Math.floor(adjustedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  // Calculate days based on 24-hour periods
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);

  // Always display hours and minutes in HH:MM format
  parts.push(
    `${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`
  );

  return parts.join(' ');
};
