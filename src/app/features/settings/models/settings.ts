import { ExamTypeCode } from '../../records/models/exam-type-code';

export interface Settings {
  defaultTrendsExam: ExamTypeCode;
  language: 'en';
  hba1cReminderEnabled: boolean;
  hba1cReminderInterval: number;
  glucoseReminderEnabled: boolean;
  glucoseReminderInterval: number;
}
