import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { API_URL } from '../../../../core/config/api-url';
import { ExamType } from '../../../records/models/exam-type';
import { ExamReminder } from '../../models/exam-reminder';
import { ReminderIntervalUnit } from '../../models/reminder-interval-unit';
import { Settings as SettingsModel } from '../../models/settings';
import { Settings } from './settings';

const initialSettings: SettingsModel = { defaultTrendsExam: 'PANEL', language: 'en' };
const catalog: ExamType[] = [
  { id: 'type-panel', code: 'PANEL', name: 'Backend panel', active: true },
  { id: 'type-tsh', code: 'TSH', name: 'Backend thyroid exam', active: true },
  {
    id: 'type-retired',
    code: 'RETIRED',
    name: 'Historical exam',
    active: false,
  },
];
const pausedReminder: ExamReminder = {
  id: 'panel',
  examType: { code: 'PANEL', name: 'Backend panel' },
  enabled: false,
  intervalValue: 2,
  intervalUnit: 'WEEK',
};
const historicalReminder: ExamReminder = {
  id: 'retired',
  examType: { code: 'RETIRED', name: 'Historical exam' },
  enabled: true,
  intervalValue: 1,
  intervalUnit: 'YEAR',
};

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;
  let page: HTMLElement;
  let http: HttpTestingController;
  let dialog: HTMLDialogElement;
  const settingsUrl = `${API_URL}/settings`;
  const catalogUrl = `${API_URL}/exam-types`;
  const remindersUrl = `${API_URL}/exam-reminders`;

  async function render(): Promise<void> {
    await Promise.resolve();
    await fixture.whenStable();
  }
  function element<T extends HTMLElement>(selector: string, parent: HTMLElement = page): T {
    const value = parent.querySelector<T>(selector);
    if (!value) throw new Error(`Missing element: ${selector}`);
    return value;
  }
  function button(label: string, parent: HTMLElement = page): HTMLButtonElement {
    const value = [...parent.querySelectorAll('button')].find((item) =>
      item.textContent?.trim().replace(/\s+/g, ' ').startsWith(label),
    );
    if (!value) throw new Error(`Missing button: ${label}`);
    return value;
  }
  async function click(control: HTMLButtonElement): Promise<void> {
    control.click();
    await render();
  }
  async function enter(selector: string, value: string): Promise<void> {
    const control = element<HTMLInputElement | HTMLSelectElement>(selector);
    control.value = value;
    control.dispatchEvent(new Event('input'));
    if (control instanceof HTMLSelectElement) control.dispatchEvent(new Event('change'));
    await render();
  }
  async function submit(selector: string): Promise<void> {
    element(selector).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await render();
  }
  function options(selector: string): string[] {
    return [...element<HTMLSelectElement>(selector).options].map((option) => option.value);
  }
  async function loadSettings(settings = initialSettings): Promise<void> {
    const request = http.expectOne(settingsUrl);
    expect(request.request.method).toBe('GET');
    request.flush(settings);
    await render();
  }
  async function loadCatalog(types = catalog): Promise<void> {
    const request = http.expectOne(catalogUrl);
    expect(request.request.method).toBe('GET');
    request.flush(types);
    await render();
  }
  async function loadReminders(reminders: ExamReminder[] = []): Promise<void> {
    const request = http.expectOne(remindersUrl);
    expect(request.request.method).toBe('GET');
    request.flush(reminders);
    await render();
  }
  async function load(reminders: ExamReminder[] = []): Promise<void> {
    await loadSettings();
    await loadCatalog();
    await loadReminders(reminders);
  }
  async function fillCreation(code = 'PANEL', unit: ReminderIntervalUnit = 'MONTH'): Promise<void> {
    await enter('#settings-reminder-exam', code);
    await enter('#settings-reminder-value', '3');
    await enter('#settings-reminder-unit', unit);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Settings);
    page = fixture.nativeElement as HTMLElement;
    await render();
    dialog = element<HTMLDialogElement>('dialog');
    dialog.showModal = vi.fn(() => {
      dialog.open = true;
    });
    dialog.close = vi.fn(() => {
      dialog.open = false;
      dialog.dispatchEvent(new Event('close'));
    });
  });
  afterEach(() => http.verify());

  it('loads three independent sources and offers all catalog exams as Trends defaults', async () => {
    expect(page.textContent).toContain('Loading your settings');
    expect(page.textContent).toContain('Loading exam types');
    expect(page.textContent).toContain('Loading reminders');
    expect(page.textContent).not.toContain('No exam reminders yet.');
    await loadSettings();
    expect(page.querySelector('#settings-preferences-form')).not.toBeNull();
    await loadReminders([pausedReminder, historicalReminder]);
    expect(element('#exam-reminder-panel').textContent).toContain('Backend panel');
    expect(element('#exam-reminder-retired').textContent).toContain('Historical exam');
    expect(button('Add reminder').disabled).toBe(true);
    await loadCatalog();
    expect(options('#settings-default-exam')).toEqual(['', 'PANEL', 'TSH', 'RETIRED']);
    expect(element<HTMLSelectElement>('#settings-default-exam').value).toBe('PANEL');
    expect(
      [...element<HTMLSelectElement>('#settings-default-exam').options].map(
        (option) => option.text,
      ),
    ).toEqual([
      'Choose an exam',
      'Backend panel',
      'Backend thyroid exam',
      'Historical exam (Inactive)',
    ]);
    expect(options('#settings-language')).toEqual(['en']);
    expect(element<HTMLSelectElement>('#settings-language').selectedOptions[0].text).toBe(
      'English',
    );
    expect(element<HTMLInputElement>('#reminder-panel-enabled').checked).toBe(false);
    for (const control of page.querySelectorAll('input, select')) {
      expect(page.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    }
  });

  it('keeps reminders available after preference loading fails and retries only preferences', async () => {
    await loadCatalog();
    await loadReminders([historicalReminder]);
    http.expectOne(settingsUrl).flush('private detail', { status: 500, statusText: 'Error' });
    await render();
    expect(page.textContent).toContain('Unable to load your settings.');
    expect(page.textContent).not.toContain('private detail');
    expect(element('#exam-reminder-retired').textContent).toContain('Historical exam');
    await click(button('Try again loading preferences'));
    await loadSettings();
    http.expectNone(catalogUrl);
    http.expectNone(remindersUrl);
    expect(page.querySelector('#settings-preferences-form')).not.toBeNull();
  });

  it('preserves successful sections when the catalog fails and retries catalog loading', async () => {
    await loadSettings();
    await loadReminders([pausedReminder]);
    http.expectOne(catalogUrl).flush('private detail', { status: 500, statusText: 'Error' });
    await render();
    expect(page.textContent).toContain('Unable to load exam types.');
    expect(element('#exam-reminder-panel')).not.toBeNull();
    expect(element<HTMLSelectElement>('#settings-default-exam').disabled).toBe(true);
    expect(element<HTMLSelectElement>('#settings-language').disabled).toBe(false);
    expect(button('Add reminder').disabled).toBe(true);
    expect(element('#reminder-panel-enabled').matches(':disabled')).toBe(true);
    expect(button('Save changes', element('#exam-reminder-panel')).disabled).toBe(true);
    expect(button('Delete', element('#exam-reminder-panel')).disabled).toBe(false);
    await click(button('Try again loading exam types'));
    await loadCatalog();
    expect(element<HTMLSelectElement>('#settings-default-exam').disabled).toBe(false);
    expect(element('#reminder-panel-enabled').matches(':disabled')).toBe(false);
    expect(page.textContent).not.toContain('Unable to load exam types.');
    http.expectNone(settingsUrl);
    http.expectNone(remindersUrl);
  });

  it('handles reminder failures independently without showing a false empty state', async () => {
    await loadSettings();
    await loadCatalog();
    http.expectOne(remindersUrl).flush('private detail', { status: 500, statusText: 'Error' });
    await render();
    expect(page.textContent).toContain('Unable to load reminders.');
    expect(page.textContent).not.toContain('No exam reminders yet.');
    expect(page.querySelector('#settings-preferences-form')).not.toBeNull();
    expect(button('Add reminder').disabled).toBe(true);
    await click(button('Try again loading reminders'));
    await loadReminders();
    expect(page.textContent).toContain('No exam reminders yet.');
    expect(button('Add reminder').disabled).toBe(false);
    http.expectNone(settingsUrl);
    http.expectNone(catalogUrl);
  });

  it('updates only preferences, prevents duplicates and preserves edits on failure', async () => {
    await load([pausedReminder]);
    await enter('#settings-default-exam', 'TSH');
    await submit('#settings-preferences-form');
    await submit('#settings-preferences-form');
    const request = http.expectOne(settingsUrl);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ defaultTrendsExam: 'TSH', language: 'en' });
    expect(element('#settings-language').matches(':disabled')).toBe(true);
    expect(element('#reminder-panel-value').matches(':disabled')).toBe(false);
    request.flush('private detail', { status: 500, statusText: 'Error' });
    await render();
    expect(element<HTMLSelectElement>('#settings-default-exam').value).toBe('TSH');
    expect(element('#settings-preferences-form').textContent).toContain(
      'Unable to update your settings.',
    );
    expect(page.textContent).not.toContain('private detail');
    await submit('#settings-preferences-form');
    const retry = http.expectOne(settingsUrl);
    expect(retry.request.body).toEqual({ defaultTrendsExam: 'TSH', language: 'en' });
    retry.flush(initialSettings);
    await render();
    expect(element<HTMLSelectElement>('#settings-default-exam').value).toBe('PANEL');
    expect(page.textContent).toContain('Settings updated.');
    http.expectNone(settingsUrl);
    http.expectNone(remindersUrl);
  });

  it('keeps an inactive default valid and allows selecting and saving it again', async () => {
    await loadSettings({ defaultTrendsExam: 'RETIRED', language: 'en' });
    await loadCatalog();
    await loadReminders();
    const select = element<HTMLSelectElement>('#settings-default-exam');
    expect(select.value).toBe('RETIRED');
    expect([...select.options].find((option) => option.value === 'RETIRED')?.disabled).toBe(false);
    await submit('#settings-preferences-form');
    const savedDefault = http.expectOne(settingsUrl);
    expect(savedDefault.request.body).toEqual({ defaultTrendsExam: 'RETIRED', language: 'en' });
    savedDefault.flush({ defaultTrendsExam: 'RETIRED', language: 'en' });
    await render();
    await enter('#settings-default-exam', 'TSH');
    expect(options('#settings-default-exam')).toContain('RETIRED');
    await enter('#settings-default-exam', 'RETIRED');
    await submit('#settings-preferences-form');
    const request = http.expectOne(settingsUrl);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ defaultTrendsExam: 'RETIRED', language: 'en' });
    request.flush({ defaultTrendsExam: 'RETIRED', language: 'en' });
    await render();
    expect(select.value).toBe('RETIRED');
    expect(page.textContent).not.toContain('Current selection (unavailable)');
  });

  it('handles catalogs with no active exams without hiding existing reminders', async () => {
    await loadSettings();
    await loadCatalog([catalog[2]]);
    await loadReminders([historicalReminder]);
    expect(button('Add reminder').disabled).toBe(true);
    expect(page.textContent).toContain('No active exams are available for a new reminder.');
    expect(element('#exam-reminder-retired').textContent).toContain('Historical exam');
    expect(element<HTMLSelectElement>('#settings-default-exam').disabled).toBe(false);
    await enter('#settings-default-exam', 'RETIRED');
    await submit('#settings-preferences-form');
    const request = http.expectOne(settingsUrl);
    expect(request.request.body).toEqual({ defaultTrendsExam: 'RETIRED', language: 'en' });
    request.flush({ defaultTrendsExam: 'RETIRED', language: 'en' });
    await render();
  });

  it('excludes paused existing reminders and inactive exams from the add selector', async () => {
    await load([pausedReminder, historicalReminder]);
    await click(button('Add reminder'));
    expect(options('#settings-reminder-exam')).toEqual(['', 'TSH']);
    expect(document.activeElement).toBe(element('#settings-reminder-exam'));
    expect(options('#settings-reminder-unit')).toEqual(['DAY', 'WEEK', 'MONTH', 'YEAR']);
    await fillCreation('TSH', 'WEEK');
    await click(button('Cancel', element('#settings-create-reminder-form')));
    expect(document.activeElement).toBe(button('Add reminder'));
    await click(button('Add reminder'));
    expect(element<HTMLSelectElement>('#settings-reminder-exam').value).toBe('');
    expect(element<HTMLInputElement>('#settings-reminder-value').value).toBe('');
    expect(element<HTMLSelectElement>('#settings-reminder-unit').value).toBe('MONTH');
  });

  it('requires an exam, a positive integer interval and an interval unit before creation', async () => {
    await load();
    await click(button('Add reminder'));
    await submit('#settings-create-reminder-form');
    expect(document.activeElement).toBe(element('#settings-reminder-exam'));
    await enter('#settings-reminder-exam', 'PANEL');
    await submit('#settings-create-reminder-form');
    expect(document.activeElement).toBe(element('#settings-reminder-value'));
    expect(element('#settings-reminder-value-error').textContent).toContain('Enter an interval.');
    const interval = element<HTMLInputElement>('#settings-reminder-value');
    expect(interval.min).toBe('1');
    expect(interval.step).toBe('1');
    for (const value of ['0', '-1', '1.5', '0.25', '3.7']) {
      await enter('#settings-reminder-value', value);
      await submit('#settings-create-reminder-form');
      expect(document.activeElement).toBe(interval);
      expect(element('#settings-reminder-value-error').textContent).toContain(
        'Enter a whole number greater than zero.',
      );
      http.expectNone((request) => request.method === 'POST');
    }
    await enter('#settings-reminder-value', '1');
    await enter('#settings-reminder-unit', '');
    await submit('#settings-create-reminder-form');
    expect(document.activeElement).toBe(element('#settings-reminder-unit'));
    http.expectNone((request) => request.method === 'POST');
  });

  it('rejects an inactive exam for creation even if its code is injected into the selector', async () => {
    await load();
    await click(button('Add reminder'));
    const select = element<HTMLSelectElement>('#settings-reminder-exam');
    expect(options('#settings-reminder-exam')).not.toContain('RETIRED');
    select.add(new Option('Historical exam', 'RETIRED'));
    await fillCreation('RETIRED');
    await submit('#settings-create-reminder-form');
    http.expectNone((request) => request.method === 'POST');
    expect(page.querySelector('#settings-create-reminder-form')).not.toBeNull();
  });

  it.each(['DAY', 'WEEK', 'MONTH', 'YEAR'] as const)(
    'creates a generic reminder with %s and uses the returned resource without reloading',
    async (unit) => {
      await load();
      await click(button('Add reminder'));
      await fillCreation('PANEL', unit);
      await submit('#settings-create-reminder-form');
      await submit('#settings-create-reminder-form');
      const request = http.expectOne(remindersUrl);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        examTypeCode: 'PANEL',
        intervalValue: 3,
        intervalUnit: unit,
      });
      expect(element('#settings-reminder-value').matches(':disabled')).toBe(true);
      expect(button('Cancel', element('#settings-create-reminder-form')).disabled).toBe(true);
      const returned: ExamReminder = {
        ...pausedReminder,
        enabled: true,
        intervalValue: 4,
        intervalUnit: unit,
      };
      request.flush(returned);
      await render();
      expect(page.querySelector('#settings-create-reminder-form')).toBeNull();
      expect(element<HTMLInputElement>('#reminder-panel-value').value).toBe('4');
      expect(element<HTMLSelectElement>('#reminder-panel-unit').value).toBe(unit);
      expect(element<HTMLInputElement>('#reminder-panel-enabled').checked).toBe(true);
      expect(page.textContent).toContain('Reminder added.');
      expect(document.activeElement).toBe(button('Add reminder'));
      await click(button('Add reminder'));
      expect(options('#settings-reminder-exam')).toEqual(['', 'TSH']);
      expect(element<HTMLInputElement>('#settings-reminder-value').value).toBe('');
      http.expectNone(remindersUrl);
      http.expectNone(settingsUrl);
      http.expectNone(catalogUrl);
    },
  );

  it('preserves creation values after failure and allows retry', async () => {
    await load();
    await click(button('Add reminder'));
    await fillCreation('TSH', 'YEAR');
    await submit('#settings-create-reminder-form');
    http.expectOne(remindersUrl).flush('private detail', { status: 409, statusText: 'Conflict' });
    await render();
    expect(element<HTMLSelectElement>('#settings-reminder-exam').value).toBe('TSH');
    expect(element<HTMLInputElement>('#settings-reminder-value').value).toBe('3');
    expect(element<HTMLSelectElement>('#settings-reminder-unit').value).toBe('YEAR');
    expect(element('#settings-create-reminder-form').textContent).toContain(
      'Unable to add reminder.',
    );
    expect(page.textContent).not.toContain('private detail');
    await submit('#settings-create-reminder-form');
    const request = http.expectOne(remindersUrl);
    expect(request.request.body).toEqual({
      examTypeCode: 'TSH',
      intervalValue: 3,
      intervalUnit: 'YEAR',
    });
    request.flush({
      id: 'thyroid',
      examType: { code: 'TSH', name: 'Backend thyroid exam' },
      enabled: true,
      intervalValue: 3,
      intervalUnit: 'YEAR',
    } satisfies ExamReminder);
    await render();
    expect(page.querySelector('#settings-create-reminder-form')).toBeNull();
    expect(element('#exam-reminder-thyroid')).not.toBeNull();
  });

  it('disables creation and restores section focus when all active exams already have reminders', async () => {
    await load([pausedReminder]);
    await click(button('Add reminder'));
    await fillCreation('TSH');
    await submit('#settings-create-reminder-form');
    http.expectOne(remindersUrl).flush({
      id: 'thyroid',
      examType: { code: 'TSH', name: 'Backend thyroid exam' },
      enabled: true,
      intervalValue: 3,
      intervalUnit: 'MONTH',
    } satisfies ExamReminder);
    await render();
    expect(button('Add reminder').disabled).toBe(true);
    expect(document.activeElement).toBe(element('#settings-reminders-title'));
    expect(page.textContent).toContain('No active exams are available for a new reminder.');
    expect(page.querySelectorAll('app-exam-reminder-item')).toHaveLength(2);
  });

  it('updates reminder fields only, preserves failed edits and keeps other reminder drafts', async () => {
    const otherReminder: ExamReminder = {
      ...pausedReminder,
      id: 'thyroid',
      examType: { code: 'TSH', name: 'Backend thyroid exam' },
    };
    await load([pausedReminder, otherReminder]);
    await enter('#reminder-thyroid-value', '7');
    element<HTMLInputElement>('#reminder-panel-enabled').click();
    await enter('#reminder-panel-value', '5');
    await enter('#reminder-panel-unit', 'YEAR');
    await submit('#exam-reminder-panel form');
    await submit('#exam-reminder-panel form');
    const request = http.expectOne(`${remindersUrl}/panel`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      enabled: true,
      intervalValue: 5,
      intervalUnit: 'YEAR',
    });
    expect(element('#reminder-panel-value').matches(':disabled')).toBe(true);
    expect(element('#reminder-thyroid-value').matches(':disabled')).toBe(false);
    request.flush('private detail', { status: 500, statusText: 'Error' });
    await render();
    expect(element<HTMLInputElement>('#reminder-panel-value').value).toBe('5');
    expect(element<HTMLSelectElement>('#reminder-panel-unit').value).toBe('YEAR');
    expect(element<HTMLInputElement>('#reminder-panel-enabled').checked).toBe(true);
    expect(element('#exam-reminder-panel').textContent).toContain('Unable to update reminder.');
    expect(page.textContent).not.toContain('private detail');
    element<HTMLInputElement>('#reminder-panel-enabled').click();
    await submit('#exam-reminder-panel form');
    const retry = http.expectOne(`${remindersUrl}/panel`);
    expect(retry.request.body).toEqual({
      enabled: false,
      intervalValue: 5,
      intervalUnit: 'YEAR',
    });
    retry.flush({ ...pausedReminder, intervalValue: 9, intervalUnit: 'MONTH' });
    await render();
    expect(element<HTMLInputElement>('#reminder-panel-value').value).toBe('9');
    expect(element<HTMLSelectElement>('#reminder-panel-unit').value).toBe('MONTH');
    expect(element<HTMLInputElement>('#reminder-thyroid-value').value).toBe('7');
    expect(element('#exam-reminder-panel').textContent).toContain('Reminder updated.');
    expect(element('#exam-reminder-panel').querySelectorAll('select')).toHaveLength(1);
    http.expectNone(remindersUrl);
    http.expectNone(settingsUrl);
    http.expectNone((request) => request.method === 'DELETE');
  });

  it('requires a positive integer existing reminder interval before update', async () => {
    await load([pausedReminder]);
    await enter('#reminder-panel-value', '');
    await submit('#exam-reminder-panel form');
    expect(document.activeElement).toBe(element('#reminder-panel-value'));
    expect(element('#reminder-panel-value-error').textContent).toContain('Enter an interval.');
    const interval = element<HTMLInputElement>('#reminder-panel-value');
    expect(interval.min).toBe('1');
    expect(interval.step).toBe('1');
    for (const value of ['0', '-1', '1.5', '0.25', '3.7']) {
      await enter('#reminder-panel-value', value);
      await submit('#exam-reminder-panel form');
      expect(document.activeElement).toBe(interval);
      expect(element('#reminder-panel-value-error').textContent).toContain(
        'Enter a whole number greater than zero.',
      );
      http.expectNone((request) => request.method === 'PUT');
    }
    await enter('#reminder-panel-value', '1');
    await submit('#exam-reminder-panel form');
    const request = http.expectOne(`${remindersUrl}/panel`);
    expect(request.request.body).toEqual({
      enabled: false,
      intervalValue: 1,
      intervalUnit: 'WEEK',
    });
    request.flush({ ...pausedReminder, intervalValue: 1 });
    await render();
    expect(element<HTMLInputElement>('#reminder-panel-value').value).toBe('1');
  });

  it('pauses and re-enables the same reminder while keeping its exam unavailable for creation', async () => {
    await load([{ ...pausedReminder, enabled: true }]);
    for (const enabled of [false, true]) {
      element<HTMLInputElement>('#reminder-panel-enabled').click();
      await submit('#exam-reminder-panel form');
      const request = http.expectOne(`${remindersUrl}/panel`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ enabled, intervalValue: 2, intervalUnit: 'WEEK' });
      request.flush({ ...pausedReminder, enabled });
      await render();
      expect(page.querySelectorAll('app-exam-reminder-item')).toHaveLength(1);
      expect(element<HTMLInputElement>('#reminder-panel-enabled').checked).toBe(enabled);
      await click(button('Add reminder'));
      expect(options('#settings-reminder-exam')).toEqual(['', 'TSH']);
      await click(button('Cancel', element('#settings-create-reminder-form')));
      http.expectNone(remindersUrl);
      http.expectNone(settingsUrl);
      http.expectNone(catalogUrl);
    }
  });

  it('cancels deletion without losing the reminder draft or sending DELETE', async () => {
    await load([pausedReminder]);
    await enter('#reminder-panel-value', '5');
    const trigger = button('Delete', element('#exam-reminder-panel'));
    await click(trigger);
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Backend panel');
    await click(button('Cancel', dialog));
    expect(dialog.open).toBe(false);
    expect(element<HTMLInputElement>('#reminder-panel-value').value).toBe('5');
    expect(document.activeElement).toBe(trigger);
    http.expectNone((request) => request.method === 'DELETE');
  });

  it('deletes by ID only and makes the exam available again without reloading', async () => {
    await load([pausedReminder]);
    await click(button('Delete', element('#exam-reminder-panel')));
    await click(button('Delete', dialog));
    await click(button('Deleting', dialog));
    const request = http.expectOne(`${remindersUrl}/panel`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    expect(page.querySelector('#exam-reminder-panel')).not.toBeNull();
    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await render();
    expect(page.querySelector('#exam-reminder-panel')).toBeNull();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(element('#settings-reminders-title'));
    expect(page.textContent).toContain('No exam reminders yet.');
    await click(button('Add reminder'));
    expect(options('#settings-reminder-exam')).toEqual(['', 'PANEL', 'TSH']);
    http.expectNone(remindersUrl);
    http.expectNone(settingsUrl);
    http.expectNone(catalogUrl);
  });

  it('retains the reminder after delete failure and supports retry', async () => {
    await load([historicalReminder]);
    await click(button('Delete', element('#exam-reminder-retired')));
    await click(button('Delete', dialog));
    http
      .expectOne(`${remindersUrl}/retired`)
      .flush('private detail', { status: 500, statusText: 'Error' });
    await render();
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Unable to delete reminder.');
    expect(page.querySelector('#exam-reminder-retired')).not.toBeNull();
    expect(page.textContent).not.toContain('private detail');
    await click(button('Delete', dialog));
    http
      .expectOne(`${remindersUrl}/retired`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await render();
    expect(page.querySelector('#exam-reminder-retired')).toBeNull();
  });

  it.each([
    ['inactive', historicalReminder],
    [
      'missing from the catalog',
      { ...historicalReminder, id: 'missing', examType: { code: 'UNKNOWN', name: 'Missing exam' } },
    ],
  ] as const)(
    'keeps a reminder whose exam is %s visible, disabled and deletable',
    async (_, reminder) => {
      await load([reminder]);
      const row = element(`#exam-reminder-${reminder.id}`);
      expect(row.textContent).toContain(reminder.examType.name);
      const enabled = element<HTMLInputElement>(`#reminder-${reminder.id}-enabled`);
      expect(enabled.checked).toBe(false);
      for (const control of row.querySelectorAll('input, select')) {
        expect(control.matches(':disabled')).toBe(true);
      }
      expect(button('Save changes', row).disabled).toBe(true);
      expect(button('Delete', row).disabled).toBe(false);
      enabled.click();
      await submit(`#exam-reminder-${reminder.id} form`);
      expect(enabled.checked).toBe(false);
      expect(reminder.enabled).toBe(true);
      http.expectNone((request) => request.method === 'PUT');
      http.expectNone(catalogUrl);
      await click(button('Delete', row));
      expect(dialog.open).toBe(true);
      expect(dialog.textContent).toContain(reminder.examType.name);
      await click(button('Delete', dialog));
      const request = http.expectOne(`${remindersUrl}/${reminder.id}`);
      expect(request.request.method).toBe('DELETE');
      expect(request.request.body).toBeNull();
      request.flush(null, { status: 204, statusText: 'No Content' });
      await render();
      expect(page.querySelector(`#exam-reminder-${reminder.id}`)).toBeNull();
      await click(button('Add reminder'));
      expect(options('#settings-reminder-exam')).toEqual(['', 'PANEL', 'TSH']);
      http.expectNone(remindersUrl);
      http.expectNone(catalogUrl);
    },
  );
});
