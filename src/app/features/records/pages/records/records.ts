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
import { applyEach, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ExamRecord } from '../../models/exam-record';
import { ExamType } from '../../models/exam-type';
import { CreateExamRecordRequest } from '../../models/requests/create-exam-record-request';
import { CreateExamResultRequest } from '../../models/requests/create-exam-result-request';
import { UpdateExamRecordRequest } from '../../models/requests/update-exam-record-request';
import { ExamRecordsService } from '../../services/exam-records-service';
import { ExamTypesService } from '../../services/exam-types-service';

@Component({
  imports: [DatePipe, FormField, FormRoot],
  selector: 'app-records',
  styleUrl: './records.css',
  templateUrl: './records.html',
})
export class Records implements OnInit {
  private readonly examRecordsService = inject(ExamRecordsService);
  private readonly examTypesService = inject(ExamTypesService);
  private readonly examCatalog = signal<ExamType[]>([]);
  private readonly createExamRecordModel = signal<{
    examTypeCode: string;
    examResultSchemaCode: string;
    examDate: string;
    examResults: { resultDefinitionCode: string; value: number | null }[];
  }>({ examTypeCode: '', examResultSchemaCode: '', examDate: '', examResults: [] });
  private readonly updateExamRecordModel = signal<{ value: number | null; examDate: string }>({
    value: null,
    examDate: '',
  });

  protected readonly loadingExamTypes = signal(false);
  protected readonly loadExamTypesErrorMessage = signal('');
  protected readonly examTypes = computed(() => this.examCatalog().filter((type) => type.active));
  protected readonly examResultSchemas = computed(() => {
    const type = this.examTypes().find(
      (type) => type.code === this.createExamRecordModel().examTypeCode,
    );
    return type?.resultSchemas.filter((schema) => schema.active) ?? [];
  });
  protected readonly examResultDefinitions = computed(() => {
    const schema = this.examResultSchemas().find(
      (schema) => schema.code === this.createExamRecordModel().examResultSchemaCode,
    );
    return schema?.resultDefinitions.filter((definition) => definition.active) ?? [];
  });
  protected readonly records = signal<ExamRecord[]>([]);
  protected readonly loadingExamRecords = signal(false);
  protected readonly loadExamRecordsErrorMessage = signal('');
  protected readonly createExamRecordErrorMessage = signal('');
  protected readonly updateExamRecordErrorMessage = signal('');
  protected readonly deleteExamRecordErrorMessage = signal('');
  protected readonly createExamRecordFormOpen = signal(false);
  protected readonly editingExamRecord = signal<ExamRecord | null>(null);
  protected readonly examRecordToDelete = signal<ExamRecord | null>(null);
  protected readonly deleting = signal(false);
  private readonly injector = inject(Injector);
  private readonly addButton = viewChild<ElementRef<HTMLButtonElement>>('addButton');
  private readonly createExamType = viewChild<ElementRef<HTMLSelectElement>>('createExamType');
  private readonly createTitle = viewChild<ElementRef<HTMLHeadingElement>>('createTitle');

  protected readonly examTypeCodeInvalid = computed(
    () =>
      this.createExamRecordForm.examTypeCode().touched() &&
      this.createExamRecordForm.examTypeCode().invalid(),
  );

  protected readonly examResultSchemaCodeInvalid = computed(
    () =>
      this.createExamRecordForm.examResultSchemaCode().touched() &&
      this.createExamRecordForm.examResultSchemaCode().invalid(),
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
      required(path.examResultSchemaCode, { message: 'Choose a result schema.' });
      applyEach(path.examResults, (result) => {
        required(result.value, { message: 'Enter the result.' });
      });
      required(path.examDate, { message: 'Enter the exam date.' });
    },
    {
      submission: {
        action: async (field) => {
          const model = field().value();
          if (
            this.loadingExamTypes() ||
            this.loadExamTypesErrorMessage() ||
            !model.examTypeCode ||
            !model.examResultSchemaCode ||
            !this.examResultDefinitions().length
          )
            return;
          const examResults: CreateExamResultRequest[] = [];
          for (const result of model.examResults) {
            if (result.value === null) return;
            examResults.push({
              resultDefinitionCode: result.resultDefinitionCode,
              value: result.value,
            });
          }
          this.createExamRecordErrorMessage.set('');
          const request: CreateExamRecordRequest = {
            examTypeCode: model.examTypeCode,
            examResultSchemaCode: model.examResultSchemaCode,
            examDate: model.examDate,
            examResults,
          };
          try {
            const record = await firstValueFrom(this.examRecordsService.create(request));
            this.records.update((records) => [record, ...records]);
            this.closeCreateExamRecordFormWithFocus();
            this.createExamRecordForm().reset({
              examTypeCode: '',
              examResultSchemaCode: '',
              examDate: '',
              examResults: [],
            });
          } catch {
            this.createExamRecordErrorMessage.set('Unable to save record.');
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
          this.updateExamRecordErrorMessage.set('');
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
            this.updateExamRecordErrorMessage.set('Unable to update record.');
          }
        },
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  ngOnInit(): void {
    this.loadRecords();
    this.loadExamTypes();
  }

  protected loadExamTypes(): void {
    this.loadingExamTypes.set(true);
    this.loadExamTypesErrorMessage.set('');
    this.examTypesService.getAll().subscribe({
      next: (types) => {
        this.examCatalog.set(types);
        this.loadingExamTypes.set(false);
      },
      error: () => {
        this.loadExamTypesErrorMessage.set('Unable to load exam types.');
        this.loadingExamTypes.set(false);
      },
    });
  }

  protected selectExamType(code: string): void {
    this.createExamRecordModel.update((model) => ({
      ...model,
      examTypeCode: this.examTypes().some((type) => type.code === code) ? code : '',
      examResultSchemaCode: '',
      examResults: [],
    }));
  }

  protected selectExamResultSchema(code: string): void {
    const schema = this.examResultSchemas().find((schema) => schema.code === code);
    this.createExamRecordModel.update((model) => ({
      ...model,
      examResultSchemaCode: schema?.code ?? '',
      examResults:
        schema?.resultDefinitions
          .filter((definition) => definition.active)
          .map((definition) => ({ resultDefinitionCode: definition.code, value: null })) ?? [],
    }));
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
    this.createExamRecordForm().reset({
      examTypeCode: '',
      examResultSchemaCode: '',
      examDate: '',
      examResults: [],
    });
    this.createExamRecordErrorMessage.set('');
    this.createExamRecordFormOpen.set(true);
    if (this.editingExamRecord) this.editingExamRecord.set(null);
    afterNextRender(
      () => {
        const select = this.createExamType()?.nativeElement;
        if (select?.matches(':disabled')) {
          this.createTitle()?.nativeElement.focus();
        } else {
          select?.focus();
        }
      },
      { injector: this.injector },
    );
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
    this.updateExamRecordErrorMessage.set('');
    this.editingExamRecord.set(record);
    if (this.createExamRecordFormOpen) this.createExamRecordFormOpen.set(false);
  }

  protected closeEditExamRecordFormWithFocus(editButton: HTMLButtonElement): void {
    this.editingExamRecord.set(null);
    editButton.focus();
  }

  protected requestDeleteExamRecord(record: ExamRecord, dialog: HTMLDialogElement): void {
    this.examRecordToDelete.set(record);
    this.deleteExamRecordErrorMessage.set('');
    dialog.showModal();
  }

  protected confirmDelete(dialog: HTMLDialogElement): void {
    const record = this.examRecordToDelete();
    if (!record || this.deleting()) return;
    this.deleting.set(true);
    this.deleteExamRecordErrorMessage.set('');
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
        this.deleteExamRecordErrorMessage.set('Unable to delete record.');
      },
    });
  }
}
