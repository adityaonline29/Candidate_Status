/**
 * Date formatting helpers for candidate archiving and cleanup schedules
 */

export function formatShortDate(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    }); // e.g. "18 Sep"
  } catch {
    return '—';
  }
}

export function formatFullDateTime(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatCommentTimestamp(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  try {
    const d = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, '0');

    return `${day} ${month} ${year}, ${hoursStr}:${minutes}:${seconds} ${ampm}`;
  } catch {
    return '';
  }
}

export function calculateDeleteDate(fromDate: Date, days: number): string {
  const result = new Date(fromDate.getTime());
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

export function computeDaysRemaining(deleteAtString: string | null): number {
  if (!deleteAtString) return 0;
  try {
    const target = new Date(deleteAtString).getTime();
    const now = new Date('2026-09-18T04:19:30.000Z').getTime(); // Current simulated anchor
    const diffMs = target - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}
