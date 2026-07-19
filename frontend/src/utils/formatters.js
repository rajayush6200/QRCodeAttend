import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

/**
 * Format a date string to a readable format.
 */
export const formatDate = (date, fmt = 'MMM dd, yyyy') => {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(d)) return '—';
  return format(d, fmt);
};

/**
 * Format a date with time.
 */
export const formatDateTime = (date) => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

/**
 * Format relative time (e.g., "2 hours ago").
 */
export const formatRelativeTime = (date) => {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(d)) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
};

/**
 * Format a number as a percentage string.
 */
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Capitalize first letter.
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Truncate text with ellipsis.
 */
export const truncate = (str, maxLength = 50) => {
  if (!str) return '';
  return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
};

/**
 * Get initials from a name (up to 2 letters).
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
};

/**
 * Format file size.
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Download a Blob as a file.
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Get status badge class.
 */
export const getStatusBadgeClass = (status) => {
  const map = {
    present: 'badge-present',
    late: 'badge-late',
    absent: 'badge-absent',
    excused: 'badge bg-purple-500/20 text-purple-400',
    active: 'badge-active',
    scheduled: 'badge-scheduled',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
  };
  return map[status] || 'badge bg-slate-500/20 text-slate-400';
};

/**
 * Format attendance rate color.
 */
export const getRateColor = (rate) => {
  if (rate >= 85) return 'text-emerald-400';
  if (rate >= 75) return 'text-amber-400';
  return 'text-red-400';
};
