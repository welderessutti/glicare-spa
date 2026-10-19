import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  imports: [DatePipe],
  selector: 'app-records',
  styleUrl: './records.css',
  templateUrl: './records.html',
})
export class Records {
  private readonly injector = inject(Injector);
  private readonly resultInput = viewChild<ElementRef<HTMLInputElement>>('resultInput');
  private nextRecordId = 4;

  protected readonly results = signal([
    { id: 1, result: 6.5, examDate: '2026-10-10' },
    { id: 2, result: 6.8, examDate: '2026-07-08' },
    { id: 3, result: 7.1, examDate: '2026-04-04' },
  ]);
  protected readonly addFormOpen = signal(false);
  protected readonly editingRecordId = signal<number | null>(null);
  protected readonly deletingRecordId = signal<number | null>(null);
  protected readonly feedback = signal('');
  protected readonly sortedResults = computed(() =>
    [...this.results()].sort((a, b) => b.examDate.localeCompare(a.examDate)),
  );
  protected readonly resultToDelete = computed(() =>
    this.results().find((record) => record.id === this.deletingRecordId()),
  );

  protected openAddForm(): void {
    this.editingRecordId.set(null);
    this.addFormOpen.set(true);
    this.feedback.set('');
    this.focusResultInput();
  }

  protected openEditForm(id: number): void {
    this.addFormOpen.set(false);
    this.editingRecordId.set(id);
    this.feedback.set('');
    this.focusResultInput();
  }

  protected closeForm(trigger: HTMLElement): void {
    this.addFormOpen.set(false);
    this.editingRecordId.set(null);
    afterNextRender({ write: () => trigger.focus() }, { injector: this.injector });
  }

// TODO: VERIFICAR O USO DO FORMULÁRIO AQUI, USAR SIGNAL FORM?
  protected saveResult(
    event: Event,
    form: HTMLFormElement,
    trigger: HTMLElement,
    recordId?: number,
  ): void {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const record = {
      id: recordId ?? this.nextRecordId++,
      result: Number(fields.get('result')),
      examDate: String(fields.get('examDate')),
    };

    this.results.update((results) =>
      recordId === undefined
        ? [...results, record]
        : results.map((current) => (current.id === recordId ? record : current)),
    );
    this.feedback.set(
      recordId === undefined
        ? 'Result added to this demo. Changes reset when you reload.'
        : 'Result updated in this demo. Changes reset when you reload.',
    );
    this.closeForm(trigger);
  }

  protected requestDelete(id: number, dialog: HTMLDialogElement): void {
    this.deletingRecordId.set(id);
    afterNextRender({ write: () => dialog.showModal() }, { injector: this.injector });
  }

  protected confirmDelete(dialog: HTMLDialogElement, resultsHeading: HTMLElement): void {
    const id = this.deletingRecordId();
    if (id === null) return;

    this.results.update((results) => results.filter((record) => record.id !== id));
    if (this.editingRecordId() === id) this.editingRecordId.set(null);
    this.feedback.set('Result deleted from this demo. Changes reset when you reload.');
    dialog.close();
    afterNextRender({ write: () => resultsHeading.focus() }, { injector: this.injector });
  }

  private focusResultInput(): void {
    afterNextRender(
      { write: () => this.resultInput()?.nativeElement.focus() },
      { injector: this.injector },
    );
  }
}
