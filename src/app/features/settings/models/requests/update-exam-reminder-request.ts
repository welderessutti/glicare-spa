import { ReminderIntervalUnit } from '../reminder-interval-unit';

export interface UpdateExamReminderRequest {
  enabled: boolean;
  intervalValue: number;
  intervalUnit: ReminderIntervalUnit;
}
