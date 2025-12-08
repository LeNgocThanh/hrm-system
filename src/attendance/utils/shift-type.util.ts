// src/attendance/utils/shift-type.util.ts

import { ShiftSessionNew } from '../../shift-sessions/schemas/shift-session.schema';import { isOvernight, parseTimeToMinutes } from './time.util';

export function guessWorkShiftType(shift: ShiftSessionNew): string {  
  if (isOvernight(shift.start, shift.end)) {
    return 'OV';
  }
  const startMins = parseTimeToMinutes(shift.start);
  if (startMins < 12 * 60) {
    return 'AM';
  }
  return 'PM';
}
