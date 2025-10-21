export class UpsertHolidayDto {
dateKey!: string; // 'YYYY-MM-DD'
name!: string;
isPaid?: boolean = true;
note?: string;
}

export class QueryHolidaysDto {
from?: string; // 'YYYY-MM-DD'
to?: string; // 'YYYY-MM-DD'
}