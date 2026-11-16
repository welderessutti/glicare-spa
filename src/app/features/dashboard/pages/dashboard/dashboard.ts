import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_NAVIGATION } from '../../../../core/config/app-navigation';
import { SessionService } from '../../../../core/services/session/session-service';
import { ExamRecord } from '../../../records/models/exam-record';
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
  private readonly records = signal<ExamRecord[]>([]);

  protected readonly appNavigation = APP_NAVIGATION;
  protected readonly latestRecord = computed(() => this.records()[0] ?? null);
  protected readonly recentRecords = computed(() => this.records().slice(1, 6));
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
    this.examRecordsService
      .getAll({
        page: 0,
        size: 6,
        sortBy: 'examDate',
        sortDirection: 'desc',
      })
      .subscribe({
        next: (records) => {
          this.records.set(records);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('Unable to load your dashboard.');
          this.loading.set(false);
        },
      });
  }
}
