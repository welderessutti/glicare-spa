import { Component, inject, OnInit, signal } from '@angular/core';
import { disabled, form, FormField, FormRoot } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EXAM_UI_CONFIG } from '../../../records/models/exam-type-code';
import { Settings as SettingsModel } from '../../models/settings';
import { UpdateSettingsRequest } from '../../models/requests/update-settings-request';
import { SettingsService } from '../../services/settings-service';

@Component({
  imports: [FormField, FormRoot],
  selector: 'app-settings',
  styleUrl: './settings.css',
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly settingsModel = signal<SettingsModel>({
    defaultTrendsExam: 'HBA1C',
    language: 'en',
    hba1cReminderEnabled: false,
    hba1cReminderInterval: 1,
    glucoseReminderEnabled: false,
    glucoseReminderInterval: 1,
  });

  protected readonly examUi = EXAM_UI_CONFIG;
  protected readonly examTypes = Object.entries(EXAM_UI_CONFIG);
  protected readonly reminderIntervals = [1, 2, 3, 6, 12];
  protected readonly settings = signal<SettingsModel | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly updateError = signal('');
  protected readonly feedback = signal('');

  protected readonly settingsForm = form(
    this.settingsModel,
    (path) => {
      disabled(path.hba1cReminderInterval, {
        when: ({ valueOf }) => !valueOf(path.hba1cReminderEnabled),
      });
      disabled(path.glucoseReminderInterval, {
        when: ({ valueOf }) => !valueOf(path.glucoseReminderEnabled),
      });
    },
    {
      submission: {
        action: async (field) => {
          this.updateError.set('');
          this.feedback.set('');
          const request: UpdateSettingsRequest = field().value();
          try {
            const updated = await firstValueFrom(this.settingsService.update(request));
            this.settings.set(updated);
            this.settingsForm().reset(updated);
            this.feedback.set('Settings updated.');
          } catch {
            this.updateError.set('Unable to update your settings. Please try again.');
          }
        },
      },
    },
  );

  ngOnInit(): void {
    this.loadSettings();
  }

  protected loadSettings(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.settingsService.get().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.settingsForm().reset(settings);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load your settings.');
        this.loading.set(false);
      },
    });
  }
}
