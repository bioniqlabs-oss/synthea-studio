/**
 * Format a date string for display in the user's browser timezone
 * @param dateString - ISO date string from the backend (UTC)
 * @param options - Additional formatting options
 * @returns Formatted date string in the browser's timezone
 */
export function formatDateTime(dateString: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return '';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options
  };
  
  try {
    // Backend sends timestamps without timezone, they are in UTC
    // Always append 'Z' if there's no timezone indicator
    const hasTimezone = dateString.endsWith('Z') || 
                       dateString.match(/[+-]\d{2}:\d{2}$/) ||
                       dateString.endsWith('+00:00');
    
    const utcDateString = hasTimezone ? dateString : dateString + 'Z';
    
    // Parse the date string as UTC and format in browser's timezone
    const date = new Date(utcDateString);
    
    return date.toLocaleString(undefined, defaultOptions);
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return 'Invalid date';
  }
}

/**
 * Format a date string for display (date only, no time)
 * @param dateString - ISO date string from the backend (UTC)
 * @returns Formatted date string in the browser's timezone
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    // Backend sends timestamps without timezone, they are in UTC
    // Always append 'Z' if there's no timezone indicator
    const hasTimezone = dateString.endsWith('Z') || 
                       dateString.match(/[+-]\d{2}:\d{2}$/) ||
                       dateString.endsWith('+00:00');
    
    const utcDateString = hasTimezone ? dateString : dateString + 'Z';
    
    return new Date(utcDateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return 'Invalid date';
  }
}

/**
 * Get relative time (e.g., "5 minutes ago", "in 2 hours")
 * @param dateString - ISO date string from the backend (UTC)
 * @returns Relative time string
 */
export function getRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    // Backend sends timestamps without timezone, they are in UTC
    // Always append 'Z' if there's no timezone indicator
    const hasTimezone = dateString.endsWith('Z') || 
                       dateString.match(/[+-]\d{2}:\d{2}$/) ||
                       dateString.endsWith('+00:00');
    
    const utcDateString = hasTimezone ? dateString : dateString + 'Z';
    
    const date = new Date(utcDateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const absDiffMs = Math.abs(diffMs);
    const diffMins = Math.floor(absDiffMs / 60000);
    const diffHours = Math.floor(absDiffMs / 3600000);
    const diffDays = Math.floor(absDiffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ${diffMs > 0 ? 'ago' : 'from now'}`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${diffMs > 0 ? 'ago' : 'from now'}`;
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${diffMs > 0 ? 'ago' : 'from now'}`;
    
    return formatDate(dateString);
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return 'Invalid date';
  }
}