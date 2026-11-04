import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '../../../../core/config/api-url';
import { Settings as SettingsModel } from '../../models/settings';
import { Settings } from './settings';

const initialSettings: SettingsModel = {
  defaultTrendsExam: 'HBA1C',
  language: 'en',
  hba1cReminderEnabled: true,
  hba1cReminderInterval: 3,
  glucoseReminderEnabled: false,
  glucoseReminderInterval: 1,
};

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;
  let page: HTMLElement;
  let http: HttpTestingController;
  const url = `${API_URL}/settings`;

  async function render(): Promise<void> {
    await Promise.resolve();
    await fixture.whenStable();
  }

  function select(id: string): HTMLSelectElement {
    const control = page.querySelector<HTMLSelectElement>(`#${id}`);
    if (!control) throw new Error(`Missing select: ${id}`);
    return control;
  }

  function checkbox(id: string): HTMLInputElement {
    const control = page.querySelector<HTMLInputElement>(`#${id}`);
    if (!control) throw new Error(`Missing checkbox: ${id}`);
    return control;
  }

  function button(label: string): HTMLButtonElement {
    const control = [...page.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === label,
    );
    if (!control) throw new Error(`Missing button: ${label}`);
    return control;
  }

  async function choose(id: string, value: string): Promise<void> {
    const control = select(id);
    control.value = value;
    control.dispatchEvent(new Event('input'));
    control.dispatchEvent(new Event('change'));
    await render();
  }

  function submit(): void {
    page
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  async function load(settings = initialSettings): Promise<void> {
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(settings);
    await render();
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
  });

  afterEach(() => http.verify());

  it('loads the existing settings into one labelled form with only the supported language', async () => {
    expect(page.textContent).toContain('Loading your settings…');
    expect(page.querySelector('form')).toBeNull();
    await load({ ...initialSettings, defaultTrendsExam: 'GLU' });
    expect(page.querySelectorAll('form')).toHaveLength(1);
    expect(select('settings-default-exam').value).toBe('GLU');
    expect([...select('settings-default-exam').options].map((option) => option.text)).toEqual([
      'Hemoglobin A1c',
      'Blood Glucose',
    ]);
    expect(
      [...select('settings-language').options].map((option) => [option.value, option.text]),
    ).toEqual([['en', 'English']]);
    expect(checkbox('settings-hba1c-reminder').checked).toBe(true);
    expect(checkbox('settings-glucose-reminder').checked).toBe(false);
    expect(select('settings-hba1c-interval').value).toBe('3');
    expect(select('settings-glucose-interval').value).toBe('1');
    for (const control of page.querySelectorAll('select, input')) {
      expect(page.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    }
    expect(page.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    expect(page.querySelectorAll('button[type="submit"]')).toHaveLength(1);
  });

  it('shows a safe load error and supports retry', async () => {
    http.expectOne(url).flush('Internal details', { status: 500, statusText: 'Error' });
    await render();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to load your settings.',
    );
    expect(page.textContent).not.toContain('Internal details');
    expect(page.querySelector('form')).toBeNull();
    button('Try again').click();
    await render();
    expect(page.textContent).toContain('Loading your settings…');
    await load();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(page.querySelector('form')).not.toBeNull();
  });

  it('independently disables each interval while keeping its value visible and preserved', async () => {
    await load();
    expect(select('settings-hba1c-interval').disabled).toBe(false);
    expect(select('settings-glucose-interval').disabled).toBe(true);
    checkbox('settings-hba1c-reminder').click();
    checkbox('settings-glucose-reminder').click();
    await render();
    expect(select('settings-hba1c-interval').disabled).toBe(true);
    expect(select('settings-hba1c-interval').value).toBe('3');
    expect(select('settings-glucose-interval').disabled).toBe(false);
    await choose('settings-glucose-interval', '6');
    checkbox('settings-glucose-reminder').click();
    await render();
    expect(select('settings-glucose-interval').disabled).toBe(true);
    expect(select('settings-glucose-interval').value).toBe('6');
    checkbox('settings-glucose-reminder').click();
    await render();
    expect(select('settings-glucose-interval').value).toBe('6');
    expect([...select('settings-glucose-interval').options].map((option) => option.text)).toEqual([
      '1 month',
      '2 months',
      '3 months',
      '6 months',
      '12 months',
    ]);
    http.expectNone(url);
  });

  it('blocks duplicate submits, preserves edits on failure and resets from PUT without another GET', async () => {
    await load();
    await choose('settings-default-exam', 'GLU');
    await choose('settings-hba1c-interval', '12');
    checkbox('settings-hba1c-reminder').click();
    checkbox('settings-glucose-reminder').click();
    await render();
    await choose('settings-glucose-interval', '2');
    const expected: SettingsModel = {
      ...initialSettings,
      defaultTrendsExam: 'GLU',
      hba1cReminderEnabled: false,
      hba1cReminderInterval: 12,
      glucoseReminderEnabled: true,
      glucoseReminderInterval: 2,
    };
    submit();
    await render();
    expect(button('Saving…').disabled).toBe(true);
    expect(page.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    for (const control of page.querySelectorAll('input, select')) {
      expect(control.matches(':disabled')).toBe(true);
    }
    submit();
    await render();
    const update = http.expectOne(url);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual(expected);
    expect(update.request.params.keys()).toEqual([]);
    update.flush('Internal details', { status: 500, statusText: 'Error' });
    await render();
    expect(select('settings-default-exam').value).toBe('GLU');
    expect(select('settings-hba1c-interval').value).toBe('12');
    expect(select('settings-glucose-interval').value).toBe('2');
    expect(checkbox('settings-hba1c-reminder').checked).toBe(false);
    expect(checkbox('settings-glucose-reminder').checked).toBe(true);
    expect(button('Save changes').disabled).toBe(false);
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to update your settings.',
    );
    expect(page.textContent).not.toContain('Internal details');

    submit();
    await render();
    const returned = { ...initialSettings, hba1cReminderInterval: 6 };
    const retry = http.expectOne(url);
    expect(retry.request.body).toEqual(expected);
    retry.flush(returned);
    await render();
    expect(select('settings-default-exam').value).toBe('HBA1C');
    expect(select('settings-hba1c-interval').value).toBe('6');
    expect(select('settings-glucose-interval').value).toBe('1');
    expect(checkbox('settings-hba1c-reminder').checked).toBe(true);
    expect(checkbox('settings-glucose-reminder').checked).toBe(false);
    expect(select('settings-glucose-interval').disabled).toBe(true);
    expect(button('Save changes').disabled).toBe(false);
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(page.textContent).toContain('Settings updated.');
    http.expectNone(url);

    submit();
    await render();
    const nextUpdate = http.expectOne(url);
    expect(nextUpdate.request.body).toEqual(returned);
    nextUpdate.flush(returned);
    await render();
  });
});
