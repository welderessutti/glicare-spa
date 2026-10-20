export type ExamTypeCode = 'GLU' | 'HBA1C';

export const EXAM_UI_CONFIG = {
  HBA1C: {
    label: 'Hemoglobin A1c',
    resultLabel: 'Result',
    unit: '%',
  },
  GLU: {
    label: 'Blood Glucose',
    resultLabel: 'Result',
    unit: 'mg/dL',
  },
} satisfies Record<
  ExamTypeCode,
  {
    label: string;
    resultLabel: string;
    unit: string;
  }
>;
