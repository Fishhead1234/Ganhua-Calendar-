/**
 * Date and timezone helper utilities for Gan-Hua Calendar
 * Ensures local timezone accuracy (especially in UTC+8) and eliminates off-by-one UTC shifting bugs.
 */

/**
 * Returns YYYY-MM-DD formatted string using the user's local timezone.
 * CRITICAL: Never use .toISOString().split('T')[0] or .toISOString().slice(0, 10),
 * as that shifts dates backwards by 1 day in UTC+8 or eastern timezones!
 */
export function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a local Date object set to 00:00:00 local time.
 */
export function parseLocalDateKey(dateKey: string): Date {
  const parts = dateKey.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Returns today's date key in local timezone (YYYY-MM-DD).
 */
export function getTodayLocalDateKey(): string {
  return toLocalDateKey(new Date());
}

/**
 * Compares two dates by local day, ignoring hours/minutes/seconds.
 */
export function isSameLocalDate(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
