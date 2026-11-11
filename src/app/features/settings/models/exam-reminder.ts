import { ExamTypeReference } from '../../records/models/exam-type-reference';
import { ReminderIntervalUnit } from './reminder-interval-unit';

export interface ExamReminder {
  id: string;
  examType: ExamTypeReference;
  enabled: boolean;
  intervalValue: number;
  intervalUnit: ReminderIntervalUnit;
}
