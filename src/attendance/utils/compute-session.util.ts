// src/attendance/utils/compute-session.util.ts
import { AttendanceLog } from '../schemas/attendance-log.schema';
import { ShiftSessionNew } from '../../shift-sessions/schemas/shift-session.schema';
import { buildDateTime, isOvernight } from './time.util';

export interface SessionComputeInput {
  dateKey: string;     // 'YYYY-MM-DD'
  userId: string;
  shift: ShiftSessionNew;
  logs: AttendanceLog[];  // log đã lọc theo window
}

export interface SessionComputeResult {
  checkIn?: Date;
  checkOut?: Date;
  firstIn?: Date;
  lastOut?: Date;
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  hourWork: number; // số phút ca chuẩn
}

export function computeSession(input: SessionComputeInput): SessionComputeResult {
  const { dateKey, shift, logs } = input;

  console.log('computeSession input logs:', logs , ' for shift ', shift);

  // giờ chuẩn ca
  const plannedStart = buildDateTime(dateKey, shift.start);
  const plannedEnd = (() => {
    const d = buildDateTime(dateKey, shift.end);
    if (isOvernight(shift.start, shift.end)) {
      d.setDate(d.getDate() + 1); // ca gối ngày
    }
    return d;
  })();

  const hourWork =
    (plannedEnd.getTime() - plannedStart.getTime()) / 60000 -
    (shift.breakMinutes ?? 0);

  if (!logs.length) {
    return {
      workedMinutes: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      hourWork,
    };
  }

  const first = logs[0].timestamp;
  const last = logs[logs.length - 1].timestamp;

  // === CẮN NGƯỠNG THỜI GIAN TÍNH CÔNG (KHÔNG ĐỤNG VÀO LATE/EARLY) ===
  const oneHourMs = 60 * 60000;

  let effectiveFirst = first;
  let effectiveLast = last;

  // Giới hạn phía cuối ca:
  // - Nếu last <= plannedEnd + 1h => chỉ tính công tới plannedEnd
  // - Nếu last > plannedEnd + 1h   => tính như cũ (từ first đến last)
  if (last > plannedEnd) {
    const diffMs = last.getTime() - plannedEnd.getTime();
    if (diffMs <= oneHourMs) {
      effectiveLast = plannedEnd;
    } else {
      effectiveLast = last;
    }
  }

  // Giới hạn phía đầu ca:
  // - Nếu first < plannedStart, và sớm không quá 1h => chỉ tính công từ plannedStart
  // - Nếu first < plannedStart, và sớm hơn 1h      => tính như cũ (từ first)
  // - Nếu first >= plannedStart                    => giữ nguyên
  if (first < plannedStart) {
    const diffMs = plannedStart.getTime() - first.getTime();
    if (diffMs <= oneHourMs) {
      effectiveFirst = plannedStart;
    } else {
      effectiveFirst = first;
    }
  }

  // grace / maxEarly / maxLate (vẫn dùng first/last thật để tính đi trễ/về sớm)
  const graceIn = shift.graceInMins ?? 0;
  const graceOut = shift.graceOutMins ?? 0;
  const maxEarly = shift.maxCheckInEarlyMins ?? 120; // nếu không set, cho sớm 2h
  const maxLate = shift.maxCheckOutLateMins ?? 240;  // nếu không set, cho muộn 4h

  // workedMinutes: thời gian thực được tính công - breakMinutes,
  // nhưng dùng effectiveFirst / effectiveLast đã cắn ngưỡng
  const grossMinutes = Math.max(
    0,
    Math.round((effectiveLast.getTime() - effectiveFirst.getTime()) / 60000),
  );
  const workedMinutes = Math.max(0, grossMinutes - (shift.breakMinutes ?? 0));

  // đi trễ: vẫn so sánh theo first (log thật) với plannedStart + graceIn
  let lateMinutes = 0;
 
  if (first > plannedStart) {
    lateMinutes = Math.round(
      (first.getTime() - plannedStart.getTime()) / 60000,
    );
  }

  // về sớm: vẫn so sánh theo last (log thật) với plannedEnd - graceOut
  let earlyLeaveMinutes = 0;
  
  if (last < plannedEnd) {
    earlyLeaveMinutes = Math.round(
      (plannedEnd.getTime() - last.getTime()) / 60000,
    );
  }

  return {
    checkIn: first,
    checkOut: last,
    firstIn: first,
    lastOut: last,
    workedMinutes,
    lateMinutes,
    earlyLeaveMinutes,
    hourWork,
  };
}

