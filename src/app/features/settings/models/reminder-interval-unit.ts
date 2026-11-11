export type ReminderIntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export const REMINDER_INTERVAL_OPTIONS = [
  { value: 'DAY', label: 'Days' },
  { value: 'WEEK', label: 'Weeks' },
  { value: 'MONTH', label: 'Months' },
  { value: 'YEAR', label: 'Years' },
] satisfies { value: ReminderIntervalUnit; label: string }[];
