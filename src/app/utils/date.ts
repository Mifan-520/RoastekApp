import { format, parseISO, isValid } from 'date-fns';

export function formatAbsoluteTime(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    const date = dateString.includes('T') ? parseISO(dateString) : new Date(dateString);
    if (!isValid(date)) return dateString; // fallback
    return format(date, 'MM-dd HH:mm');
  } catch {
    return dateString;
  }
}
