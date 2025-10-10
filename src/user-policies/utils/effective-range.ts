export const FROM_MIN = '0001-01-01';
export const TO_MAX   = '9999-12-31';

export function normFrom(v?: string | null) {
  return v && v.trim() ? v : FROM_MIN;
}
export function normTo(v?: string | null) {
  return v && v.trim() ? v : TO_MAX;
}

/** A[from,to] và B[from,to] có chồng lắp không? (khoảng đóng) */
export function overlaps(aFrom?: string | null, aTo?: string | null,
                         bFrom?: string | null, bTo?: string | null) {
  const af = normFrom(aFrom), at = normTo(aTo);
  const bf = normFrom(bFrom), bt = normTo(bTo);
  // so sánh chuỗi YYYY-MM-DD an toàn theo thứ tự từ điển
  return !(at < bf || bt < af);
}

/** Ngày d (YYYY-MM-DD) có nằm trong [from,to] không? */
export function containsDate(from?: string | null, to?: string | null, d?: string) {
  if (!d) return false;
  const f = normFrom(from), t = normTo(to);
  return f <= d && d <= t;
}
