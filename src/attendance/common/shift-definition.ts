// src/attendance/shift-definition.ts
import { WorkShiftType } from './work-shift-type.enum';

export type Dow = 0|1|2|3|4|5|6; // 0=CN ... 6=Thứ 7

export interface ShiftSession {
  code: 'AM' | 'PM' | 'OV';
  start: string;  // 'HH:mm'
  end: string;    // 'HH:mm'
  required: boolean; // có tính công phiên này không (mặc định true)
  graceInMins?: number;   // cho phép vào trễ
  graceOutMins?: number;  // cho phép ra sớm
  breakMinutes?: number; // thời gian nghỉ giữa phiên (nếu có)
  maxCheckInEarlyMins?: number; // cho phép vào sớm (ví dụ: 15 phút) để hạn chế chấm công sớm quá
  maxCheckOutLateMins?: number; // cho phép ra muộn (ví dụ: 15 phút) để hạn chế chấm công muộn quá  
}

export interface ShiftDayRule {
  sessions: ShiftSession[];   // 0..2 phiên
  required?: boolean;         // nếu false: ngày nghỉ (CN)
}

export interface ShiftDefinition {
  type: WorkShiftType;
  tz: string; // 'Asia/Bangkok'
  byDow: Record<Dow, ShiftDayRule>;
  isCheckTwoTimes?: boolean; // có phải chỉ cần chấm công 2 lần cả ngày
}

const DEFAULT_GRACE = 15; // Mặc định cho phép vào trễ/ra sớm 15 phút
const DEFAULT_BREAK = 60; // Mặc định nghỉ trưa 60 phút
const MAX_IN_DELAY = 60; // Cho phép chấm công sớm tối đa 3 giờ (so với Start)
const MAX_OUT_DELAY = 180; // Cho phép chấm công muộn tối đa 3 giờ (so với End)

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
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0, maxCheckInEarlyMins: MAX_IN_DELAY, maxCheckOutLateMins: MAX_OUT_DELAY },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0, maxCheckInEarlyMins: MAX_IN_DELAY, maxCheckOutLateMins: MAX_OUT_DELAY },
    ]},
    2: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0, maxCheckInEarlyMins: MAX_IN_DELAY, maxCheckOutLateMins: MAX_OUT_DELAY },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0, maxCheckInEarlyMins: MAX_IN_DELAY, maxCheckOutLateMins: MAX_OUT_DELAY },
    ]},
    3: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0, maxCheckInEarlyMins: MAX_IN_DELAY, maxCheckOutLateMins: MAX_OUT_DELAY },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0, maxCheckInEarlyMins: MAX_IN_DELAY, maxCheckOutLateMins: MAX_OUT_DELAY },
    ]},
    4: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0, maxCheckInEarlyMins: MAX_IN_DELAY, maxCheckOutLateMins: MAX_OUT_DELAY },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0, maxCheckInEarlyMins: MAX_IN_DELAY, maxCheckOutLateMins: MAX_OUT_DELAY },
    ]},
    5: { sessions: [
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0, maxCheckInEarlyMins: MAX_IN_DELAY, maxCheckOutLateMins: MAX_OUT_DELAY },
      { code: 'PM', start: '13:00', end: '17:30', required: true, graceOutMins: 0, maxCheckInEarlyMins: MAX_IN_DELAY, maxCheckOutLateMins: MAX_OUT_DELAY },
    ]},
    6: { sessions: [ // Thứ 7
      { code: 'AM', start: '08:30', end: '12:00', required: true, graceInMins: 0, maxCheckInEarlyMins: MAX_IN_DELAY, maxCheckOutLateMins: MAX_OUT_DELAY },
      // chiều nghỉ => bỏ PM
    ]},
    0: { sessions: [], required: false }, // CN: nghỉ
  },
  isCheckTwoTimes: true, // chỉ cần chấm công 2 lần cả ngày
};

export const ONLY2TO6_SHIFT: ShiftDefinition = {
  type: WorkShiftType.ONLY_2_TO_6,
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
  },
  isCheckTwoTimes: true,
};

export const OVERNIGHT_SHIFT: ShiftDefinition = {
  type: WorkShiftType.OVERNIGHT,
  tz: 'Asia/Bangkok',
  byDow: {    
    0: { sessions: [], required: false },   
    1: { sessions: [ 
        { code: 'OV', start: '22:00', end: '30:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    2: { sessions: [ 
        { code: 'OV', start: '22:00', end: '30:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    3: { sessions: [ 
        { code: 'OV', start: '22:00', end: '30:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    4: { sessions: [ 
        { code: 'OV', start: '22:00', end: '30:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    
    5: { sessions: [ 
        { code: 'OV', start: '22:00', end: '30:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ], required: true },
    6: { sessions: [ 
        { code: 'OV', start: '22:00', end: '30:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
  }
};

export const ATT_1_SHIFT: ShiftDefinition = {
  type: WorkShiftType.ATT_1,
  tz: 'Asia/Bangkok',
  byDow: {    
    0: { sessions: [], required: false },   
    1: { sessions: [ 
        { code: 'AM', start: '05:00', end: '13:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    2: { sessions: [ 
         { code: 'AM', start: '05:00', end: '13:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    3: { sessions: [ 
         { code: 'AM', start: '05:00', end: '13:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    4: { sessions: [ 
        { code: 'AM', start: '05:00', end: '13:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    
    5: { sessions: [ 
         { code: 'AM', start: '05:00', end: '13:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ], required: true },
    6: { sessions: [ 
         { code: 'AM', start: '05:00', end: '13:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
  }
};

export const ATT_2_SHIFT: ShiftDefinition = {
  type: WorkShiftType.ATT_2,
  tz: 'Asia/Bangkok',
  byDow: {    
    0: { sessions: [], required: false },   
    1: { sessions: [ 
        { code: 'AM', start: '06:00', end: '14:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    2: { sessions: [ 
        { code: 'AM', start: '06:00', end: '14:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    3: { sessions: [ 
       { code: 'AM', start: '06:00', end: '14:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    4: { sessions: [ 
     { code: 'AM', start: '06:00', end: '14:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    
    5: { sessions: [ 
       { code: 'AM', start: '06:00', end: '14:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ], required: true },
    6: { sessions: [ 
        { code: 'AM', start: '06:00', end: '14:00', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
  }
};

export const ATT_3_SHIFT: ShiftDefinition = {
  type: WorkShiftType.ATT_3,
  tz: 'Asia/Bangkok',
  byDow: {    
    0: { sessions: [], required: false },   
    1: { sessions: [ 
        { code: 'AM', start: '08:00', end: '16:30', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    2: { sessions: [ 
       { code: 'AM', start: '08:00', end: '16:30', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    3: { sessions: [ 
       { code: 'AM', start: '08:00', end: '16:30', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    4: { sessions: [ 
      { code: 'AM', start: '08:00', end: '16:30', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
    
    5: { sessions: [ 
        { code: 'AM', start: '08:00', end: '16:30', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ], required: true },
    6: { sessions: [ 
        { code: 'AM', start: '08:00', end: '16:30', required: true, graceInMins: 15, graceOutMins: 15, maxCheckInEarlyMins: 180, maxCheckOutLateMins: 180},
    ]},
  }
};

// Registry để mở rộng thêm nhiều loại ca sau này
export const SHIFT_REGISTRY: Record<WorkShiftType, ShiftDefinition> = {
  [WorkShiftType.REGULAR]: REGULAR_SHIFT,
  [WorkShiftType.ONLY_2_TO_6]: ONLY2TO6_SHIFT,
  [WorkShiftType.OVERNIGHT]: OVERNIGHT_SHIFT,
  [WorkShiftType.ATT_1]: ATT_1_SHIFT,
  [WorkShiftType.ATT_2]: ATT_2_SHIFT,
  [WorkShiftType.ATT_3]: ATT_3_SHIFT,
};

export function resolveSessionsForDate(def: ShiftDefinition, dateKey: string): ShiftSession[] {
 
  const dow = getDowAtTz(dateKey, def.tz); // 0..6
  const rule = def.byDow[dow];
 
  return rule?.sessions ?? [];
}

export function resolveIsCheckTwoTimesForShiftDefinition(def: ShiftDefinition): boolean {  
  const ShiftDefinition = def;
  return ShiftDefinition.isCheckTwoTimes === true; // mặc định false
}

function getDowAtTz(dateKey: string, tz: string): 0|1|2|3|4|5|6 {
  const d = toDateAtTz(dateKey, tz);        // 00:00 tại TZ đó (d dưới đây là Date UTC tương ứng)
  // Lưu ý: getUTCDay trả về dow theo UTC, nhưng d đã là “00:00 tại TZ → quy đổi sang UTC”, nên OK
  return d.getDay() as 0|1|2|3|4|5|6;    // 0=CN, 1=Thứ 2, ...
}

function toDateAtTz(dateKey: string, tz: string): Date {
  // Nếu trong dự án có date-fns-tz/luxon thì thay bằng hàm chuẩn; dưới là bản đơn giản cho Asia/Bangkok
  const [Y, M, D] = dateKey.split('-').map(Number);
  const tzOffsetMinutes = tz === 'Asia/Bangkok' ? 7 * 60 : 0; // điều chỉnh nếu bạn hỗ trợ đa TZ
  // Tạo mốc 00:00:00 LOCAL rồi quy về UTC bằng cách trừ offset
  const localUtc = Date.UTC(Y, M - 1, D, 0, 0, 0);
  return new Date(localUtc - tzOffsetMinutes * 60 * 1000);
}
