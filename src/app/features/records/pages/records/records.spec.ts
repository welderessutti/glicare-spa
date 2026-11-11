import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { vi } from 'vitest';
import { Records } from './records';
import { ExamRecord } from '../../models/exam-record';
import { ExamType } from '../../models/exam-type';
import { CreateExamRecordRequest } from '../../models/requests/create-exam-record-request';
import { UpdateExamRecordRequest } from '../../models/requests/update-exam-record-request';
import { ExamRecordFiltersRequest } from '../../models/requests/exam-record-filters-request';
import { ExamRecordsService } from '../../services/exam-records-service';
import { ExamTypesService } from '../../services/exam-types-service';

const catalog: ExamType[] = [
  {
    id: 'type-hba1c',
    code: 'HBA1C',
    name: 'Catalog A1c',
    active: true,
    resultSchemas: [
      {
        id: 'schema-hba1c',
        code: 'STANDARD',
        name: 'A1c standard',
        active: true,
        resultDefinitions: [
          {
            id: 'definition-hba1c',
            code: 'RESULT',
            label: 'Catalog A1c result',
            unit: '%',
            active: true,
          },
        ],
      },
    ],
  },
  {
    id: 'type-glu',
    code: 'GLU',
    name: 'Catalog glucose',
    active: true,
    resultSchemas: [
      {
        id: 'schema-glu',
        code: 'STANDARD',
        name: 'Glucose standard',
        active: true,
        resultDefinitions: [
          {
            id: 'definition-glu',
            code: 'RESULT',
            label: 'Catalog glucose result',
            unit: 'mg/dL',
            active: true,
          },
        ],
      },
    ],
  },
  {
    id: 'type-panel',
    code: 'PANEL',
    name: 'Backend panel',
    active: true,
    resultSchemas: [
      {
        id: 'schema-panel',
        code: 'STANDARD',
        name: 'Two measurements',
        active: true,
        resultDefinitions: [
          { id: 'first', code: 'FIRST', label: 'First measurement', unit: 'unit A', active: true },
          {
            id: 'retired',
            code: 'RETIRED',
            label: 'Retired measurement',
            unit: 'unit X',
            active: false,
          },
          {
            id: 'second',
            code: 'SECOND',
            label: 'Second measurement',
            unit: 'unit B',
            active: true,
          },
        ],
      },
      {
        id: 'schema-alternative',
        code: 'ALTERNATIVE',
        name: 'Alternative measurement',
        active: true,
        resultDefinitions: [
          {
            id: 'alternative',
            code: 'FIRST',
            label: 'Alternative value',
            unit: 'unit C',
            active: true,
          },
        ],
      },
      {
        id: 'schema-retired',
        code: 'RETIRED',
        name: 'Retired schema',
        active: false,
        resultDefinitions: [],
      },
    ],
  },
  { id: 'type-retired', code: 'RETIRED', name: 'Retired exam', active: false, resultSchemas: [] },
];

function record(id: string, code: string, value: number, date: string): ExamRecord {
  const resultDefinition = {
    id: `definition-${code}`,
    code: 'RESULT',
    label: 'Result',
    unit: code === 'GLU' ? 'mg/dL' : '%',
    active: true,
  };
  return {
    id,
    userId: 'server-user',
    createdAt: '2026-10-20T10:00:00Z',
    examDate: date,
    examType: {
      code,
      name: code === 'GLU' ? 'Blood Glucose' : 'Hemoglobin A1c',
    },
    examResultSchema: { code: 'STANDARD', name: 'Standard', active: true },
    examResults: [{ id: `result-${id}`, resultDefinition, value }],
  };
}

function multiRecord(active = true): ExamRecord {
  const type = catalog[2];
  const schema = type.resultSchemas[0];
  const definitions = schema.resultDefinitions
    .filter((definition) => definition.active)
    .map((definition) => ({ ...definition, active }));
  return {
    id: 'panel-record',
    userId: 'server-user',
    examDate: '2026-10-10',
    createdAt: '2026-10-10T12:00:00Z',
    examType: { code: type.code, name: type.name },
    examResultSchema: { code: schema.code, name: schema.name, active },
    examResults: definitions.map((resultDefinition, index) => ({
      id: `result-panel-${resultDefinition.code}`,
      resultDefinition,
      value: (index + 1) * 10,
    })),
  };
}

describe('Records', () => {
  let fixture: ComponentFixture<Records>;
  let page: HTMLElement;
  let dialog: HTMLDialogElement;
  let listResponse: Subject<ExamRecord[]>;
  let catalogResponse: Subject<ExamType[]>;
  let createResponse: Subject<ExamRecord>;
  let updateResponse: Subject<ExamRecord>;
  let deleteResponse: Subject<void>;
  const getAll = vi.fn<(filters?: ExamRecordFiltersRequest) => Observable<ExamRecord[]>>();
  const getExamTypes = vi.fn<() => Observable<ExamType[]>>();
  const create = vi.fn<(request: CreateExamRecordRequest) => Observable<ExamRecord>>();
  const updateById =
    vi.fn<(id: string, request: UpdateExamRecordRequest) => Observable<ExamRecord>>();
  const deleteById = vi.fn<(id: string) => Observable<void>>();

  function element<T extends HTMLElement>(selector: string): T {
    const match = page.querySelector<T>(selector);
    if (!match) throw new Error(`Missing element: ${selector}`);
    return match;
  }

  function button(text: string, parent: HTMLElement = page): HTMLButtonElement {
    const match = [...parent.querySelectorAll('button')].find((control) =>
      control.textContent?.trim().startsWith(text),
    );
    if (!match) throw new Error(`Missing button: ${text}`);
    return match;
  }

  function rows(): HTMLLIElement[] {
    return [...page.querySelectorAll<HTMLLIElement>('section > ul > li')];
  }

  async function click(control: HTMLButtonElement): Promise<void> {
    control.click();
    await fixture.whenStable();
  }

  async function enter(selector: string, value: string): Promise<void> {
    const control = element<HTMLInputElement | HTMLSelectElement>(selector);
    control.value = value;
    control.dispatchEvent(new Event('input'));
    if (control instanceof HTMLSelectElement) control.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  async function load(
    records = [
      record('hba1c-record', 'HBA1C', 6.5, '2026-10-10'),
      record('glucose-record', 'GLU', 108, '2026-07-08'),
    ],
  ): Promise<void> {
    listResponse.next(records);
    listResponse.complete();
    catalogResponse.next(catalog);
    await fixture.whenStable();
  }

  async function fillCreation(code: string, value: string): Promise<void> {
    await enter('#records-exam-type', code);
    await enter('#records-result-schema', 'STANDARD');
    await enter('#records-result-0', value);
    await enter('#records-exam-date', '2026-10-20');
  }

  beforeEach(async () => {
    listResponse = new Subject<ExamRecord[]>();
    catalogResponse = new Subject<ExamType[]>();
    createResponse = new Subject<ExamRecord>();
    updateResponse = new Subject<ExamRecord>();
    deleteResponse = new Subject<void>();
    getAll.mockReset().mockReturnValue(listResponse);
    getExamTypes.mockReset().mockReturnValue(catalogResponse);
    create.mockReset().mockReturnValue(createResponse);
    updateById.mockReset().mockReturnValue(updateResponse);
    deleteById.mockReset().mockReturnValue(deleteResponse);
    await TestBed.configureTestingModule({
      imports: [Records],
      providers: [
        { provide: ExamRecordsService, useValue: { getAll, create, updateById, deleteById } },
        { provide: ExamTypesService, useValue: { getAll: getExamTypes } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Records);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    dialog = element<HTMLDialogElement>('dialog');
    // Native modal behavior and focus trapping are checked in the browser.
    dialog.showModal = vi.fn(() => {
      dialog.open = true;
    });
    dialog.close = vi.fn(() => {
      dialog.open = false;
      dialog.dispatchEvent(new Event('close'));
    });
  });

  afterEach(() => {
    listResponse.complete();
    catalogResponse.complete();
    createResponse.complete();
    updateResponse.complete();
    deleteResponse.complete();
  });

  it('loads records using exam type references and result definition data', async () => {
    expect(getAll).toHaveBeenCalledExactlyOnceWith();
    expect(page.textContent).toContain('Loading your records');
    expect(page.textContent).not.toContain('No exam results yet.');
    await load();
    expect(rows()).toHaveLength(2);
    expect(rows()[0].textContent).toContain('Hemoglobin A1c');
    expect(rows()[0].textContent).toContain('6.5');
    expect(rows()[0].textContent).toContain('%');
    expect(rows()[1].textContent).toContain('Blood Glucose');
    expect(rows()[1].textContent).toContain('mg/dL');
    expect(page.textContent).not.toContain('Demo');
    expect(page.querySelector('form')).toBeNull();
  });

  it('reports list failures safely and supports retry without showing a false empty state', async () => {
    listResponse.error(
      new HttpErrorResponse({ status: 500, error: { message: 'internal database details' } }),
    );
    await fixture.whenStable();
    expect(element('[role="alert"]').textContent).toContain('Unable to load records.');
    expect(page.textContent).not.toContain('internal database');
    expect(page.textContent).not.toContain('No exam results yet.');
    const retry = new Subject<ExamRecord[]>();
    getAll.mockReturnValueOnce(retry);
    await click(button('Try again'));
    expect(page.querySelector('[role="alert"]')).toBeNull();
    retry.next([]);
    retry.complete();
    await fixture.whenStable();
    expect(page.textContent).toContain('No exam results yet.');
    expect(button('Add record').disabled).toBe(false);
  });

  it('loads the catalog independently and uses its active exam names and codes', async () => {
    expect(getExamTypes).toHaveBeenCalledExactlyOnceWith();
    await click(button('Add record'));
    expect(element('#records-add-section').textContent).toContain('Loading exam types');
    expect(document.activeElement).toBe(element('#records-add-title'));
    expect(element<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true);
    listResponse.next([record('historical', 'GLU', 100, '2026-10-20')]);
    listResponse.complete();
    await fixture.whenStable();
    expect(rows()).toHaveLength(1);
    catalogResponse.next(catalog);
    await fixture.whenStable();
    const options = [...element<HTMLSelectElement>('#records-exam-type').options];
    expect(options.map((option) => [option.value, option.textContent])).toEqual([
      ['', 'Choose an exam type'],
      ['HBA1C', 'Catalog A1c'],
      ['GLU', 'Catalog glucose'],
      ['PANEL', 'Backend panel'],
    ]);
    expect(catalog[3].active).toBe(false);
  });

  it('reports catalog failures safely and retries without reloading records', async () => {
    await load();
    await click(button('Add record'));
    catalogResponse.error(
      new HttpErrorResponse({ status: 500, error: { message: 'private detail' } }),
    );
    await fixture.whenStable();
    expect(element('#records-add-section').textContent).toContain('Unable to load exam types.');
    expect(page.textContent).not.toContain('private detail');
    expect(rows()).toHaveLength(2);
    expect(element<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true);
    const retry = new Subject<ExamType[]>();
    getExamTypes.mockReturnValueOnce(retry);
    await click(button('Try again', element('#records-add-section')));
    expect(element('#records-add-section').textContent).toContain('Loading exam types');
    retry.next(catalog);
    retry.complete();
    await fixture.whenStable();
    expect(element('#records-add-section').querySelector('[role="alert"]')).toBeNull();
    expect(getAll).toHaveBeenCalledTimes(1);
    expect(getExamTypes).toHaveBeenCalledTimes(2);
  });

  it('handles catalogs with no active exams, schemas or result definitions', async () => {
    await load();
    await click(button('Add record'));
    catalogResponse.next([catalog[3]]);
    await fixture.whenStable();
    expect(element('#records-add-section').textContent).toContain('No exam types are available.');
    expect(element<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true);
    catalogResponse.next([{ ...catalog[0], resultSchemas: [] }]);
    await fixture.whenStable();
    await enter('#records-exam-type', 'HBA1C');
    expect(element('#records-add-section').textContent).toContain(
      'No result schemas are available',
    );
    catalogResponse.next([
      { ...catalog[0], resultSchemas: [{ ...catalog[0].resultSchemas[0], resultDefinitions: [] }] },
    ]);
    await fixture.whenStable();
    await enter('#records-result-schema', 'STANDARD');
    expect(element('#records-add-section').textContent).toContain('No result fields are available');
    expect(element<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true);
    await enter('#records-exam-date', '2026-10-20');
    await submit();
    expect(create).not.toHaveBeenCalled();
  });

  it('requires explicit type and schema selections and focuses the first invalid control', async () => {
    await load();
    await click(button('Add record'));
    const select = element<HTMLSelectElement>('#records-exam-type');
    expect(select.value).toBe('');
    expect(document.activeElement).toBe(select);
    await submit();
    expect(create).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(select);
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-describedby')).toBe('records-type-error');
    expect(element('#records-type-error').textContent).toContain('Choose an exam type.');
    expect(element('#records-schema-error').textContent).toContain('Choose a result schema.');
    expect(element('#records-date-error').textContent).toContain('Enter the exam date.');
    await enter('#records-exam-type', 'PANEL');
    expect(element<HTMLSelectElement>('#records-result-schema').value).toBe('');
    await submit();
    expect(document.activeElement).toBe(element('#records-result-schema'));
  });

  it('shows active schemas and fields and clears values when the schema or exam changes', async () => {
    await load();
    await click(button('Add record'));
    await fillCreation('PANEL', '12');
    const schemas = [...element<HTMLSelectElement>('#records-result-schema').options];
    expect(schemas.map((option) => [option.value, option.textContent])).toEqual([
      ['', 'Choose a result schema'],
      ['STANDARD', 'Two measurements'],
      ['ALTERNATIVE', 'Alternative measurement'],
    ]);
    expect(element('label[for="records-result-0"]').textContent).toBe('First measurement');
    expect(element('label[for="records-result-1"]').textContent).toBe('Second measurement');
    expect(element('#records-result-unit-0').textContent?.trim()).toBe('unit A');
    expect(element('#records-result-unit-1').textContent?.trim()).toBe('unit B');
    expect(page.textContent).not.toContain('Retired measurement');
    expect(catalog[2].resultSchemas[0].resultDefinitions).toHaveLength(3);
    await enter('#records-result-1', '24');
    await enter('#records-result-schema', 'ALTERNATIVE');
    expect(element<HTMLInputElement>('#records-result-0').value).toBe('');
    expect(element('label[for="records-result-0"]').textContent).toBe('Alternative value');
    expect(element('#records-result-unit-0').textContent?.trim()).toBe('unit C');
    expect(page.querySelector('#records-result-1')).toBeNull();
    await enter('#records-result-0', '36');
    await enter('#records-exam-type', 'GLU');
    expect(element<HTMLSelectElement>('#records-result-schema').value).toBe('');
    expect(page.querySelector('#records-result-0')).toBeNull();
    await enter('#records-result-schema', 'STANDARD');
    expect(element<HTMLInputElement>('#records-result-0').value).toBe('');
    expect(element('label[for="records-result-0"]').textContent).toBe('Catalog glucose result');
    expect(element('#records-result-unit-0').textContent?.trim()).toBe('mg/dL');
    expect(element<HTMLInputElement>('#records-exam-date').value).toBe('2026-10-20');
  });

  it('requires every dynamic result and associates each input with its label, unit and errors', async () => {
    await load();
    await click(button('Add record'));
    await fillCreation('PANEL', '0');
    await submit();
    expect(create).not.toHaveBeenCalled();
    const second = element<HTMLInputElement>('#records-result-1');
    expect(document.activeElement).toBe(second);
    expect(second.getAttribute('aria-invalid')).toBe('true');
    expect(second.getAttribute('aria-describedby')).toBe(
      'records-result-unit-1 records-result-error-1',
    );
    expect(element('#records-result-error-1').textContent).toContain('Enter the result.');
    await enter('#records-result-1', '-1.234');
    await submit();
    expect(create).toHaveBeenCalledExactlyOnceWith({
      examTypeCode: 'PANEL',
      examResultSchemaCode: 'STANDARD',
      examDate: '2026-10-20',
      examResults: [
        { resultDefinitionCode: 'FIRST', value: 0 },
        { resultDefinitionCode: 'SECOND', value: -1.234 },
      ],
    });
  });

  it.each([
    { code: 'HBA1C', value: '101.234' },
    { code: 'GLU', value: '-1.23' },
  ])(
    'creates $code with business codes only and resets after the new read response',
    async ({ code, value }) => {
      await load();
      await click(button('Add record'));
      await fillCreation(code, value);
      await submit();
      expect(create).toHaveBeenCalledExactlyOnceWith({
        examTypeCode: code,
        examResultSchemaCode: 'STANDARD',
        examDate: '2026-10-20',
        examResults: [{ resultDefinitionCode: 'RESULT', value: Number(value) }],
      });
      expect(element('form').getAttribute('aria-busy')).toBe('true');
      expect(element('#records-result-0').matches(':disabled')).toBe(true);
      expect(element<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true);
      expect(button('Cancel', element('form')).disabled).toBe(true);
      expect(rows()).toHaveLength(2);
      await submit();
      expect(create).toHaveBeenCalledTimes(1);
      const saved = record('server-generated-id', 'GLU', 123, '2026-10-21');
      createResponse.next(saved);
      await Promise.resolve();
      await fixture.whenStable();
      expect(rows()).toHaveLength(3);
      expect(rows()[0].querySelector('time')?.dateTime).toBe(saved.examDate);
      expect(rows()[0].textContent).toContain('123');
      expect(page.querySelector('form')).toBeNull();
      expect(document.activeElement).toBe(button('Add record'));
      await click(button('Add record'));
      expect(element<HTMLSelectElement>('#records-exam-type').value).toBe('');
      expect(element<HTMLSelectElement>('#records-result-schema').value).toBe('');
      expect(element<HTMLInputElement>('#records-exam-date').value).toBe('');
      expect(page.querySelector('#records-result-0')).toBeNull();
      expect(element('#records-exam-type').getAttribute('aria-invalid')).toBe('false');
    },
  );

  it('shows a readable native number parsing error and never submits a stale value', async () => {
    await load();
    await click(button('Add record'));
    await fillCreation('GLU', '145');
    const control = element<HTMLInputElement>('#records-result-0');
    const badInput = vi.spyOn(control.validity, 'badInput', 'get').mockReturnValue(true);
    try {
      control.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      await submit();
      expect(create).not.toHaveBeenCalled();
      expect(element('#records-result-error-0').textContent).toContain('Enter a valid number.');
      expect(document.activeElement).toBe(control);
    } finally {
      badInput.mockRestore();
    }
  });

  it('preserves all creation values on failure and lets the user retry', async () => {
    await load();
    await click(button('Add record'));
    await fillCreation('PANEL', '125');
    await enter('#records-result-1', '250');
    await submit();
    createResponse.error(
      new HttpErrorResponse({ status: 500, error: { message: 'secret detail' } }),
    );
    await Promise.resolve();
    await fixture.whenStable();
    expect(element('[role="alert"]').textContent).toContain('Unable to save record.');
    expect(page.textContent).not.toContain('secret detail');
    expect(element<HTMLInputElement>('#records-result-0').value).toBe('125');
    expect(element<HTMLInputElement>('#records-result-1').value).toBe('250');
    expect(element<HTMLSelectElement>('#records-exam-type').value).toBe('PANEL');
    expect(element<HTMLSelectElement>('#records-result-schema').value).toBe('STANDARD');
    expect(element<HTMLInputElement>('#records-exam-date').value).toBe('2026-10-20');
    expect(element<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false);
    expect(rows()).toHaveLength(2);
    const retry = new Subject<ExamRecord>();
    create.mockReturnValueOnce(retry);
    await submit();
    expect(create).toHaveBeenCalledTimes(2);
    retry.next(record('saved', 'GLU', 125, '2026-10-20'));
    retry.complete();
    await Promise.resolve();
    await fixture.whenStable();
    expect(rows()).toHaveLength(3);
  });

  it('cancels creation with focus restoration and yields to the existing edit form', async () => {
    await load();
    await click(button('Add record'));
    await fillCreation('GLU', '128');
    await click(button('Cancel', element('form')));
    expect(document.activeElement).toBe(button('Add record'));
    expect(page.querySelector('form')).toBeNull();
    await click(button('Add record'));
    expect(element<HTMLSelectElement>('#records-exam-type').value).toBe('');
    await click(button('Edit', rows()[0]));
    expect(page.querySelectorAll('form')).toHaveLength(1);
    expect(page.querySelector('select')).toBeNull();
    expect(element<HTMLInputElement>('form input[type="number"]').value).toBe('6.5');
    await click(button('Cancel', element('form')));
    expect(rows()[0].textContent).toContain('6.5');
    expect(create).not.toHaveBeenCalled();
    expect(updateById).not.toHaveBeenCalled();
  });

  it('focuses the first invalid edit field before attempting an update', async () => {
    await load();
    await click(button('Edit', rows()[0]));
    await enter('form input[type="number"]', '');
    await submit();
    expect(updateById).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(element('form input[type="number"]'));
    expect(element('form input[type="number"]').getAttribute('aria-invalid')).toBe('true');
  });

  it('updates using the record ID and required backend result ID, then uses the returned record', async () => {
    await load();
    const edit = button('Edit', rows()[1]);
    await click(edit);
    await enter('form input[type="number"]', '150');
    await enter('form input[type="date"]', '2026-10-20');
    await submit();
    expect(updateById).toHaveBeenCalledExactlyOnceWith('glucose-record', {
      examDate: '2026-10-20',
      examResults: [{ id: 'result-glucose-record', value: 150 }],
    });
    expect(element('form').getAttribute('aria-busy')).toBe('true');
    expect(element('form input[type="number"]').matches(':disabled')).toBe(true);
    expect(button('Cancel', element('form')).disabled).toBe(true);
    await submit();
    expect(updateById).toHaveBeenCalledTimes(1);
    updateResponse.next(record('glucose-record', 'GLU', 149, '2026-10-21'));
    await Promise.resolve();
    await fixture.whenStable();
    expect(rows()).toHaveLength(2);
    expect(rows()[1].textContent).toContain('149');
    expect(rows()[1].querySelector('time')?.dateTime).toBe('2026-10-21');
    expect(document.activeElement).toBe(edit);
    expect(page.querySelector('form')).toBeNull();
  });

  it('keeps edit inputs and the original record after a rejected update', async () => {
    await load();
    await click(button('Edit', rows()[0]));
    await enter('form input[type="number"]', '6.9');
    await submit();
    updateResponse.error(new HttpErrorResponse({ status: 429 }));
    await Promise.resolve();
    await fixture.whenStable();
    expect(element('[role="alert"]').textContent).toContain('Unable to update record.');
    expect(element<HTMLInputElement>('form input[type="number"]').value).toBe('6.9');
    expect(element('form').getAttribute('aria-busy')).toBe('false');
    expect(rows()[0].textContent).toContain('6.5');
  });

  it('cancels deletion without making an HTTP request', async () => {
    await load();
    await click(button('Delete', rows()[1]));
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Blood Glucose');
    expect(dialog.textContent).not.toContain('108 mg/dL');
    expect(dialog.textContent).toContain('Jul 08, 2026');
    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
    await click(button('Cancel', dialog));
    expect(dialog.open).toBe(false);
    expect(deleteById).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(2);
  });

  it('deletes only after HTTP success and blocks duplicate deletion and Escape while pending', async () => {
    await load([record('only-record', 'HBA1C', 6.5, '2026-10-10')]);
    await click(button('Edit', rows()[0]));
    await click(button('Delete', rows()[0]));
    await click(button('Delete', dialog));
    expect(deleteById).toHaveBeenCalledExactlyOnceWith('only-record');
    expect(rows()).toHaveLength(1);
    expect(button('Cancel', dialog).disabled).toBe(true);
    expect(dialog.getAttribute('aria-busy')).toBe('true');
    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    deleteResponse.next();
    deleteResponse.complete();
    await fixture.whenStable();
    expect(rows()).toHaveLength(0);
    expect(dialog.open).toBe(false);
    expect(page.querySelector('form')).toBeNull();
    expect(document.activeElement).toBe(element('#records-results-title'));
    expect(page.textContent).toContain('No exam results yet.');
  });

  it('retains the deletion target after failure and supports retry', async () => {
    await load();
    await click(button('Delete', rows()[0]));
    await click(button('Delete', dialog));
    deleteResponse.error(
      new HttpErrorResponse({ status: 403, error: { message: 'internal ownership details' } }),
    );
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(rows()).toHaveLength(2);
    expect(button('Cancel', dialog).disabled).toBe(false);
    expect(dialog.textContent).toContain('Unable to delete record.');
    expect(dialog.textContent).not.toContain('internal ownership');
    const retry = new Subject<void>();
    deleteById.mockReturnValueOnce(retry);
    await click(button('Delete', dialog));
    retry.next();
    retry.complete();
    await fixture.whenStable();
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('Blood Glucose');
    expect(dialog.open).toBe(false);
  });

  it('renders and edits every result of an inactive historical schema', async () => {
    const historical = multiRecord(false);
    await load([historical]);
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('Backend panel');
    expect([...rows()[0].querySelectorAll('dt')].map((item) => item.textContent?.trim())).toEqual([
      'First measurement',
      'Second measurement',
    ]);
    expect(
      [...rows()[0].querySelectorAll('dd')].map((item) =>
        item.textContent?.trim().replace(/\s+/g, ' '),
      ),
    ).toEqual(['10 unit A', '20 unit B']);
    expect(button('Edit', rows()[0]).disabled).toBe(false);
    await click(button('Edit', rows()[0]));
    expect(
      [...element('form').querySelectorAll<HTMLInputElement>('input[type="number"]')].map(
        (input) => input.value,
      ),
    ).toEqual(['10', '20']);
    expect(element('form').textContent).toContain('First measurement');
    expect(element('form').textContent).toContain('Second measurement');
    expect(element('form').textContent).toContain('unit A');
    expect(element('form').textContent).toContain('unit B');
    expect(element('form').querySelector('select')).toBeNull();
    await enter('#records-edit-result-panel-record-0', '0');
    await enter('#records-edit-result-panel-record-1', '-2.345');
    await enter('form input[type="date"]', '2026-11-09');
    await submit();
    expect(updateById).toHaveBeenCalledExactlyOnceWith('panel-record', {
      examDate: '2026-11-09',
      examResults: [
        { id: 'result-panel-FIRST', value: 0 },
        { id: 'result-panel-SECOND', value: -2.345 },
      ],
    });
    expect(historical.examResults.map((result) => result.value)).toEqual([10, 20]);
  });

  it('requires every edit value and the date and focuses the first invalid field', async () => {
    await load([multiRecord()]);
    await click(button('Edit', rows()[0]));
    await enter('#records-edit-result-panel-record-1', '');
    await enter('form input[type="date"]', '');
    await submit();
    const second = element<HTMLInputElement>('#records-edit-result-panel-record-1');
    expect(document.activeElement).toBe(second);
    expect(second.getAttribute('aria-invalid')).toBe('true');
    expect(second.getAttribute('aria-describedby')).toBe(
      'records-edit-result-panel-record-1-unit records-edit-result-panel-record-1-error',
    );
    expect(element('#records-edit-result-panel-record-1-error').textContent).toContain(
      'Enter the result.',
    );
    expect(updateById).not.toHaveBeenCalled();
    await enter('#records-edit-result-panel-record-1', '22');
    await submit();
    expect(document.activeElement).toBe(element('form input[type="date"]'));
    expect(updateById).not.toHaveBeenCalled();
  });

  it('preserves all edit values on failure and replaces all results on retry success', async () => {
    await load([multiRecord()]);
    const edit = button('Edit', rows()[0]);
    await click(edit);
    await enter('#records-edit-result-panel-record-0', '11');
    await enter('#records-edit-result-panel-record-1', '22');
    await enter('form input[type="date"]', '2026-11-09');
    await submit();
    await submit();
    expect(updateById).toHaveBeenCalledTimes(1);
    updateResponse.error(
      new HttpErrorResponse({ status: 500, error: { message: 'private detail' } }),
    );
    await Promise.resolve();
    await fixture.whenStable();
    expect(element('[role="alert"]').textContent).toContain('Unable to update record.');
    expect(page.textContent).not.toContain('private detail');
    expect(element<HTMLInputElement>('#records-edit-result-panel-record-0').value).toBe('11');
    expect(element<HTMLInputElement>('#records-edit-result-panel-record-1').value).toBe('22');
    expect(element<HTMLInputElement>('form input[type="date"]').value).toBe('2026-11-09');
    expect(rows()[0].querySelector('dd')?.textContent).toContain('10');
    const retry = new Subject<ExamRecord>();
    updateById.mockReturnValueOnce(retry);
    await submit();
    const updated = multiRecord();
    updated.examDate = '2026-11-09';
    updated.examResults = updated.examResults.map((result, index) => ({
      ...result,
      value: (index + 1) * 11,
    }));
    retry.next(updated);
    retry.complete();
    await Promise.resolve();
    await fixture.whenStable();
    expect(page.querySelector('form')).toBeNull();
    expect(
      [...rows()[0].querySelectorAll('dd')].map((item) =>
        item.textContent?.trim().replace(/\s+/g, ' '),
      ),
    ).toEqual(['11 unit A', '22 unit B']);
    expect(rows()[0].querySelector('time')?.dateTime).toBe('2026-11-09');
    expect(document.activeElement).toBe(edit);
  });

  it('confirms deletion concisely for multi-result and empty-result records', async () => {
    const multi = multiRecord();
    const empty = { ...multiRecord(), id: 'empty-record', examResults: [] };
    await load([multi, empty]);
    await click(button('Delete', rows()[0]));
    expect(dialog.textContent).toContain('Backend panel');
    expect(dialog.textContent).toContain('Oct 10, 2026');
    expect(dialog.textContent).not.toContain('First measurement');
    await click(button('Cancel', dialog));
    await click(button('Delete', rows()[1]));
    await click(button('Delete', dialog));
    expect(deleteById).toHaveBeenCalledExactlyOnceWith('empty-record');
    deleteResponse.next();
    await fixture.whenStable();
    expect(rows()).toHaveLength(1);
  });
});
