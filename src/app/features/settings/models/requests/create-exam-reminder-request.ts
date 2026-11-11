import { ReminderIntervalUnit } from '../reminder-interval-unit';

export interface CreateExamReminderRequest {
  examTypeCode: string;
  intervalValue: number;
  intervalUnit: ReminderIntervalUnit;
}
