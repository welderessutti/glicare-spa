import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_URL } from '../../../../core/config/api-url';
import { APP_NAVIGATION } from '../../../../core/config/app-navigation';
import { SessionAuthenticatedUser } from '../../../../core/models/session-authenticated-user';
import { SessionService } from '../../../../core/services/session/session-service';
import { ExamRecord } from '../../../records/models/exam-record';
import { ExamResult } from '../../../records/models/exam-result';
import { Dashboard } from './dashboard';

function result(code: string, label: string, unit: string, value: number): ExamResult {
  return {
    id: `result-${code}`,
    resultDefinition: { id: `definition-${code}`, code, label, unit, active: true },
    value,
  };
}

function record(
  id: string,
  code: string,
  name: string,
  examDate: string,
  examResults: ExamResult[],
): ExamRecord {
  return {
    id,
    userId: 'test-user',
    createdAt: '2026-11-16T12:00:00Z',
    examDate,
    examType: { code, name },
    examResultSchema: { code: 'HIDDEN_SCHEMA', name: 'Hidden schema metadata', active: true },
    examResults,
  };
}

const panel = record('panel', 'PANEL', 'Backend panel', '2026-11-15', [
  result('PERCENT', 'Percentage', '%', 6.5),
  result('AVG', 'Estimated average', 'mg/dL', 140),
  result('SCORE', 'Score', '', 0),
]);
const thyroid = record('thyroid', 'TSH', 'Thyroid exam', '2026-11-14', [
  result('RESULT', 'Thyroid measurement', 'mIU/L', 1.234),
]);

function text(element: Element): string {
  return (element.textContent ?? '').trim().replace(/\s+/g, ' ');
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let page: HTMLElement;
  let http: HttpTestingController;
  const user = signal<SessionAuthenticatedUser | null>(null);
  const url = `${API_URL}/exam-records?page=0&size=6&sort=examDate,desc`;

  function request() {
    const pending = http.match(() => true);
    expect(pending).toHaveLength(1);
    expect(pending[0].request.method).toBe('GET');
    expect(pending[0].request.urlWithParams).toBe(url);
    return pending[0];
  }

  async function load(records: ExamRecord[] = [panel, thyroid]): Promise<void> {
    request().flush(records);
    await fixture.whenStable();
    http.expectNone(() => true);
  }

  function latest(): HTMLElement {
    const section = page.querySelector<HTMLElement>('[aria-labelledby="dashboard-latest-title"]');
    if (!section) throw new Error('Missing latest record');
    return section;
  }

  beforeEach(async () => {
    user.set({ id: 'test-user', fullName: '  John   Smith  ', email: 'john@example.com' });
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SessionService, useValue: { user: user.asReadonly() } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Dashboard);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('greets the session user by first name and reacts to session changes', async () => {
    await load();
    expect(page.querySelector('h1')?.textContent).toContain('Hello, John');
    user.set({ id: 'test-user', fullName: 'Maria Silva', email: 'maria@example.com' });
    await fixture.whenStable();
    expect(page.querySelector('h1')?.textContent).toContain('Hello, Maria');
  });

  it('uses a natural greeting when the session or name is unavailable', async () => {
    await load();
    user.set(null);
    await fixture.whenStable();
    expect(page.querySelector('h1')?.textContent).toContain('Welcome back');
    user.set({ id: 'test-user', fullName: '   ', email: 'john@example.com' });
    await fixture.whenStable();
    expect(page.querySelector('h1')?.textContent).toContain('Welcome back');
  });

  it('makes exactly one latest-six request and shows only loading content until it completes', async () => {
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Loading your dashboard…');
    expect(page.querySelector('section')).toBeNull();
    expect(page.textContent).not.toContain('No records yet.');
    await load();
    expect(page.querySelector('[role="status"]')).toBeNull();
    expect(page.querySelectorAll('article')).toHaveLength(1);
  });

  it('highlights the first record and renders all labels, values and units from its DTO', async () => {
    await load();
    const card = latest();
    expect(card.querySelector('h2')?.textContent?.trim()).toBe('Latest record');
    expect(card.querySelector('h3')?.textContent?.trim()).toBe('Backend panel');
    expect(card.querySelector('time')?.dateTime).toBe('2026-11-15');
    expect(card.querySelector('time')?.textContent?.trim()).toBe('Nov 15, 2026');
    expect(Array.from(card.querySelectorAll('dt'), text)).toEqual([
      'Percentage',
      'Estimated average',
      'Score',
    ]);
    const values = Array.from(card.querySelectorAll('dd'), text);
    expect(values[0]).toMatch(/^6\.5\s*%$/);
    expect(values[1]).toMatch(/^140\s*mg\/dL$/);
    expect(values[2]).toBe('0');
    expect(page.textContent).not.toMatch(/HIDDEN_SCHEMA|Hidden schema metadata|Nov 16, 2026/);
    expect(page.querySelector('form, select, canvas, figure')).toBeNull();
    expect(page.querySelectorAll('button')).toHaveLength(0);
  });

  it('renders a single-definition exam without exam-specific rounding', async () => {
    await load([thyroid]);
    expect(latest().querySelector('h3')?.textContent?.trim()).toBe('Thyroid exam');
    expect(Array.from(latest().querySelectorAll('dt'), text)).toEqual(['Thyroid measurement']);
    expect(text(latest().querySelector('dd')!)).toMatch(/^1\.234\s*mIU\/L$/);
    expect(page.querySelector('[aria-labelledby="dashboard-records-title"]')).toBeNull();
    expect(page.querySelector('ul')).toBeNull();
  });

  it('lists records two through six without duplicating the latest and renders every recent result', async () => {
    const records = [
      panel,
      ...Array.from({ length: 5 }, (_, index) =>
        record(
          `future-${index}`,
          'XYZ_FUTURE_EXAM',
          `Future exam ${index}`,
          `2026-11-${14 - index}`,
          [
            result('A', 'First measurement', 'units A', 10 - index),
            result('B', 'Second measurement', 'units B', 20 - index),
          ],
        ),
      ),
    ];
    await load(records);
    const rows = [...page.querySelectorAll('li')];
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => text(row.querySelector('h3')!))).toEqual(
      records.slice(1).map((item) => item.examType.name),
    );
    expect(rows.map((row) => row.querySelector('time')?.dateTime)).toEqual(
      records.slice(1).map((item) => item.examDate),
    );
    expect(page.querySelector('ul')?.textContent).not.toContain('Backend panel');
    for (const [index, row] of rows.entries()) {
      expect(Array.from(row.querySelectorAll('dt'), text)).toEqual([
        'First measurement:',
        'Second measurement:',
      ]);
      expect(Array.from(row.querySelectorAll('dd'), text)).toEqual([
        `${10 - index} units A`,
        `${20 - index} units B`,
      ]);
    }
    expect(records).toHaveLength(6);
  });

  it('caps the recent list at five even if the backend returns extra records', async () => {
    await load([
      panel,
      ...Array.from({ length: 7 }, (_, index) => ({
        ...thyroid,
        id: `thyroid-${index}`,
        examDate: `2026-11-${14 - index}`,
      })),
    ]);
    expect(page.querySelectorAll('li')).toHaveLength(5);
    expect(page.querySelector('ul')?.textContent).not.toContain('Nov 09, 2026');
  });

  it('shows one empty state with Add new record available and no fake record cards', async () => {
    await load([]);
    expect(page.textContent?.match(/No records yet\./g)).toHaveLength(1);
    expect(page.textContent).toContain(
      'Add your first exam result to start tracking your history.',
    );
    expect(page.querySelector('[aria-labelledby="dashboard-latest-title"]')).toBeNull();
    expect(page.querySelector('[aria-labelledby="dashboard-records-title"]')).toBeNull();
    expect(page.querySelector('article, ul, time, dl')).toBeNull();
    expect(
      [...page.querySelectorAll('a')]
        .find((anchor) => text(anchor) === 'Add new record')
        ?.getAttribute('href'),
    ).toBe(APP_NAVIGATION.RECORDS.route);
  });

  it('keeps inactive historical schemas and definitions visible without any catalog request', async () => {
    const historical: ExamRecord = {
      ...panel,
      examResultSchema: { ...panel.examResultSchema, active: false },
      examResults: panel.examResults.map((item) => ({
        ...item,
        resultDefinition: { ...item.resultDefinition, active: false },
      })),
    };
    await load([historical, { ...historical, id: 'older', examDate: '2026-11-01' }]);
    expect(latest().querySelectorAll('dt')).toHaveLength(3);
    expect(page.querySelectorAll('li dt')).toHaveLength(3);
    expect(latest().textContent).toContain('Backend panel');
    expect(page.querySelector('li')?.textContent).toContain('Estimated average');
  });

  it('handles records with no results safely without inventing values', async () => {
    await load([{ ...thyroid, examResults: [] }]);
    expect(latest().querySelector('h3')?.textContent?.trim()).toBe('Thyroid exam');
    expect(latest().querySelectorAll('dd')).toHaveLength(0);
  });

  it('shows a safe error and retries only the latest-six records request', async () => {
    request().flush(
      { message: 'private database details' },
      { status: 500, statusText: 'Server Error' },
    );
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to load your dashboard.',
    );
    expect(page.querySelector('section, article, ul')).toBeNull();
    expect(page.textContent).not.toMatch(/private database|No records yet|Backend panel/);
    page.querySelector('button')?.click();
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(page.querySelector('[role="status"]')).not.toBeNull();
    await load();
    expect(page.querySelectorAll('article')).toHaveLength(1);
    expect(page.querySelector('button, [role="alert"], [role="status"]')).toBeNull();
  });

  it.each([
    { label: 'Add new record', route: APP_NAVIGATION.RECORDS.route },
    { label: 'View records', route: APP_NAVIGATION.RECORDS.route },
    { label: 'View trends', route: APP_NAVIGATION.TRENDS.route },
  ])('navigates with RouterLink for $label', async ({ label, route }) => {
    await load();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const link = [...page.querySelectorAll('a')].find((anchor) => text(anchor).includes(label));
    expect(link?.getAttribute('href')).toBe(route);
    link?.click();
    expect(navigate).toHaveBeenCalledOnce();
    const destination = navigate.mock.calls[0][0];
    expect(typeof destination === 'string' ? destination : router.serializeUrl(destination)).toBe(
      route,
    );
  });
});
