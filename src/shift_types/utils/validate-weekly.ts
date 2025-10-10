import { SessionCode } from '../common/session-code.enum';

export function validateWeeklyRules2SessionsOnly(weekly: any) {
  const mustAMPM = [1, 2, 3, 4, 5]; // Mon..Fri

  for (const dow of mustAMPM) {
    const arr: any[] = weekly?.[String(dow)] ?? [];
    if (arr.length !== 2) throw new Error(`Thứ ${dow}: phải có đúng 2 phiên AM & PM`);
    const codes = new Set(arr.map(s => s.code));
    if (!(codes.has(SessionCode.AM) && codes.has(SessionCode.PM))) {
      throw new Error(`Thứ ${dow}: thiếu AM/PM`);
    }
    for (const s of arr) if (!isTimeRangeValid(s.start, s.end)) {
      throw new Error(`Thứ ${dow} (${s.code}): start phải < end (HH:mm)`);
    }
  }

  const sat = weekly?.['6'] ?? [];
  if (sat.length > 1) throw new Error('Thứ 7: tối đa 1 phiên AM');
  if (sat.length === 1) {
    if (sat[0].code !== SessionCode.AM) throw new Error('Thứ 7: chỉ được AM');
    if (!isTimeRangeValid(sat[0].start, sat[0].end)) {
      throw new Error('Thứ 7 (AM): start phải < end (HH:mm)');
    }
  }

  const sun = weekly?.['0'] ?? [];
  if (sun.length !== 0) throw new Error('Chủ nhật: phải rỗng (nghỉ)');
}

function isTimeRangeValid(start: string, end: string) {
  const m = (s: string) => {
    const a = s.match(/^(\d{2}):(\d{2})$/);
    return a ? Number(a[1]) * 60 + Number(a[2]) : NaN;
  };
  const ms = m(start), me = m(end);
  return Number.isFinite(ms) && Number.isFinite(me) && ms < me;
}
