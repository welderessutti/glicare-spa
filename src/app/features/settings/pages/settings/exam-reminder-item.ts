import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
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
import { ExamReminder } from '../../models/exam-reminder';
import {
  REMINDER_INTERVAL_OPTIONS,
  ReminderIntervalUnit,
} from '../../models/reminder-interval-unit';
import { UpdateExamReminderRequest } from '../../models/requests/update-exam-reminder-request';
import { ExamRemindersService } from '../../services/exam-reminders-service';

@Component({
  selector: 'app-exam-reminder-item',
  imports: [FormField, FormRoot],
  templateUrl: './exam-reminder-item.html',
})
export class ExamReminderItem {
  readonly reminder = input.required<ExamReminder>();
  readonly deleting = input(false);
  readonly saved = output<ExamReminder>();
  readonly deleteRequested = output<HTMLButtonElement>();

  private readonly service = inject(ExamRemindersService);
  private readonly editModel = linkedSignal<{
    enabled: boolean;
    intervalValue: number | null;
    intervalUnit: ReminderIntervalUnit;
  }>(() => ({
    enabled: this.reminder().enabled,
    intervalValue: this.reminder().intervalValue,
    intervalUnit: this.reminder().intervalUnit,
  }));

  protected readonly intervalOptions = REMINDER_INTERVAL_OPTIONS;
  protected readonly error = signal('');
  protected readonly feedback = signal('');
  protected readonly editForm = form(
    this.editModel,
    (path) => {
      disabled(path, { when: () => this.deleting() });
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
          if (this.deleting() || model.intervalValue === null) return;
          const request: UpdateExamReminderRequest = {
            enabled: model.enabled,
            intervalValue: model.intervalValue,
            intervalUnit: model.intervalUnit,
          };
          this.error.set('');
          this.feedback.set('');
          try {
            const updated = await firstValueFrom(
              this.service.updateById(this.reminder().id, request),
            );
            this.editForm().reset({
              enabled: updated.enabled,
              intervalValue: updated.intervalValue,
              intervalUnit: updated.intervalUnit,
            });
            this.saved.emit(updated);
            this.feedback.set('Reminder updated.');
          } catch {
            this.error.set('Unable to update reminder. Please try again.');
          }
        },
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );
}
