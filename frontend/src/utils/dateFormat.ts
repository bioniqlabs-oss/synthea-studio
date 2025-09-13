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
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    ...options
  };
  
  try {
    // Use undefined for locale to use browser's default locale
    return new Date(dateString).toLocaleString(undefined, defaultOptions);
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
    return new Date(dateString).toLocaleDateString(undefined, {
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
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (Math.abs(diffMins) < 1) return 'just now';
    if (Math.abs(diffMins) < 60) return `${Math.abs(diffMins)} minute${Math.abs(diffMins) !== 1 ? 's' : ''} ${diffMs < 0 ? 'from now' : 'ago'}`;
    if (Math.abs(diffHours) < 24) return `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ${diffMs < 0 ? 'from now' : 'ago'}`;
    if (Math.abs(diffDays) < 30) return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ${diffMs < 0 ? 'from now' : 'ago'}`;
    
    return formatDate(dateString);
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return 'Invalid date';
  }
}