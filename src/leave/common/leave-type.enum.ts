// src/leave/enums/leave-type.enum.ts
export enum LeaveType {
  PAID = 'PAID',            // Nghỉ phép có lương (annual, hưởng lương)
  UNPAID = 'UNPAID',        // Nghỉ không lương
  SICK = 'SICK',            // Nghỉ ốm (có thể hưởng % lương theo policy)
  MATERNITY = 'MATERNITY',  // Thai sản
  COMPENSATORY = 'COMPENSATORY', // Nghỉ bù
  OTHER = 'OTHER',
}

export enum LeaveUnit { DAY='DAY', HALF_DAY='HALF_DAY', HOUR='HOUR' }

