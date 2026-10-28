import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  afterNextRender,
  ElementRef,
  Injector,
  viewChild,
} from '@angular/core';
import { form, FormField, FormRoot, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ExamRecord } from '../../models/exam-record';
import { ExamTypeCode, EXAM_UI_CONFIG } from '../../models/exam-type-code';
import { CreateExamRecordRequest } from '../../models/requests/create-exam-record-request';
import { UpdateExamRecordRequest } from '../../models/requests/update-exam-record-request';
import { ExamRecordsService } from '../../services/exam-records-service';

@Component({
  imports: [DatePipe, FormField, FormRoot],
  selector: 'app-records',
  styleUrl: './records.css',
  templateUrl: './records.html',
})
export class Records implements OnInit {
  private readonly examRecordsService = inject(ExamRecordsService);
  private readonly createExamRecordModel = signal<{
    examTypeCode: ExamTypeCode | '';
    value: number | null;
    examDate: string;
  }>({ examTypeCode: '', value: null, examDate: '' });
  private readonly updateExamRecordModel = signal<{ value: number | null; examDate: string }>({
    value: null,
    examDate: '',
  });

  // TODO - TALVEZ REMOVER examUi POIS NÃO ESTÁ SENDO UTILIZADO!
  protected readonly examUi = EXAM_UI_CONFIG;
  protected readonly examTypes = Object.entries(EXAM_UI_CONFIG);
  protected readonly records = signal<ExamRecord[]>([]);
  protected readonly loadingExamRecords = signal(false);
  protected readonly loadExamRecordsErrorMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly createExamRecordFormOpen = signal(false);
  protected readonly editingExamRecord = signal<ExamRecord | null>(null);
  protected readonly examRecordToDelete = signal<ExamRecord | null>(null);
  protected readonly deleting = signal(false);
  protected readonly createUi = computed(() => {
    const code = this.createExamRecordModel().examTypeCode;
    return code ? EXAM_UI_CONFIG[code] : null;
  });
  private readonly injector = inject(Injector);
  private readonly addButton = viewChild<ElementRef<HTMLButtonElement>>('addButton');

  protected readonly examTypeCodeInvalid = computed(
    () =>
      this.createExamRecordForm.examTypeCode().touched() &&
      this.createExamRecordForm.examTypeCode().invalid(),
  );

  protected readonly examValueInvalid = computed(
    () =>
      this.createExamRecordForm.value().touched() && this.createExamRecordForm.value().invalid(),
  );

  protected readonly examDateInvalid = computed(
    () =>
      this.createExamRecordForm.examDate().touched() &&
      this.createExamRecordForm.examDate().invalid(),
  );

  protected readonly examResultValueInvalid = computed(
    () => this.editExamRecordForm.value().touched() && this.editExamRecordForm.value().invalid(),
  );

  protected readonly examRecordDateInvalid = computed(
    () =>
      this.editExamRecordForm.examDate().touched() && this.editExamRecordForm.examDate().invalid(),
  );

  protected readonly createExamRecordForm = form(
    this.createExamRecordModel,
    (path) => {
      required(path.examTypeCode, { message: 'Choose an exam type.' });
      required(path.value, { message: 'Enter the result.' });
      validate(path.value, ({ value }) => {
        const result = value();
        const examType = this.createExamRecordModel().examTypeCode;

        if (result === null) {
          return null;
        }

        if (result <= 0) {
          return {
            kind: 'positive',
            message: 'Enter a value greater than zero.',
          };
        }

        if (examType === 'GLU' && !Number.isInteger(result)) {
          return {
            kind: 'integer',
            message: 'Blood glucose must be entered as a whole number.',
          };
        }

        if (examType === 'HBA1C' && !Number.isInteger(result * 10)) {
          return {
            kind: 'decimalPlaces',
            message: 'Hemoglobin A1c can have one decimal place.',
          };
        }

        return null;
      });
      required(path.examDate, { message: 'Enter the exam date.' });
    },
    {
      submission: {
        action: async (field) => {
          const { examTypeCode, value, examDate } = field().value();
          if (!examTypeCode || value === null) return;
          this.errorMessage.set('');
          const request: CreateExamRecordRequest = {
            examTypeCode,
            examDate,
            examResults: [{ label: EXAM_UI_CONFIG[examTypeCode].resultLabel, value }],
          };
          try {
            const record = await firstValueFrom(this.examRecordsService.create(request));
            this.records.update((records) => [record, ...records]);
            this.createExamRecordFormOpen.set(false);
            this.createExamRecordForm().reset({ examTypeCode: '', value: null, examDate: '' });
          } catch {
            this.errorMessage.set('Unable to save record.');
          }
        },
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  protected readonly editExamRecordForm = form(
    this.updateExamRecordModel,
    (path) => {
      required(path.value, { message: 'Enter the result.' });
      required(path.examDate, { message: 'Enter the exam date.' });
    },
    {
      submission: {
        action: async (field) => {
          const record = this.editingExamRecord();
          const { value, examDate } = field().value();
          if (!record || value === null) return;
          this.errorMessage.set('');
          const request: UpdateExamRecordRequest = {
            examDate,
            examResults: [{ id: record.examResults[0].id, value }],
          };
          try {
            const updated = await firstValueFrom(
              this.examRecordsService.updateById(record.id, request),
            );
            this.records.update((records) =>
              records.map((current) => (current.id === updated.id ? updated : current)),
            );
            this.editingExamRecord.set(null);
            this.editExamRecordForm().reset({ value: null, examDate: '' });
          } catch {
            this.errorMessage.set('Unable to update record.');
          }
        },
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  ngOnInit(): void {
    this.loadRecords();
  }

  protected loadRecords(): void {
    this.loadingExamRecords.set(true);
    this.loadExamRecordsErrorMessage.set('');
    this.examRecordsService.getAll().subscribe({
      next: (records) => {
        this.records.set(records);
        this.loadingExamRecords.set(false);
      },
      error: () => {
        this.loadExamRecordsErrorMessage.set('Unable to load records.');
        this.loadingExamRecords.set(false);
      },
    });
  }

  protected openCreateExamRecordForm(): void {
    this.createExamRecordForm().reset({ examTypeCode: '', value: null, examDate: '' });
    this.errorMessage.set('');
    this.createExamRecordFormOpen.set(true);
    if (this.editingExamRecord) this.editingExamRecord.set(null);
  }

  protected closeCreateExamRecordFormWithFocus(): void {
    this.createExamRecordFormOpen.set(false);

    afterNextRender(
      {
        write: () => {
          this.addButton()?.nativeElement.focus();
        },
      },
      {
        injector: this.injector,
      },
    );
  }

  protected openEditExamRecordForm(record: ExamRecord): void {
    this.editExamRecordForm().reset({
      value: record.examResults[0].value,
      examDate: record.examDate,
    });
    this.errorMessage.set('');
    this.editingExamRecord.set(record);
    if (this.createExamRecordFormOpen) this.createExamRecordFormOpen.set(false);
  }

  protected closeEditExamRecordFormWithFocus(editButton: HTMLButtonElement): void {
    this.editingExamRecord.set(null);
    editButton.focus();
  }

  protected requestDeleteExamRecord(record: ExamRecord, dialog: HTMLDialogElement): void {
    this.examRecordToDelete.set(record);
    this.errorMessage.set('');
    dialog.showModal();
  }

  protected confirmDelete(dialog: HTMLDialogElement): void {
    const record = this.examRecordToDelete();
    if (!record || this.deleting()) return;
    this.deleting.set(true);
    this.errorMessage.set('');
    this.examRecordsService.deleteById(record.id).subscribe({
      next: () => {
        this.records.update((records) => records.filter((current) => current.id !== record.id));
        if (this.editingExamRecord()?.id === record.id) this.editingExamRecord.set(null);
        this.deleting.set(false);
        dialog.close();
        this.examRecordToDelete.set(null);
      },
      error: () => {
        this.deleting.set(false);
        this.errorMessage.set('Unable to delete record.');
      },
    });
  }
}
