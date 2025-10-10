// src/attendance/shift-definition.ts
import { WorkShiftType } from './work-shift-type.enum';

export type Dow = 0|1|2|3|4|5|6; // 0=CN ... 6=Thứ 7

export interface ShiftSession {
  code: 'AM' | 'PM';
  start: string;  // 'HH:mm'
  end: string;    // 'HH:mm'
  required: boolean; // có tính công phiên này không (mặc định true)
  graceInMins?: number;   // cho phép vào trễ
  graceOutMins?: number;  // cho phép ra sớm
  // có thể thêm breakMinutes, rounding rules...
}

export interface ShiftDayRule {
  sessions: ShiftSession[];   // 0..2 phiên
  required?: boolean;         // nếu false: ngày nghỉ (CN)
}

export interface ShiftDefinition {
  type: WorkShiftType;
  tz: string; // 'Asia/Bangkok'
  byDow: Record<Dow, ShiftDayRule>;
}

/**
 * REGULAR:
 * - Thứ 2-6: sáng 08:30–12:00, chiều 13:00–17:30
 * - Thứ 7: chỉ phiên sáng
 * - CN: nghỉ (required=false). Nếu có checkIn/out thực tế -> sẽ suy luận HALF/FULL theo số giờ thực tế.
 */
export const REGULAR_SHIFT: ShiftDefinition = {
  type: WorkShiftType.REGULAR,
  tz: 'Asia/Bangkok',
  byDow: {
    1: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0 },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0 },
    ]},
    2: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0 },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0 },
    ]},
    3: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0 },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0 },
    ]},
    4: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0 },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0 },
    ]},
    5: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0 },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0 },
    ]},
    6: { sessions: [ // Thứ 7
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0 },
      // chiều nghỉ => bỏ PM
    ]},
    0: { sessions: [], required: false }, // CN: nghỉ
  }
};

export const ONLY2TO6_SHIFT: ShiftDefinition = {
  type: WorkShiftType.REGULAR,
  tz: 'Asia/Bangkok',
  byDow: {
    1: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0 },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0 },
    ]},
    2: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0 },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0 },
    ]},
    3: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0 },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0 },
    ]},
    4: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0 },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0 },
    ]},
    5: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0 },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0 },
    ]},
    6: { sessions: [], required: false},
    0: { sessions: [], required: false }, // CN: nghỉ
  }
};

// Registry để mở rộng thêm nhiều loại ca sau này
export const SHIFT_REGISTRY: Record<WorkShiftType, ShiftDefinition> = {
  [WorkShiftType.REGULAR]: REGULAR_SHIFT,
  [WorkShiftType.ONLY_2_TO_6]: ONLY2TO6_SHIFT,
};
