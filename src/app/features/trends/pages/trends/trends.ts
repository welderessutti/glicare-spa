import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  linkedSignal,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ExamResultDefinition } from '../../../records/models/exam-result-definition';
import { ExamType } from '../../../records/models/exam-type';
import { ExamTypesService } from '../../../records/services/exam-types-service';
import { SettingsService } from '../../../settings/services/settings-service';
import { catchError, finalize, forkJoin, of, Subscription } from 'rxjs';
import { TrendPoint } from '../../models/trend-point';
import { TrendResponse } from '../../models/trend-response';
import { TrendsService } from '../../services/trends-service';

@Component({
  imports: [DatePipe, DecimalPipe],
  selector: 'app-trends',
  styleUrl: './trends.css',
  templateUrl: './trends.html',
})
export class Trends implements OnInit, OnDestroy {
  private readonly trendsService = inject(TrendsService);
  private readonly examTypesService = inject(ExamTypesService);
  private readonly settingsService = inject(SettingsService);

  private optionsRequest: Subscription | undefined;
  private definitionsRequest: Subscription | undefined;
  private trendRequest: Subscription | undefined;
  private readonly trendResponse = signal<TrendResponse | null>(null);

  protected readonly examTypes = signal<ExamType[]>([]);
  protected readonly selectedExamType = signal('');
  protected readonly loadingOptions = signal(false);
  protected readonly loadOptionsError = signal('');
  protected readonly loadingTrend = signal(false);
  protected readonly loadTrendError = signal('');
  protected readonly definitions = signal<ExamResultDefinition[]>([]);
  protected readonly loadingDefinitions = signal(false);
  protected readonly loadDefinitionsError = signal('');

  protected readonly selectedExam = computed(
    () =>
      this.trendResponse()?.examType ??
      this.examTypes().find((type) => type.code === this.selectedExamType()),
  );
  protected readonly selectedResultDefinitionCode = linkedSignal(
    () => this.definitions()[0]?.code ?? '',
  );
  protected readonly selectedResultDefinition = computed(
    () =>
      this.trendResponse()?.resultDefinition ??
      this.definitions().find(
        (definition) => definition.code === this.selectedResultDefinitionCode(),
      ),
  );
  protected readonly trendPoints = computed<TrendPoint[]>(() =>
    (this.trendResponse()?.points ?? []).filter(
      (point) => Number.isFinite(point.value) && Number.isFinite(Date.parse(point.examDate)),
    ),
  );

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

  ngOnDestroy(): void {
    this.optionsRequest?.unsubscribe();
    this.definitionsRequest?.unsubscribe();
    this.trendRequest?.unsubscribe();
  }

  protected loadOptions(): void {
    if (this.loadingOptions()) return;
    this.loadingOptions.set(true);
    this.loadOptionsError.set('');
    this.optionsRequest = forkJoin({
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
          this.loadDefinitions();
        },
        error: () => {
          this.loadOptionsError.set('Unable to load exam types.');
        },
      });
  }

  protected selectExamType(value: string): void {
    if (
      this.loadingOptions() ||
      !!this.loadOptionsError() ||
      value === this.selectedExamType() ||
      !this.examTypes().some((type) => type.code === value)
    )
      return;
    this.selectedExamType.set(value);
    this.loadDefinitions();
  }

  protected selectResultDefinition(value: string): void {
    if (
      this.loadingDefinitions() ||
      value === this.selectedResultDefinitionCode() ||
      !this.definitions().some((definition) => definition.code === value)
    )
      return;
    this.selectedResultDefinitionCode.set(value);
    this.loadTrend();
  }

  private clearTrend(): void {
    this.trendRequest?.unsubscribe();
    this.trendResponse.set(null);
    this.loadingTrend.set(false);
    this.loadTrendError.set('');
  }

  protected loadDefinitions(): void {
    this.definitionsRequest?.unsubscribe();
    this.clearTrend();
    this.definitions.set([]);
    this.loadDefinitionsError.set('');
    const type = this.selectedExamType();
    if (!type) return;
    this.loadingDefinitions.set(true);
    this.definitionsRequest = this.examTypesService
      .getResultDefinitions(type)
      .pipe(finalize(() => this.loadingDefinitions.set(false)))
      .subscribe({
        next: (definitions) => {
          this.definitions.set(definitions);
          if (definitions.length) this.loadTrend();
        },
        error: () => {
          this.loadDefinitionsError.set('Unable to load result fields.');
        },
      });
  }

  protected loadTrend(): void {
    const type = this.selectedExamType();
    const definition = this.selectedResultDefinitionCode();
    if (!type || !this.definitions().some((item) => item.code === definition)) return;
    this.clearTrend();
    this.loadingTrend.set(true);
    this.trendRequest = this.trendsService
      .get(type, definition)
      .pipe(finalize(() => this.loadingTrend.set(false)))
      .subscribe({
        next: (response) => this.trendResponse.set(response),
        error: () => {
          this.loadTrendError.set('Unable to load trend data.');
        },
      });
  }
}
