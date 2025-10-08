export enum WorkShiftType {
  REGULAR = 'REGULAR', // ca hành chính
  NIGHT = 'NIGHT',     // ca đêm
  MORNING = 'MORNING'
}

export const SHIFT_CONFIG = {
  [WorkShiftType.REGULAR]: {
    start: '08:30', // giờ vào chuẩn
    end: '17:30',   // giờ tan chuẩn
    breakMinutes: 60, // nghỉ trưa
  },
  [WorkShiftType.NIGHT]: {
    start: '22:00',
    end: '06:00',
    breakMinutes: 0,
  },
  [WorkShiftType.MORNING]: {
    start: '06:00',
    end: '14:00',
    breakMinutes: 0,
  },
};
