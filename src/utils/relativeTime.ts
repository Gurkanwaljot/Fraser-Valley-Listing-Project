const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

export function formatRelativeTime(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < MINUTE) return 'just now';
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return `${m} min ago`;
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    return `${h} hour${h > 1 ? 's' : ''} ago`;
  }
  const d = Math.floor(seconds / DAY);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}
