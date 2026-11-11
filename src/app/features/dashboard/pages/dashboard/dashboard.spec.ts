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
import { ExamTypeCode, EXAM_UI_CONFIG } from '../../../records/models/exam-type-code';
import { Dashboard } from './dashboard';

function record(id: string, code: ExamTypeCode, value: number, examDate: string): ExamRecord {
  const resultDefinition = {
    id: `definition-${code}`,
    code: 'RESULT',
    label: EXAM_UI_CONFIG[code].resultLabel,
    unit: EXAM_UI_CONFIG[code].unit,
    active: true,
  };
  return {
    id,
    userId: 'test-user',
    createdAt: '2026-11-05T12:00:00Z',
    examDate: examDate,
    examType: { code, name: EXAM_UI_CONFIG[code].label },
    examResultSchema: { code: 'STANDARD', name: 'Standard', active: true },
    examResults: [
      {
        id: `result-${id}`,
        resultDefinition,
        value,
      },
    ],
  };
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let page: HTMLElement;
  let http: HttpTestingController;
  const user = signal<SessionAuthenticatedUser | null>(null);
  const hba1c = record('hba1c', 'HBA1C', 6.5, '2026-10-24');
  const glucose = record('glucose', 'GLU', 104, '2026-11-02');

  function requests() {
    const url = `${API_URL}/exam-records`;
    const pending = {
      latestHba1c: http.expectOne(`${url}?type=HBA1C&page=0&size=1&sort=examDate,desc`),
      latestGlucose: http.expectOne(`${url}?type=GLU&page=0&size=1&sort=examDate,desc`),
      recentRecords: http.expectOne(`${url}?page=0&size=5&sort=examDate,desc`),
    };
    for (const request of Object.values(pending)) {
      expect(request.request.method).toBe('GET');
    }
    return pending;
  }

  async function load(
    latestHba1c: ExamRecord[] = [hba1c],
    latestGlucose: ExamRecord[] = [glucose],
    recentRecords: ExamRecord[] = [glucose, hba1c],
  ): Promise<void> {
    const pending = requests();
    pending.latestHba1c.flush(latestHba1c);
    pending.latestGlucose.flush(latestGlucose);
    pending.recentRecords.flush(recentRecords);
    await fixture.whenStable();
  }

  function text(element: Element): string {
    return (element.textContent ?? '').trim().replace(/\s+/g, ' ');
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
    expect(page.textContent).toContain('Here’s an overview of your recent exam records.');

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

  it.each(['latestHba1c', 'latestGlucose', 'recentRecords'] as const)(
    'waits for all requests when %s finishes last',
    async (last) => {
      const pending = requests();
      expect(page.querySelector('[role="status"]')?.textContent).toContain(
        'Loading your dashboard…',
      );
      expect(page.querySelector('section')).toBeNull();
      expect(page.textContent).not.toContain('No records yet.');

      for (const key of ['latestHba1c', 'latestGlucose', 'recentRecords'] as const) {
        if (key !== last) pending[key].flush(key === 'latestHba1c' ? [hba1c] : [glucose]);
      }
      await fixture.whenStable();
      expect(page.querySelector('[role="status"]')).not.toBeNull();
      expect(page.querySelector('section')).toBeNull();

      pending[last].flush(last === 'latestHba1c' ? [hba1c] : [glucose]);
      await fixture.whenStable();
      expect(page.querySelector('[role="status"]')).toBeNull();
      expect(page.querySelectorAll('article')).toHaveLength(2);
      expect(page.querySelector('ul')).not.toBeNull();
    },
  );

  it('shows factual latest results and recent records using exam dates and configured units', async () => {
    await load();
    expect(Array.from(page.querySelectorAll('article h3'), text)).toEqual([
      'Latest Hemoglobin A1c',
      'Latest Blood Glucose',
    ]);
    expect(Array.from(page.querySelectorAll('article span'), text)).toEqual([
      '6.5',
      '%',
      '104',
      'mg/dL',
    ]);
    expect(Array.from(page.querySelectorAll('li p'), text)).toEqual([
      'Blood Glucose',
      'Nov 02, 2026',
      '104mg/dL',
      'Hemoglobin A1c',
      'Oct 24, 2026',
      '6.5%',
    ]);
    expect(Array.from(page.querySelectorAll('time'), (time) => time.dateTime)).toEqual([
      '2026-10-24',
      '2026-11-02',
      '2026-11-02',
      '2026-10-24',
    ]);
    expect(page.textContent).not.toContain('Nov 05, 2026');
    expect(page.textContent).not.toMatch(
      /Stable|Within target range|Health overview|Average|Improving|Worsening|Sample data|Coming soon|Last 7 days|View history/i,
    );
    expect(page.querySelector('figure, canvas, select, form')).toBeNull();
    expect(page.querySelectorAll('svg')).toHaveLength(1);
    expect(page.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('loads an older latest HbA1c independently of the five most recent glucose records', async () => {
    const recent = Array.from({ length: 5 }, (_, index) =>
      record(`glucose-${index}`, 'GLU', 104 - index, `2026-11-0${5 - index}`),
    );
    await load([hba1c], [recent[0]], recent);
    expect(page.querySelector('article')?.textContent).toContain('Oct 24, 2026');
    expect(
      Array.from(page.querySelectorAll('li time'), (time) => time.getAttribute('datetime')),
    ).toEqual(recent.map((item) => item.examDate));
    expect(page.querySelectorAll('li')).toHaveLength(5);
    expect(page.querySelector('ul')?.textContent).not.toContain('Hemoglobin A1c');
  });

  it('renders at most five recent records', async () => {
    const recent = Array.from({ length: 6 }, (_, index) =>
      record(`glucose-${index}`, 'GLU', 104 - index, `2026-10-${28 - index}`),
    );
    await load([hba1c], [recent[0]], recent);
    expect(page.querySelectorAll('li')).toHaveLength(5);
    expect(page.querySelector('ul')?.textContent).not.toContain('Oct 23, 2026');
    expect(recent).toHaveLength(6);
  });

  it.each(['HBA1C', 'GLU'] as const)(
    'shows an empty summary card when %s is absent',
    async (code) => {
      await load(code === 'HBA1C' ? [] : [hba1c], code === 'GLU' ? [] : [glucose], [
        code === 'HBA1C' ? glucose : hba1c,
      ]);
      const cards = page.querySelectorAll('article');
      const missing = cards[code === 'HBA1C' ? 0 : 1];
      const present = cards[code === 'HBA1C' ? 1 : 0];
      expect(missing.querySelector('h3')?.textContent).toBe(`Latest ${EXAM_UI_CONFIG[code].label}`);
      expect(missing.querySelector('p')?.textContent).toBe('No records yet.');
      expect(missing.querySelector('time')).toBeNull();
      expect(present.querySelector('time')).not.toBeNull();
      expect(page.querySelectorAll('li')).toHaveLength(1);
    },
  );

  it('shows empty cards and guidance without fictitious values when there are no records', async () => {
    await load([], [], []);
    expect(Array.from(page.querySelectorAll('article h3'), text)).toEqual([
      'Latest Hemoglobin A1c',
      'Latest Blood Glucose',
    ]);
    expect(Array.from(page.querySelectorAll('article p'), text)).toEqual([
      'No records yet.',
      'No records yet.',
    ]);
    expect(page.textContent?.match(/No records yet\./g)).toHaveLength(3);
    expect(page.textContent).toContain(
      'Add your first exam result to start tracking your history.',
    );
    expect(page.querySelector('ul, time')).toBeNull();
    expect(page.querySelectorAll('a')).toHaveLength(3);
    expect(page.querySelector('article span')).toBeNull();
  });

  it.each(['latestHba1c', 'latestGlucose', 'recentRecords'] as const)(
    'hides partial data when %s fails and retries the entire dashboard',
    async (failed) => {
      const pending = requests();
      for (const key of ['latestHba1c', 'latestGlucose', 'recentRecords'] as const) {
        if (key !== failed) pending[key].flush(key === 'latestHba1c' ? [hba1c] : [glucose]);
      }
      pending[failed].flush(
        { message: 'private database details' },
        { status: 500, statusText: 'Server Error' },
      );
      await fixture.whenStable();
      expect(page.querySelector('[role="alert"]')?.textContent).toContain(
        'Unable to load your dashboard.',
      );
      expect(page.querySelector('[role="status"]')).toBeNull();
      expect(page.querySelector('section, article, ul')).toBeNull();
      expect(page.textContent).not.toMatch(/private database|No records yet|6\.5|104/);

      const retry = page.querySelector('button');
      expect(retry?.textContent).toContain('Try again');
      retry?.click();
      await fixture.whenStable();
      expect(page.querySelector('[role="alert"]')).toBeNull();
      expect(page.querySelector('[role="status"]')).not.toBeNull();
      expect(page.querySelector('section')).toBeNull();
      await load();
      expect(page.querySelectorAll('article')).toHaveLength(2);
      expect(page.querySelector('button, [role="alert"], [role="status"]')).toBeNull();
    },
  );

  it.each([
    { label: 'Add new record', route: APP_NAVIGATION.RECORDS.route },
    { label: 'View records', route: APP_NAVIGATION.RECORDS.route },
    { label: 'View trends', route: APP_NAVIGATION.TRENDS.route },
  ])('navigates with RouterLink for $label', async ({ label, route }) => {
    await load();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const link = Array.from(page.querySelectorAll('a')).find((anchor) =>
      text(anchor).includes(label),
    );
    expect(link?.getAttribute('href')).toBe(route);
    link?.click();
    expect(navigate).toHaveBeenCalledOnce();
    const destination = navigate.mock.calls[0][0];
    expect(typeof destination === 'string' ? destination : router.serializeUrl(destination)).toBe(
      route,
    );
  });
});
