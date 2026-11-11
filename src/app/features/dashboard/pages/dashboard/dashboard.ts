import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { APP_NAVIGATION } from '../../../../core/config/app-navigation';
import { SessionService } from '../../../../core/services/session/session-service';
import { ExamRecord } from '../../../records/models/exam-record';
import { EXAM_UI_CONFIG } from '../../../records/models/exam-type-code';
import { ExamRecordsService } from '../../../records/services/exam-records-service';

@Component({
  imports: [DatePipe, DecimalPipe, RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly sessionService = inject(SessionService);
  private readonly examRecordsService = inject(ExamRecordsService);

  protected readonly appNavigation = APP_NAVIGATION;
  // Keep the existing lookup behavior until Dashboard migrates to the catalog.
  protected readonly examUi: typeof EXAM_UI_CONFIG &
    Record<string, (typeof EXAM_UI_CONFIG)[keyof typeof EXAM_UI_CONFIG]> = EXAM_UI_CONFIG;
  protected readonly latestHba1c = signal<ExamRecord | null>(null);
  protected readonly latestGlucose = signal<ExamRecord | null>(null);
  protected readonly recentRecords = signal<ExamRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');

  protected readonly greeting = computed(() => {
    const firstName = this.sessionService.user()?.fullName.trim().split(/\s+/)[0];
    return firstName ? `Hello, ${firstName}` : 'Welcome back';
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected loadDashboard(): void {
    this.loading.set(true);
    this.loadError.set('');
    forkJoin({
      latestHba1c: this.examRecordsService.getAll({
        type: 'HBA1C',
        page: 0,
        size: 1,
        sortBy: 'examDate',
        sortDirection: 'desc',
      }),
      latestGlucose: this.examRecordsService.getAll({
        type: 'GLU',
        page: 0,
        size: 1,
        sortBy: 'examDate',
        sortDirection: 'desc',
      }),
      recentRecords: this.examRecordsService.getAll({
        page: 0,
        size: 5,
        sortBy: 'examDate',
        sortDirection: 'desc',
      }),
    }).subscribe({
      next: ({ latestHba1c, latestGlucose, recentRecords }) => {
        this.latestHba1c.set(latestHba1c[0] ?? null);
        this.latestGlucose.set(latestGlucose[0] ?? null);
        this.recentRecords.set(recentRecords.slice(0, 5));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load your dashboard.');
        this.loading.set(false);
      },
    });
  }
}
