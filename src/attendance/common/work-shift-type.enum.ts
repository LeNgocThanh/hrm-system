export enum WorkShiftType {
  REGULAR = 'REGULAR', 
  ONLY_2_TO_6 = 'ONLY_2_TO_6', // Chỉ làm từ Thứ 2 đến Thứ 6, nghỉ Thứ 7 và CN 
  OVERNIGHT = 'OVERNIGHT',
}

export const SHIFT_CONFIG = {
  [WorkShiftType.REGULAR]: {
    start: '08:30', // giờ vào chuẩn
    end: '17:30',   // giờ tan chuẩn
    breakMinutes: 60, // nghỉ trưa
  }, 
  [WorkShiftType.ONLY_2_TO_6]: {
    start: '08:30', // giờ vào chuẩn
    end: '17:30',   // giờ tan chuẩn
    breakMinutes: 60, // nghỉ trưa
  }, 
  [WorkShiftType.OVERNIGHT]: {
    start: '08:30', // giờ vào chuẩn
    end: '17:30',   // giờ tan chuẩn
    breakMinutes: 60, // nghỉ trưa
  }, 
};
