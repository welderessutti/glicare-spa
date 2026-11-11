import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import {
  disabled,
  form,
  FormField,
  FormRoot,
  min,
  required,
  validate,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ExamType } from '../../../records/models/exam-type';
import { ExamTypesService } from '../../../records/services/exam-types-service';
import { ExamReminder } from '../../models/exam-reminder';
import {
  REMINDER_INTERVAL_OPTIONS,
  ReminderIntervalUnit,
} from '../../models/reminder-interval-unit';
import { Settings as SettingsModel } from '../../models/settings';
import { CreateExamReminderRequest } from '../../models/requests/create-exam-reminder-request';
import { UpdateSettingsRequest } from '../../models/requests/update-settings-request';
import { ExamRemindersService } from '../../services/exam-reminders-service';
import { SettingsService } from '../../services/settings-service';
import { ExamReminderItem } from './exam-reminder-item';

@Component({
  imports: [FormField, FormRoot, ExamReminderItem],
  selector: 'app-settings',
  styleUrl: './settings.css',
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly examTypesService = inject(ExamTypesService);
  private readonly remindersService = inject(ExamRemindersService);
  private readonly injector = inject(Injector);
  private readonly settingsModel = signal<SettingsModel>({ defaultTrendsExam: '', language: 'en' });
  private readonly examCatalog = signal<ExamType[]>([]);
  private readonly createReminderModel = signal<{
    examTypeCode: string;
    intervalValue: number | null;
    intervalUnit: ReminderIntervalUnit;
  }>({ examTypeCode: '', intervalValue: null, intervalUnit: 'MONTH' });
  private readonly addButton = viewChild<ElementRef<HTMLButtonElement>>('addButton');
  private readonly createExamSelect = viewChild<ElementRef<HTMLSelectElement>>('createExamSelect');
  private readonly remindersTitle = viewChild<ElementRef<HTMLHeadingElement>>('remindersTitle');
  private deleteTrigger: HTMLButtonElement | undefined;

  protected readonly settings = signal<SettingsModel | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly updateError = signal('');
  protected readonly feedback = signal('');
  protected readonly loadingCatalog = signal(false);
  protected readonly catalogError = signal('');
  protected readonly loadingReminders = signal(false);
  protected readonly remindersError = signal('');
  protected readonly reminders = signal<ExamReminder[]>([]);
  protected readonly createReminderOpen = signal(false);
  protected readonly createReminderError = signal('');
  protected readonly reminderFeedback = signal('');
  protected readonly reminderToDelete = signal<ExamReminder | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal('');
  protected readonly intervalOptions = REMINDER_INTERVAL_OPTIONS;
  protected readonly activeExamTypes = computed(() =>
    this.examCatalog().filter((type) => type.active),
  );
  protected readonly unavailableDefault = computed(() => {
    const code = this.settingsModel().defaultTrendsExam;
    if (!code || this.activeExamTypes().some((type) => type.code === code)) return null;
    return {
      code,
      name:
        this.examCatalog().find((type) => type.code === code)?.name ??
        'Current selection (unavailable)',
    };
  });
  protected readonly availableReminderTypes = computed(() => {
    const usedCodes = new Set(this.reminders().map((reminder) => reminder.examType.code));
    return this.activeExamTypes().filter((type) => !usedCodes.has(type.code));
  });
  protected readonly canAddReminder = computed(
    () =>
      !this.loadingCatalog() &&
      !this.catalogError() &&
      !this.loadingReminders() &&
      !this.remindersError() &&
      this.availableReminderTypes().length > 0,
  );

  protected readonly settingsForm = form(
    this.settingsModel,
    (path) => {
      required(path.defaultTrendsExam, { message: 'Choose a default exam.' });
      disabled(path.defaultTrendsExam, {
        when: () =>
          this.loadingCatalog() || !!this.catalogError() || !this.activeExamTypes().length,
      });
    },
    {
      submission: {
        action: async (field) => {
          const model = field().value();
          if (!model.defaultTrendsExam) return;
          const request: UpdateSettingsRequest = {
            defaultTrendsExam: model.defaultTrendsExam,
            language: model.language,
          };
          this.updateError.set('');
          this.feedback.set('');
          try {
            const updated = await firstValueFrom(this.settingsService.update(request));
            this.settings.set(updated);
            this.settingsForm().reset({
              defaultTrendsExam: updated.defaultTrendsExam,
              language: updated.language,
            });
            this.feedback.set('Settings updated.');
          } catch {
            this.updateError.set('Unable to update your settings. Please try again.');
          }
        },
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  protected readonly createReminderForm = form(
    this.createReminderModel,
    (path) => {
      disabled(path, { when: () => !this.canAddReminder() });
      required(path.examTypeCode, { message: 'Choose an exam.' });
      required(path.intervalValue, { message: 'Enter an interval.' });
      min(path.intervalValue, 1, { message: 'Enter a whole number greater than zero.' });
      required(path.intervalUnit, { message: 'Choose an interval unit.' });
      validate(path.intervalValue, ({ value }) => {
        const interval = value();
        return interval !== null && interval >= 1 && !Number.isInteger(interval)
          ? { kind: 'positiveInteger', message: 'Enter a whole number greater than zero.' }
          : null;
      });
    },
    {
      submission: {
        action: async (field) => {
          const model = field().value();
          if (
            !this.canAddReminder() ||
            model.intervalValue === null ||
            !this.availableReminderTypes().some((type) => type.code === model.examTypeCode)
          )
            return;
          const request: CreateExamReminderRequest = {
            examTypeCode: model.examTypeCode,
            intervalValue: model.intervalValue,
            intervalUnit: model.intervalUnit,
          };
          this.createReminderError.set('');
          this.reminderFeedback.set('');
          try {
            const created = await firstValueFrom(this.remindersService.create(request));
            this.reminders.update((reminders) => [created, ...reminders]);
            this.closeCreateReminder();
            this.createReminderForm().reset({
              examTypeCode: '',
              intervalValue: null,
              intervalUnit: 'MONTH',
            });
            this.reminderFeedback.set('Reminder added.');
          } catch {
            this.createReminderError.set('Unable to add reminder. Please try again.');
          }
        },
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  ngOnInit(): void {
    this.loadSettings();
    this.loadExamTypes();
    this.loadReminders();
  }

  protected loadSettings(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.settingsService.get().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.settingsForm().reset({
          defaultTrendsExam: settings.defaultTrendsExam,
          language: settings.language,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load your settings.');
        this.loading.set(false);
      },
    });
  }

  protected loadExamTypes(): void {
    this.loadingCatalog.set(true);
    this.catalogError.set('');
    this.examTypesService.getAll().subscribe({
      next: (types) => {
        this.examCatalog.set(types);
        this.loadingCatalog.set(false);
      },
      error: () => {
        this.catalogError.set('Unable to load exam types.');
        this.loadingCatalog.set(false);
      },
    });
  }

  protected loadReminders(): void {
    this.loadingReminders.set(true);
    this.remindersError.set('');
    this.remindersService.getAll().subscribe({
      next: (reminders) => {
        this.reminders.set(reminders);
        this.loadingReminders.set(false);
      },
      error: () => {
        this.remindersError.set('Unable to load reminders.');
        this.loadingReminders.set(false);
      },
    });
  }

  protected openCreateReminder(): void {
    if (!this.canAddReminder()) return;
    this.createReminderForm().reset({
      examTypeCode: '',
      intervalValue: null,
      intervalUnit: 'MONTH',
    });
    this.createReminderError.set('');
    this.createReminderOpen.set(true);
    afterNextRender(() => this.createExamSelect()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  protected closeCreateReminder(): void {
    this.createReminderOpen.set(false);
    afterNextRender(
      () => {
        const button = this.addButton()?.nativeElement;
        if (button && !button.disabled) button.focus();
        else this.remindersTitle()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  protected reminderSaved(updated: ExamReminder): void {
    this.reminders.update((reminders) =>
      reminders.map((reminder) => (reminder.id === updated.id ? updated : reminder)),
    );
  }

  protected requestDeleteReminder(
    reminder: ExamReminder,
    trigger: HTMLButtonElement,
    dialog: HTMLDialogElement,
  ): void {
    this.deleteTrigger = trigger;
    this.reminderToDelete.set(reminder);
    this.deleteError.set('');
    dialog.showModal();
  }

  protected deleteDialogClosed(): void {
    this.reminderToDelete.set(null);
    this.deleteError.set('');
    afterNextRender(
      () => {
        if (this.deleteTrigger?.isConnected) this.deleteTrigger.focus();
        else this.remindersTitle()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  protected confirmDeleteReminder(dialog: HTMLDialogElement): void {
    const reminder = this.reminderToDelete();
    if (!reminder || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.remindersService.deleteById(reminder.id).subscribe({
      next: () => {
        this.reminders.update((reminders) =>
          reminders.filter((current) => current.id !== reminder.id),
        );
        this.deleting.set(false);
        dialog.close();
        this.reminderFeedback.set('Reminder deleted.');
      },
      error: () => {
        this.deleteError.set('Unable to delete reminder. Please try again.');
        this.deleting.set(false);
      },
    });
  }
}
