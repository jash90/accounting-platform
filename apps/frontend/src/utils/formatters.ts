/**
 * Formatting Utilities
 * Functions for formatting dates, currency, numbers, and text
 */

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format date in Polish locale
 * @param date - Date string or Date object
 * @param format - Format type ('short', 'medium', 'long', 'relative')
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: 'short' | 'medium' | 'long' | 'relative' = 'medium'
): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '-';

  if (format === 'relative') {
    return formatRelativeTime(dateObj);
  }

  const options: Intl.DateTimeFormatOptions =
    format === 'short'
      ? { year: '2-digit', month: '2-digit', day: '2-digit' }
      : format === 'medium'
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };

  return new Intl.DateTimeFormat('pl-PL', options).format(dateObj);
}

/**
 * Format date and time
 * @param date - Date string or Date object
 * @returns Formatted date and time string
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '-';

  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format relative time (e.g., "2 godziny temu", "wczoraj")
 * @param date - Date string or Date object
 * @returns Relative time string in Polish
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'przed chwilą';
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minutę' : diffMin < 5 ? 'minuty' : 'minut'} temu`;
  } else if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? 'godzinę' : diffHour < 5 ? 'godziny' : 'godzin'} temu`;
  } else if (diffDay === 1) {
    return 'wczoraj';
  } else if (diffDay < 7) {
    return `${diffDay} ${diffDay < 5 ? 'dni' : 'dni'} temu`;
  } else if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} ${weeks === 1 ? 'tydzień' : weeks < 5 ? 'tygodnie' : 'tygodni'} temu`;
  } else if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return `${months} ${months === 1 ? 'miesiąc' : months < 5 ? 'miesiące' : 'miesięcy'} temu`;
  } else {
    const years = Math.floor(diffDay / 365);
    return `${years} ${years === 1 ? 'rok' : years < 5 ? 'lata' : 'lat'} temu`;
  }
}

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Format currency in PLN
 * @param amount - Number or string amount
 * @param showCurrency - Whether to show currency symbol
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  showCurrency = true
): string {
  if (amount === null || amount === undefined) return '-';

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) return '-';

  if (showCurrency) {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(numAmount);
  } else {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  }
}

/**
 * Format number with thousand separators
 * @param value - Number or string value
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals = 0
): string {
  if (value === null || value === undefined) return '-';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '-';

  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
}

// ============================================================================
// Text Formatting
// ============================================================================

/**
 * Truncate text to specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (!text || text.length <= maxLength) return text;

  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Format full name from first and last name
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Full name
 */
export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Get initials from name
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Initials (e.g., "JK")
 */
export function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
}

// ============================================================================
// File Size Formatting
// ============================================================================

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================================================
// Percentage Formatting
// ============================================================================

/**
 * Format percentage
 * @param value - Value (0-100 or 0-1)
 * @param decimals - Number of decimal places
 * @param isDecimal - Whether input is decimal (0-1) or percentage (0-100)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  decimals = 0,
  isDecimal = false
): string {
  const percentage = isDecimal ? value * 100 : value;

  return `${percentage.toFixed(decimals)}%`;
}

// ============================================================================
// Address Formatting
// ============================================================================

/**
 * Format full address
 * @param address - Address components
 * @returns Formatted address string
 */
export function formatAddress(address: {
  street?: string | null;
  city?: string | null;
  postalCode?: string | null;
  province?: string | null;
  country?: string | null;
}): string {
  const parts: string[] = [];

  if (address.street) parts.push(address.street);
  if (address.postalCode && address.city) {
    parts.push(`${address.postalCode} ${address.city}`);
  } else if (address.city) {
    parts.push(address.city);
  }
  if (address.province) parts.push(address.province);
  if (address.country && address.country !== 'PL') parts.push(address.country);

  return parts.join(', ');
}

// ============================================================================
// Empty Value Formatting
// ============================================================================

/**
 * Format value or return placeholder for empty values
 * @param value - Value to format
 * @param placeholder - Placeholder text (default: '-')
 * @returns Formatted value or placeholder
 */
export function formatOrPlaceholder(
  value: any,
  placeholder = '-'
): string {
  if (value === null || value === undefined || value === '') {
    return placeholder;
  }

  if (typeof value === 'string') {
    return value.trim() || placeholder;
  }

  return String(value);
}

/**
 * Format boolean as Tak/Nie
 * @param value - Boolean value
 * @returns "Tak" or "Nie"
 */
export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value ? 'Tak' : 'Nie';
}
