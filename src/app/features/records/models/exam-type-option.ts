import { ExamType } from './exam-type';

export type ExamTypeOption = Pick<ExamType, 'id' | 'code' | 'name' | 'active'>;
