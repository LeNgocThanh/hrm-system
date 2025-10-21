export enum WorkShiftType {
  REGULAR = 'REGULAR', 
  ONLY_2_TO_6 = 'ONLY_2_TO_6', // Chỉ làm từ Thứ 2 đến Thứ 6, nghỉ Thứ 7 và CN 
  OVERNIGHT = 'OVERNIGHT',
  ATT_1 = 'ATT_1',
  ATT_2 = 'ATT_2',
  ATT_3 = 'ATT_3',
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
   [WorkShiftType.ATT_1]: {
    start: '05:00', // giờ vào chuẩn
    end: '13:00',   // giờ tan chuẩn
    breakMinutes: 0, // nghỉ trưa
  }, 
   [WorkShiftType.ATT_2]: {
    start: '06:00', // giờ vào chuẩn
    end: '18:00',   // giờ tan chuẩn
    breakMinutes: 0, // nghỉ trưa
  }, 
    [WorkShiftType.ATT_3]: {
    start: '08:00', // giờ vào chuẩn
    end: '16:30',   // giờ tan chuẩn
    breakMinutes: 0, // nghỉ trưa
  },
};
