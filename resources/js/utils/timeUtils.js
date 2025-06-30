/**
 * Time formatting utilities for consistent time display across the application
 */

/**
 * Get relative time string from a date
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted relative time string
 */
export const getTimeAgo = (date) => {
  if (!date) return '';
  
  // Convert string dates to Date objects
  const targetDate = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const seconds = Math.floor((now - targetDate) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 120) return '1 minute ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 7200) return '1 hour ago';
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  
  return 'over a day ago';
};

/**
 * Format a date for display in charts or lists
 * @param {Date|string} date - The date to format
 * @param {boolean} includeYear - Whether to include the year
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, includeYear = false) => {
  if (!date) return '';
  
  const targetDate = date instanceof Date ? date : new Date(date);
  const options = { month: 'short', day: 'numeric' };
  
  if (includeYear) {
    options.year = 'numeric';
  }
  
  return targetDate.toLocaleDateString('en-US', options);
};

/**
 * Format a date for display with special handling for today/tomorrow
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted date string
 */
export const formatDateSpecial = (date) => {
  if (!date) return '';
  
  const targetDate = date instanceof Date ? date : new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Check if it's today
  if (targetDate.toDateString() === today.toDateString()) {
    return 'Today';
  }
  
  // Check if it's tomorrow
  if (targetDate.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  
  // Otherwise return formatted date
  return formatDate(targetDate);
};

/**
 * Get a shorter relative time string (used in compact displays)
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted relative time string
 */
export const getTimeAgoShort = (date) => {
  if (!date) return '';
  
  const targetDate = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const seconds = Math.floor((now - targetDate) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  return formatDate(targetDate);
};