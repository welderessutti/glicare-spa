import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { vi } from 'vitest';
import { Records } from './records';
import { ExamRecord } from '../../models/exam-record';
import { ExamTypeCode } from '../../models/exam-type-code';
import { CreateExamRecordRequest } from '../../models/requests/create-exam-record-request';
import { UpdateExamRecordRequest } from '../../models/requests/update-exam-record-request';
import { ExamRecordFiltersRequest } from '../../models/requests/exam-record-filters-request';
import { ExamRecordsService } from '../../services/exam-records-service';

function record(id: string, code: ExamTypeCode, value: number, date: string): ExamRecord {
  return {
    id,
    userId: 'server-user',
    createdAt: '2026-10-20T10:00:00Z',
    examDate: date,
    examType: {
      id: `type-${code}`,
      code,
      name: code === 'GLU' ? 'Blood Glucose' : 'Hemoglobin A1c',
      active: true,
    },
    examResults: [
      {
        id: `result-${id}`,
        examRecordId: id,
        label: 'Result',
        value,
        unit: code === 'GLU' ? 'mg/dL' : '%',
      },
    ],
  };
}

describe('Records', () => {
  let fixture: ComponentFixture<Records>;
  let page: HTMLElement;
  let dialog: HTMLDialogElement;
  let listResponse: Subject<ExamRecord[]>;
  let createResponse: Subject<ExamRecord>;
  let updateResponse: Subject<ExamRecord>;
  let deleteResponse: Subject<void>;
  const getAll = vi.fn<(filters?: ExamRecordFiltersRequest) => Observable<ExamRecord[]>>();
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
    await fixture.whenStable();
  }

  async function fillCreation(code: ExamTypeCode, value: string): Promise<void> {
    await enter('#records-exam-type', code);
    await enter('#records-result', value);
    await enter('#records-exam-date', '2026-10-20');
  }

  beforeEach(async () => {
    listResponse = new Subject<ExamRecord[]>();
    createResponse = new Subject<ExamRecord>();
    updateResponse = new Subject<ExamRecord>();
    deleteResponse = new Subject<void>();
    getAll.mockReset().mockReturnValue(listResponse);
    create.mockReset().mockReturnValue(createResponse);
    updateById.mockReset().mockReturnValue(updateResponse);
    deleteById.mockReset().mockReturnValue(deleteResponse);
    await TestBed.configureTestingModule({
      imports: [Records],
      providers: [
        { provide: ExamRecordsService, useValue: { getAll, create, updateById, deleteById } },
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
    createResponse.complete();
    updateResponse.complete();
    deleteResponse.complete();
  });

  it('loads the real list before showing an empty state and requests date sorting', async () => {
    expect(getAll).toHaveBeenCalledExactlyOnceWith({ sortBy: 'examDate', sortDirection: 'desc' });
    expect(page.textContent).toContain('Loading your records');
    expect(page.textContent).not.toContain('No exam results yet.');
    expect(button('Add record').disabled).toBe(true);
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
    expect(element('[role="alert"]').textContent).toContain('Unable to load your records');
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

  it('requires an explicit exam selection, focuses it and associates validation messages', async () => {
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
    expect(element('#records-result-error').textContent).toContain('Enter the result');
    expect(element('#records-date-error').textContent).toContain('Enter the exam date.');
  });

  it('changes units and clears the previous result when the exam type changes', async () => {
    await load();
    await click(button('Add record'));
    await fillCreation('HBA1C', '6.5');
    expect(element('label[for="records-result"]').textContent).toContain('%');
    await enter('#records-exam-type', 'GLU');
    expect(element<HTMLInputElement>('#records-result').value).toBe('');
    expect(element('label[for="records-result"]').textContent).toContain('mg/dL');
    expect(element('#records-result-hint').textContent).toContain('blood glucose');
  });

  it('preserves percentage validation without applying its upper bound to glucose', async () => {
    await load();
    await click(button('Add record'));
    await fillCreation('HBA1C', '101');
    await submit();
    expect(create).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(element('#records-result'));
    expect(element('#records-result-error').textContent).toContain('100 or less');
    await fillCreation('GLU', '-1');
    await submit();
    expect(element('#records-result-error').textContent).toContain('zero or greater');
    expect(create).not.toHaveBeenCalled();
  });

  it('shows a readable message for native number parsing errors without submitting a stale value', async () => {
    await load();
    await click(button('Add record'));
    await fillCreation('GLU', '145');
    const control = element<HTMLInputElement>('#records-result');
    const badInput = vi.spyOn(control.validity, 'badInput', 'get').mockReturnValue(true);
    control.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await submit();
    expect(create).not.toHaveBeenCalled();
    expect(element('#records-result-error').textContent).toContain('Enter a valid number.');
    expect(document.activeElement).toBe(control);
    badInput.mockRestore();
  });

  it.each([
    { code: 'HBA1C' as const, value: '6.53' },
    { code: 'GLU' as const, value: '145' },
  ])(
    'creates $code with only the request DTO and waits for the server response',
    async ({ code, value }) => {
      await load();
      const add = button('Add record');
      await click(add);
      await fillCreation(code, value);
      const save = element<HTMLButtonElement>('button[type="submit"]');
      await submit();
      expect(create).toHaveBeenCalledExactlyOnceWith({
        examTypeCode: code,
        examDate: '2026-10-20',
        examResults: [{ label: 'Result', value: Number(value) }],
      });
      expect(element('form').getAttribute('aria-busy')).toBe('true');
      expect(element('#records-result').matches(':disabled')).toBe(true);
      expect(save.disabled).toBe(true);
      expect(button('Cancel', element('form')).disabled).toBe(true);
      expect(add.disabled).toBe(true);
      expect(rows()).toHaveLength(2);
      await submit();
      expect(create).toHaveBeenCalledTimes(1);
      const saved = record('server-generated-id', code, Number(value) + 0.01, '2026-10-21');
      createResponse.next(saved);
      await Promise.resolve();
      await fixture.whenStable();
      expect(rows()).toHaveLength(3);
      expect(rows()[0].querySelector('time')?.dateTime).toBe(saved.examDate);
      expect(rows()[0].textContent).toContain(String(saved.examResults[0].value));
      expect(page.querySelector('form')).toBeNull();
      expect(document.activeElement).toBe(add);
      expect(page.textContent).toContain('Record saved.');
      await click(add);
      expect(element<HTMLSelectElement>('#records-exam-type').value).toBe('');
      expect(element<HTMLInputElement>('#records-result').value).toBe('');
      expect(element('#records-result').getAttribute('aria-invalid')).toBe('false');
    },
  );

  it('keeps creation inputs after an HTTP failure and restores editing without exposing server errors', async () => {
    await load();
    await click(button('Add record'));
    await fillCreation('GLU', '125');
    await submit();
    createResponse.error(
      new HttpErrorResponse({ status: 500, error: { message: 'secret implementation detail' } }),
    );
    await Promise.resolve();
    await fixture.whenStable();
    expect(element('[role="alert"]').textContent).toContain('Unable to save your record');
    expect(page.textContent).not.toContain('secret implementation');
    expect(element<HTMLInputElement>('#records-result').value).toBe('125');
    expect(element<HTMLSelectElement>('#records-exam-type').value).toBe('GLU');
    expect(element<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false);
    expect(rows()).toHaveLength(2);
  });

  it('cancels creation and editing, restores focus and keeps only one form open', async () => {
    await load();
    const add = button('Add record');
    await click(add);
    await fillCreation('GLU', '128');
    await click(button('Cancel', element('form')));
    expect(document.activeElement).toBe(add);
    expect(page.querySelector('form')).toBeNull();
    await click(add);
    expect(element<HTMLSelectElement>('#records-exam-type').value).toBe('');
    const edit = button('Edit', rows()[0]);
    await click(edit);
    expect(page.querySelectorAll('form')).toHaveLength(1);
    expect(page.querySelector('select')).toBeNull();
    expect(element<HTMLInputElement>('form input[type="number"]').value).toBe('6.5');
    expect(document.activeElement).toBe(element('form input[type="number"]'));
    await enter('form input[type="number"]', '7.2');
    await click(button('Edit', rows()[1]));
    expect(page.querySelectorAll('form')).toHaveLength(1);
    expect(element<HTMLInputElement>('form input[type="number"]').value).toBe('108');
    await click(button('Cancel', element('form')));
    expect(rows()[0].textContent).toContain('6.5');
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
    expect(rows()[0].textContent).toContain('149');
    expect(rows()[0].querySelector('time')?.dateTime).toBe('2026-10-21');
    expect(document.activeElement).toBe(edit);
    expect(page.querySelector('form')).toBeNull();
    expect(page.textContent).toContain('Record updated.');
  });

  it('keeps edit inputs and the original record after a rejected update', async () => {
    await load();
    await click(button('Edit', rows()[0]));
    await enter('form input[type="number"]', '6.9');
    await submit();
    updateResponse.error(new HttpErrorResponse({ status: 429 }));
    await Promise.resolve();
    await fixture.whenStable();
    expect(element('[role="alert"]').textContent).toContain('Too many attempts');
    expect(element<HTMLInputElement>('form input[type="number"]').value).toBe('6.9');
    expect(element('form').getAttribute('aria-busy')).toBe('false');
    expect(rows()[0].textContent).toContain('6.5');
  });

  it('cancels deletion without making an HTTP request', async () => {
    await load();
    await click(button('Delete', rows()[1]));
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Blood Glucose');
    expect(dialog.textContent).toContain('108 mg/dL');
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
    expect(page.textContent).toContain('Record deleted.');
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
    expect(dialog.textContent).toContain('Unable to delete your record');
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

  it('does not silently edit or discard data for records outside the single-result contract', async () => {
    const unsupported = record('multiple', 'GLU', 100, '2026-10-10');
    unsupported.examResults.push({
      id: 'second',
      examRecordId: 'multiple',
      label: 'Other result',
      value: 110,
      unit: 'mg/dL',
    });
    await load([unsupported]);
    expect(rows()[0].textContent).toContain('110');
    expect(button('Edit', rows()[0]).disabled).toBe(true);
    expect(rows()[0].textContent).toContain('Editing is available for records with one result.');
    expect(updateById).not.toHaveBeenCalled();
  });
});
