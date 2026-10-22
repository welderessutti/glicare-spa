export type ExamTypeCode = 'GLU' | 'HBA1C';

export const EXAM_UI_CONFIG = {
  HBA1C: {
    label: 'Hemoglobin A1c',
    resultLabel: 'Result',
    unit: '%',
    step: 0.1,
    decimals: 1,
    resultHint: 'Enter the hemoglobin A1c percentage shown on your lab report, for example, 6.5.',
    maxValue: 100,
  },
  GLU: {
    label: 'Blood Glucose',
    resultLabel: 'Result',
    unit: 'mg/dL',
    step: 1,
    decimals: 0,
    resultHint: 'Enter the blood glucose value in mg/dL shown on your lab report, for example, 90.',
    maxValue: 1000,
  },
} satisfies Record<
  ExamTypeCode,
  {
    label: string;
    resultLabel: string;
    unit: string;
    step: number;
    decimals: number;
    resultHint: string;
    maxValue: number;
  }
>;
