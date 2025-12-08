// src/attendance/utils/time.util.ts
export function parseTimeToMinutes(time: string): number {
  // 'HH:mm' => số phút từ 00:00
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function buildDateTime(dateKey: string, time: string): Date {
  const d = new Date(dateKey); // YYYY-MM-DD -> 00:00 local
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

// ca gối ngày nếu end <= start (VD: 22:00 -> 06:00)
export function isOvernight(start: string, end: string): boolean {
  const startMins = parseTimeToMinutes(start);
  const endMins = parseTimeToMinutes(end);
  return endMins <= startMins;
}
