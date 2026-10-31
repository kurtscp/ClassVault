/**
 * Formatting utilities for file sizes, dates, and comment timestamps.
 * Standardizes Philippine Time (PHT, UTC+8) display across all screens.
 */

export function formatBytes(bytes: number): string {
  if (bytes <= 0 || !Number.isFinite(bytes)) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

  if (i === 0) {
    return `${bytes} B`;
  }

  const val = bytes / Math.pow(1024, i);
  const formatted = parseFloat(val.toFixed(1));
  return `${formatted} ${units[i]}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats comment timestamps in 24-hour military time in Philippine Time (PHT, UTC+8).
 * Never uses 12-hour AM/PM format, and never uses relative format ("2 hours ago").
 */
export function formatCommentTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const dayFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });

  const todayStr = dayFormatter.format(new Date());
  const dateStr = dayFormatter.format(date);
  const timeStr = `${timeFormatter.format(date)} PHT`;

  if (todayStr === dateStr) {
    return timeStr;
  }

  return `${formatDate(iso)} · ${timeStr}`;
}

