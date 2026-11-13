import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, linkedSignal, OnInit, signal } from '@angular/core';
import { ExamRecord } from '../../../records/models/exam-record';
import { ExamResultDefinition } from '../../../records/models/exam-result-definition';
import { ExamType } from '../../../records/models/exam-type';
import { ExamRecordsService } from '../../../records/services/exam-records-service';
import { ExamTypesService } from '../../../records/services/exam-types-service';
import { SettingsService } from '../../../settings/services/settings-service';
import { catchError, finalize, forkJoin, of } from 'rxjs';

@Component({
  imports: [DatePipe, DecimalPipe],
  selector: 'app-trends',
  styleUrl: './trends.css',
  templateUrl: './trends.html',
})
export class Trends implements OnInit {
  private readonly examRecordsService = inject(ExamRecordsService);
  private readonly examTypesService = inject(ExamTypesService);
  private readonly settingsService = inject(SettingsService);

  protected readonly examTypes = signal<ExamType[]>([]);
  protected readonly records = signal<ExamRecord[]>([]);
  protected readonly selectedExamType = signal('');
  protected readonly loadingOptions = signal(false);
  protected readonly loadOptionsError = signal('');
  protected readonly loading = signal(false);
  protected readonly loadRecordsError = signal('');
  protected readonly definitions = signal<ExamResultDefinition[]>([]);
  protected readonly loadingDefinitions = signal(false);
  protected readonly loadDefinitionsError = signal('');

  protected readonly selectedExam = computed(() =>
    this.examTypes().find((type) => type.code === this.selectedExamType()),
  );
  protected readonly selectedResultDefinitionCode = linkedSignal(
    () => this.definitions()[0]?.code ?? '',
  );
  protected readonly selectedResultDefinition = computed(() =>
    this.definitions().find(
      (definition) => definition.code === this.selectedResultDefinitionCode(),
    ),
  );
  protected readonly trendPoints = computed(() => {
    const definition = this.selectedResultDefinition();
    if (!definition) return [];
    return this.records().flatMap((record) => {
      const result = record.examResults.find(
        ({ resultDefinition }) => resultDefinition.code === definition.code,
      );
      return result && Number.isFinite(result.value) && Number.isFinite(Date.parse(record.examDate))
        ? [{ recordId: record.id, examDate: record.examDate, value: result.value }]
        : [];
    });
  });

  protected readonly summary = computed(() => {
    const points = this.trendPoints();
    const latest = points.at(-1)?.value ?? null;
    const previous = points.at(-2)?.value ?? null;

    return {
      latest,
      previous,
      change: latest !== null && previous !== null ? latest - previous : null,
    };
  });

  protected readonly chart = computed(() => {
    const data = this.trendPoints();
    if (!data.length) return null;

    const values = data.map((point) => point.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const range = rawMax - rawMin;
    const padding = range > 0 ? range * 0.1 : Math.abs(rawMin) * 0.1 || 1;
    const minimum = rawMin - padding;
    const maximum = rawMax + padding;
    const span = maximum - minimum;
    if (!Number.isFinite(span) || span <= 0) return null;
    const firstDate = data[0].examDate;
    const lastDate = data[data.length - 1].examDate;
    const start = Date.parse(firstDate);
    const duration = Date.parse(lastDate) - start;
    const points = data.map((point) => ({
      id: point.recordId,
      x: duration ? 12 + ((Date.parse(point.examDate) - start) / duration) * 616 : 320,
      y: 228 - ((point.value - minimum) / span) * 216,
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
    this.loadOptions();
  }

  protected loadOptions(): void {
    if (this.loadingOptions()) return;
    this.loadingOptions.set(true);
    this.loadOptionsError.set('');
    forkJoin({
      settings: this.settingsService.get().pipe(catchError(() => of(null))),
      types: this.examTypesService.getAll(),
    })
      .pipe(finalize(() => this.loadingOptions.set(false)))
      .subscribe({
        next: ({ settings, types }) => {
          this.examTypes.set(types);
          const selected =
            types.find((type) => type.code === settings?.defaultTrendsExam) ?? types[0];
          this.selectedExamType.set(selected?.code ?? '');
          this.loadRecords();
        },
        error: () => {
          this.loadOptionsError.set('Unable to load exam types.');
        },
      });
  }

  protected selectExamType(value: string): void {
    if (
      this.loadingOptions() ||
      this.loading() ||
      this.loadingDefinitions() ||
      value === this.selectedExamType() ||
      !this.examTypes().some((type) => type.code === value)
    )
      return;
    this.selectedExamType.set(value);
    this.loadRecords();
  }

  protected selectResultDefinition(value: string): void {
    if (
      value === this.selectedResultDefinitionCode() ||
      !this.definitions().some((definition) => definition.code === value)
    )
      return;
    this.selectedResultDefinitionCode.set(value);
  }

  protected loadRecords(): void {
    const type = this.selectedExamType();
    if (!type || this.loading() || this.loadingDefinitions()) return;
    this.records.set([]);
    this.definitions.set([]);
    this.loading.set(true);
    this.loadRecordsError.set('');
    this.loadDefinitionsError.set('');
    this.examRecordsService
      .getAll({ type, sortBy: 'examDate', sortDirection: 'asc' })
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (records) => {
          this.records.set(records.filter((record) => record.examType.code === type));
          if (this.records().length) this.loadDefinitions();
        },
        error: () => {
          this.loadRecordsError.set('Unable to load records.');
        },
      });
  }

  protected loadDefinitions(): void {
    const type = this.selectedExamType();
    if (!type || !this.records().length || this.loadingDefinitions()) return;
    this.definitions.set([]);
    this.loadingDefinitions.set(true);
    this.loadDefinitionsError.set('');
    this.examTypesService
      .getResultDefinitions(type)
      .pipe(finalize(() => this.loadingDefinitions.set(false)))
      .subscribe({
        next: (definitions) => this.definitions.set(definitions),
        error: () => {
          this.loadDefinitionsError.set('Unable to load result fields.');
        },
      });
  }
}
