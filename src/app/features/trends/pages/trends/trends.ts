import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ExamRecord } from '../../../records/models/exam-record';
import { ExamTypeCode, EXAM_UI_CONFIG } from '../../../records/models/exam-type-code';
import { ExamRecordsService } from '../../../records/services/exam-records-service';
import { finalize } from 'rxjs';

@Component({
  imports: [DatePipe, DecimalPipe],
  selector: 'app-trends',
  styleUrl: './trends.css',
  templateUrl: './trends.html',
})
export class Trends implements OnInit {
  private readonly examRecordsService = inject(ExamRecordsService);

  protected readonly examTypes = Object.entries(EXAM_UI_CONFIG);
  protected readonly records = signal<ExamRecord[]>([]);
  protected readonly selectedExamType = signal<ExamTypeCode>('HBA1C');
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');

  protected readonly selectedUi = computed(() => EXAM_UI_CONFIG[this.selectedExamType()]);
  protected readonly selectedRecords = computed(() =>
    this.records().filter((record) => record.examType.code === this.selectedExamType()),
  );

  protected readonly summary = computed(() => {
    const records = this.selectedRecords();
    const latest = records.at(-1)?.examResults[0]?.value ?? null;
    const previous = records.at(-2)?.examResults[0]?.value ?? null;
    const decimals = this.selectedUi().decimals;

    return {
      latest,
      previous,
      change:
        latest !== null && previous !== null ? Number((latest - previous).toFixed(decimals)) : null,
    };
  });

  protected readonly chart = computed(() => {
    const records = this.selectedRecords();
    if (!records.length) return null;

    const values = records.map((record) => record.examResults[0].value);
    const step = this.selectedUi().step;
    const minimum = Math.min(...values) - step;
    const maximum = Math.max(...values) + step;
    const firstDate = records[0].examDate;
    const lastDate = records[records.length - 1].examDate;
    const start = Date.parse(firstDate);
    const duration = Date.parse(lastDate) - start;
    const points = records.map((record) => ({
      id: record.id,
      x: duration ? 12 + ((Date.parse(record.examDate) - start) / duration) * 616 : 320,
      y: 228 - ((record.examResults[0].value - minimum) / (maximum - minimum)) * 216,
    }));

    return {
      minimum,
      maximum,
      firstDate,
      lastDate,
      points,
      line: points.map((point) => `${point.x},${point.y}`).join(' '),
    };
  });

  ngOnInit(): void {
    this.loadRecords();
  }

  protected selectExamType(value: string): void {
    if (value !== 'HBA1C' && value !== 'GLU') return;
    this.selectedExamType.set(value);
  }

  protected loadRecords(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.examRecordsService
      .getAll({ sortBy: 'examDate', sortDirection: 'asc' })
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (records) => {
          this.records.set(records);
        },
        error: () => {
          this.loadError.set('Unable to load records.');
        },
      });
  }
}
