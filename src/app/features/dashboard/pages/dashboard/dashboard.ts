import { Component, computed, inject } from '@angular/core';
import { SessionService } from '../../../../core/services/session/session-service';

@Component({
  selector: 'app-dashboard',
  host: { class: 'block min-w-0' },
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly sessionService = inject(SessionService);

  protected readonly greeting = computed(() => {
    const firstName = this.sessionService.user()?.fullName.trim().split(/\s+/)[0];
    return firstName ? `Hello, ${firstName}` : 'Welcome back';
  });

  // Temporary preview data until records are available from the backend.
  protected readonly recentRecords = [
    { date: 'Today', time: '08:42', label: 'Blood glucose', value: '104', unit: 'mg/dL' },
    { date: 'Yesterday', time: '09:10', label: 'Blood glucose', value: '118', unit: 'mg/dL' },
    { date: 'Oct 12', time: '07:30', label: 'Blood pressure', value: '120/80', unit: 'mmHg' },
    { date: 'Oct 11', time: '08:15', label: 'Blood glucose', value: '109', unit: 'mg/dL' },
  ] as const;
}
