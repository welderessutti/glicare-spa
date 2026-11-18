import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '../../../../core/config/api-url';
import { ExamResultDefinition } from '../../../records/models/exam-result-definition';
import { ExamType } from '../../../records/models/exam-type';
import { TrendPoint } from '../../models/trend-point';
import { TrendResponse } from '../../models/trend-response';
import { Trends } from './trends';

const catalog: ExamType[] = [
  { id: 'panel', code: 'PANEL', name: 'Backend panel', active: true, resultSchemas: [] },
  { id: 'thyroid', code: 'TSH', name: 'Backend thyroid exam', active: true, resultSchemas: [] },
  { id: 'retired', code: 'RETIRED', name: 'Retired exam', active: false, resultSchemas: [] },
];
const fields: ExamResultDefinition[] = [
  { id: 'first', code: 'FIRST', label: 'First measurement', unit: 'unit A', active: true },
  { id: 'second', code: 'SECOND', label: 'Second measurement', unit: 'unit B', active: false },
];
const points: TrendPoint[] = [
  { examDate: '2026-10-01', value: 7 },
  { examDate: '2026-10-02', value: 6.8 },
  { examDate: '2026-10-11', value: 6.5 },
];
function response(type = 'PANEL', definition = fields[0], data = points): TrendResponse {
  return {
    examType: { code: type, name: catalog.find((item) => item.code === type)?.name ?? type },
    resultDefinition: {
      code: definition.code,
      label: definition.label,
      unit: definition.unit,
      active: definition.active,
    },
    points: data,
  };
}

describe('Trends', () => {
  let fixture: ComponentFixture<Trends>;
  let page: HTMLElement;
  let http: HttpTestingController;
  const settingsUrl = `${API_URL}/settings`;
  const catalogUrl = `${API_URL}/exam-types`;
  const trendsUrl = `${API_URL}/trends`;

  async function render(): Promise<void> {
    await fixture.whenStable();
  }
  function examSelect(): HTMLSelectElement {
    const select = page.querySelector<HTMLSelectElement>('#trends-exam-type');
    if (!select) throw new Error('Missing Exam selector');
    return select;
  }
  function fieldSelect(): HTMLSelectElement {
    const select = page.querySelector<HTMLSelectElement>('#trends-result-series');
    if (!select) throw new Error('Missing Result selector');
    return select;
  }
  async function selectExam(code: string): Promise<void> {
    examSelect().value = code;
    examSelect().dispatchEvent(new Event('change'));
    await render();
  }
  async function selectField(code: string): Promise<void> {
    fieldSelect().value = code;
    fieldSelect().dispatchEvent(new Event('change'));
    await render();
  }
  async function initialize(code: string | undefined = 'PANEL', types = catalog): Promise<void> {
    const settings = http.expectOne(settingsUrl);
    expect(settings.request.method).toBe('GET');
    settings.flush({ defaultTrendsExam: code, language: 'en' });
    const request = http.expectOne(catalogUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(types);
    await render();
  }
  function definitionsRequest(type = 'PANEL') {
    const request = http.expectOne(`${catalogUrl}/${encodeURIComponent(type)}/result-definitions`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    return request;
  }
  async function loadDefinitions(definitions = fields, type = 'PANEL'): Promise<void> {
    definitionsRequest(type).flush(definitions);
    await render();
  }
  function trendRequest(type = 'PANEL', definition = fields[0].code) {
    const request = http.expectOne(`${trendsUrl}?examType=${type}&resultDefinition=${definition}`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['examType', 'resultDefinition']);
    return request;
  }
  async function loadTrend(data = points, type = 'PANEL', definition = fields[0]): Promise<void> {
    trendRequest(type, definition.code).flush(response(type, definition, data));
    await render();
  }
  async function loaded(definitions = fields, data = points): Promise<void> {
    await initialize();
    await loadDefinitions(definitions);
    await loadTrend(data, 'PANEL', definitions[0]);
  }
  async function retry(): Promise<void> {
    const button = page.querySelector('button');
    if (!button) throw new Error('Missing retry');
    expect(button.textContent).toContain('Try again');
    button.click();
    await render();
  }
  function text(selector: string): string {
    return (page.querySelector(selector)?.textContent ?? '').trim().replace(/\s+/g, ' ');
  }
  function summary(): string[] {
    return [...page.querySelectorAll('dd')].map((item) =>
      (item.textContent ?? '').trim().replace(/\s+/g, ' '),
    );
  }
  function noChart(): void {
    expect(page.querySelector('figure, dl, table')).toBeNull();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trends],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Trends);
    page = fixture.nativeElement as HTMLElement;
    await render();
  });
  afterEach(() => {
    http.expectNone((req) => req.url === `${API_URL}/exam-records`);
    http.verify();
  });

  it('waits for initialization, uses the saved exam, and loads Definitions before trend data', async () => {
    expect(examSelect().disabled).toBe(true);
    expect(text('[role="status"]')).toContain('Loading your preferences and exam types');
    http.expectOne(settingsUrl).flush({ defaultTrendsExam: 'TSH', language: 'en' });
    await render();
    http.expectNone((req) => req.url === trendsUrl || req.url.includes('/result-definitions'));
    http.expectOne(catalogUrl).flush(catalog);
    await render();
    expect(examSelect().value).toBe('TSH');
    expect(examSelect().disabled).toBe(false);
    expect([...examSelect().options].map((option) => [option.value, option.text])).toEqual([
      ['PANEL', 'Backend panel'],
      ['TSH', 'Backend thyroid exam'],
      ['RETIRED', 'Retired exam'],
    ]);
    expect(text('[role="status"]')).toContain('Loading result fields');
    noChart();
    http.expectNone((req) => req.url === trendsUrl);
    await loadDefinitions([fields[0]], 'TSH');
    expect(text('[role="status"]')).toContain('Loading trend data');
    noChart();
    await loadTrend(points, 'TSH');
    expect(summary()).toEqual(['6.5 unit A', '6.8 unit A', '-0.3 unit A']);
  });

  it('waits when the catalog arrives before Settings', async () => {
    http.expectOne(catalogUrl).flush(catalog);
    await render();
    expect(examSelect().disabled).toBe(true);
    http.expectNone((req) => req.url.includes('/result-definitions'));
    http.expectOne(settingsUrl).flush({ defaultTrendsExam: 'TSH', language: 'en' });
    await render();
    await loadDefinitions([fields[0]], 'TSH');
    await loadTrend([], 'TSH');
  });

  it.each(['UNKNOWN', ''])('falls back to the first catalog exam for default %s', async (code) => {
    await initialize(code, [catalog[2], catalog[0]]);
    expect(examSelect().value).toBe('RETIRED');
    await loadDefinitions([fields[1]], 'RETIRED');
    await loadTrend(points, 'RETIRED', fields[1]);
    expect(summary()[0]).toBe('6.5 unit B');
  });

  it('falls back to the first exam when the preference response has no default', async () => {
    http.expectOne(settingsUrl).flush({ language: 'en' });
    http.expectOne(catalogUrl).flush(catalog);
    await render();
    expect(examSelect().value).toBe('PANEL');
    await loadDefinitions([]);
  });

  it('respects an inactive saved exam and accepts inactive Definitions', async () => {
    await initialize('RETIRED');
    await loadDefinitions([fields[1]], 'RETIRED');
    expect(page.querySelector('#trends-result-series')).toBeNull();
    await loadTrend(points, 'RETIRED', fields[1]);
    expect(summary()).toEqual(['6.5 unit B', '6.8 unit B', '-0.3 unit B']);
    expect(text('h2')).toBe('Retired exam — Second measurement trend');
  });

  it.each(['settings first', 'catalog first'])(
    'continues after Settings failure (%s)',
    async (order) => {
      const settings = http.expectOne(settingsUrl),
        types = http.expectOne(catalogUrl);
      if (order === 'catalog first') types.flush(catalog);
      settings.flush('private preferences', { status: 500, statusText: 'Error' });
      if (order === 'settings first') types.flush(catalog);
      await render();
      expect(examSelect().value).toBe('PANEL');
      expect(page.querySelector('[role="alert"]')).toBeNull();
      await loadDefinitions([fields[0]]);
      await loadTrend();
      expect(examSelect().disabled).toBe(false);
      expect(page.textContent).not.toContain('private preferences');
    },
  );

  it.each([false, true])(
    'blocks only on catalog failure and retries initialization (Settings failure: %s)',
    async (settingsFails) => {
      const settings = http.expectOne(settingsUrl);
      if (settingsFails)
        settings.flush('private preferences', { status: 500, statusText: 'Error' });
      else settings.flush({ defaultTrendsExam: 'PANEL', language: 'en' });
      http.expectOne(catalogUrl).flush('private catalog', { status: 500, statusText: 'Error' });
      await render();
      expect(text('[role="alert"]')).toBe('Unable to load exam types.');
      expect(examSelect().disabled).toBe(true);
      noChart();
      expect(page.textContent).not.toContain('private');
      http.expectNone((req) => req.url === trendsUrl || req.url.includes('/result-definitions'));
      await retry();
      await initialize();
      await loadDefinitions([fields[0]]);
      await loadTrend();
      expect(page.querySelector('[role="alert"]')).toBeNull();
    },
  );

  it('shows an empty ExamType catalog without any dependent requests', async () => {
    await initialize('PANEL', []);
    expect(text('section')).toContain('No exams are available.');
    expect(examSelect().disabled).toBe(true);
    noChart();
    http.expectNone((req) => req.url === trendsUrl || req.url.includes('/result-definitions'));
  });

  it('shows metric catalog emptiness and never requests trends for zero Definitions', async () => {
    await initialize();
    await loadDefinitions([]);
    expect(page.textContent).toContain('No result fields are available for this exam.');
    expect(page.textContent).not.toContain('No data yet');
    expect(page.querySelector('#trends-result-series')).toBeNull();
    noChart();
    http.expectNone(trendsUrl);
  });

  it('automatically requests a single Definition and hides the Result selector', async () => {
    await initialize();
    await loadDefinitions([fields[0]]);
    expect(page.querySelector('#trends-result-series')).toBeNull();
    expect(examSelect().disabled).toBe(false);
    await loadTrend([{ examDate: '2026-10-01', value: 1.234 }]);
    expect(page.querySelector('circle')?.getAttribute('cx')).toBe('320');
    expect(summary()).toEqual(['1.234 unit A', '—', '—']);
  });

  it('auto-selects the first of multiple Definitions in endpoint order, including an inactive first field', async () => {
    await initialize();
    await loadDefinitions([fields[1], fields[0]]);
    expect(fieldSelect().value).toBe('SECOND');
    expect([...fieldSelect().options].map((option) => option.text)).toEqual([
      'Second measurement (unit B)',
      'First measurement (unit A)',
    ]);
    await loadTrend(points, 'PANEL', fields[1]);
    expect(summary()[0]).toBe('6.5 unit B');
  });

  it('requests a new metric on Definition change without reloading any catalog', async () => {
    await loaded();
    await selectField('SECOND');
    noChart();
    expect(text('[role="status"]')).toBe('Loading trend data…');
    expect(examSelect().disabled).toBe(false);
    expect(fieldSelect().disabled).toBe(false);
    await loadTrend(
      [
        { examDate: '2026-10-01', value: 140 },
        { examDate: '2026-10-11', value: 150 },
      ],
      'PANEL',
      fields[1],
    );
    expect(summary()).toEqual(['150 unit B', '140 unit B', '+10 unit B']);
    expect(text('thead')).toContain('Second measurement (unit B)');
    expect(text('figcaption')).toContain('Second measurement by exam date · unit B');
    expect(page.querySelectorAll('tbody tr')).toHaveLength(2);
    http.expectNone((req) => req.url === settingsUrl || req.url.startsWith(catalogUrl));
  });

  it('clears prior metadata, points and selection on ExamType change, then loads Definitions first', async () => {
    await loaded();
    await selectField('SECOND');
    await loadTrend(points, 'PANEL', fields[1]);
    await selectExam('TSH');
    noChart();
    expect(page.querySelector('#trends-result-series')).toBeNull();
    expect(page.textContent).not.toContain('unit B');
    expect(text('[role="status"]')).toContain('Loading result fields');
    http.expectNone(trendsUrl);
    await loadDefinitions([fields[0]], 'TSH');
    await loadTrend(points, 'TSH');
    expect(text('h2')).toBe('Backend thyroid exam — First measurement trend');
    http.expectNone(settingsUrl);
    http.expectNone(catalogUrl);
  });

  it('ignores unchanged or invalid ExamType and Definition selections', async () => {
    await loaded();
    await selectExam('PANEL');
    await selectField('FIRST');
    examSelect().add(new Option('Unknown', 'UNKNOWN'));
    await selectExam('UNKNOWN');
    fieldSelect().add(new Option('Unknown', 'UNKNOWN'));
    await selectField('UNKNOWN');
    expect(summary()).toEqual(['6.5 unit A', '6.8 unit A', '-0.3 unit A']);
    http.expectNone((req) => req.method === 'GET');
  });

  it('keeps Result options available when a valid metric has no points', async () => {
    await loaded();
    await selectField('SECOND');
    await loadTrend([], 'PANEL', fields[1]);
    expect(page.textContent).toContain('No data yet for this metric.');
    expect(page.textContent).not.toContain('No result fields');
    expect(fieldSelect().value).toBe('SECOND');
    expect(fieldSelect().disabled).toBe(false);
    noChart();
    await selectField('FIRST');
    await loadTrend();
    expect(summary()[0]).toBe('6.5 unit A');
  });

  it('uses chronological response points for summary, elapsed-time spacing and the accessible table', async () => {
    await loaded([fields[0]]);
    expect(summary()).toEqual(['6.5 unit A', '6.8 unit A', '-0.3 unit A']);
    expect(
      [...page.querySelectorAll('circle')].map((point) => Number(point.getAttribute('cx'))),
    ).toEqual([12, 73.6, 628]);
    expect([...page.querySelectorAll('tbody td')].map((item) => item.textContent?.trim())).toEqual([
      '7 unit A',
      '6.8 unit A',
      '6.5 unit A',
    ]);
    expect(text('caption')).toContain('Backend panel — First measurement results by exam date');
    expect(page.querySelector('th')?.getAttribute('scope')).toBe('col');
    expect(page.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(points.map((point) => point.value)).toEqual([7, 6.8, 6.5]);
  });

  it('uses analytical response metadata for heading, units, summary, caption and table', async () => {
    await initialize();
    await loadDefinitions([fields[0]]);
    const returned = response();
    returned.examType.name = 'Analytical exam';
    returned.resultDefinition.label = 'Analytical field';
    returned.resultDefinition.unit = 'canonical unit';
    trendRequest().flush(returned);
    await render();
    expect(text('h2')).toBe('Analytical exam — Analytical field trend');
    expect(summary()).toEqual(['6.5 canonical unit', '6.8 canonical unit', '-0.3 canonical unit']);
    expect(text('figcaption')).toContain('Analytical field by exam date · canonical unit');
    expect(text('thead')).toContain('Analytical field (canonical unit)');
  });

  it('renders unitless series without empty parentheses or unit separators', async () => {
    const unitless = { ...fields[0], unit: '', label: 'Count' };
    await loaded(
      [unitless],
      [
        { examDate: '2026-10-01', value: 2 },
        { examDate: '2026-10-02', value: 3 },
      ],
    );
    expect(summary()).toEqual(['3', '2', '+1']);
    expect(text('figcaption')).toBe('Count by exam date');
    expect(text('thead')).toContain('Count');
    expect(page.textContent).not.toContain('()');
  });

  it.each([0, -2, 0.0001])(
    'keeps equal values of %s and same-date points finite',
    async (value) => {
      await loaded(
        [fields[0]],
        [
          { examDate: '2026-10-01', value },
          { examDate: '2026-10-01', value },
        ],
      );
      expect(page.querySelector('polyline')?.getAttribute('points')).not.toMatch(/NaN|Infinity/);
      for (const point of page.querySelectorAll('circle')) {
        expect(Number(point.getAttribute('cx'))).toBe(320);
        expect(Number.isFinite(Number(point.getAttribute('cy')))).toBe(true);
      }
      expect(summary()[2]).toBe('0 unit A');
      expect(page.querySelectorAll('tbody tr')).toHaveLength(2);
    },
  );

  it('pads the selected values proportionally without exam-specific steps', async () => {
    await loaded(
      [fields[0]],
      [
        { examDate: '2026-10-01', value: 10 },
        { examDate: '2026-10-11', value: 30 },
      ],
    );
    expect(text('figure [aria-hidden="true"]')).toContain('32');
    expect(text('figure [aria-hidden="true"]')).toContain('8');
    for (const point of page.querySelectorAll('circle')) {
      const y = Number(point.getAttribute('cy'));
      expect(y).toBeGreaterThan(12);
      expect(y).toBeLessThan(228);
    }
  });

  it('ignores non-finite values and invalid dates without altering valid point order', async () => {
    await loaded(
      [fields[0]],
      [
        points[0],
        { examDate: '2026-10-02', value: Infinity },
        { examDate: 'invalid', value: 4 },
        { examDate: '2026-10-03', value: NaN },
        points[2],
      ],
    );
    expect(page.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(summary()).toEqual(['6.5 unit A', '7 unit A', '-0.5 unit A']);
    expect(page.querySelector('polyline')?.getAttribute('points')).not.toMatch(/NaN|Infinity/);
  });

  it('reports a safe trend error, hides old data, and retries only the selected analytical query', async () => {
    await loaded();
    await selectField('SECOND');
    trendRequest('PANEL', 'SECOND').flush('private query detail', {
      status: 500,
      statusText: 'Error',
    });
    await render();
    expect(text('[role="alert"]')).toBe('Unable to load trend data.');
    expect(page.textContent).not.toContain('private query');
    noChart();
    await retry();
    expect(text('[role="status"]')).toBe('Loading trend data…');
    await loadTrend(points, 'PANEL', fields[1]);
    expect(summary()[0]).toBe('6.5 unit B');
    http.expectNone((req) => req.url === settingsUrl || req.url.startsWith(catalogUrl));
  });

  it('retries only Definitions after a safe Definitions error', async () => {
    await initialize();
    definitionsRequest().flush('private fields', { status: 500, statusText: 'Error' });
    await render();
    expect(text('[role="alert"]')).toBe('Unable to load result fields.');
    expect(page.textContent).not.toContain('private fields');
    noChart();
    http.expectNone(trendsUrl);
    await retry();
    await loadDefinitions([fields[0]]);
    await loadTrend();
    http.expectNone(settingsUrl);
    http.expectNone(catalogUrl);
  });

  it('cancels old Definitions when switching exams while fields are loading', async () => {
    await initialize();
    const old = definitionsRequest();
    expect(examSelect().disabled).toBe(false);
    await selectExam('TSH');
    expect(old.cancelled).toBe(true);
    await loadDefinitions([fields[1]], 'TSH');
    await loadTrend(points, 'TSH', fields[1]);
    expect(text('h2')).toBe('Backend thyroid exam — Second measurement trend');
    http.expectNone((req) => req.url === trendsUrl);
  });

  it('cancels an old metric request when another Definition is selected while loading', async () => {
    await initialize();
    await loadDefinitions();
    const old = trendRequest();
    await selectField('SECOND');
    expect(old.cancelled).toBe(true);
    noChart();
    await loadTrend(points, 'PANEL', fields[1]);
    expect(summary()[0]).toBe('6.5 unit B');
    expect(text('h2')).toContain('Second measurement');
  });

  it('cancels old exam trend data and clears errors when switching exams', async () => {
    await initialize();
    await loadDefinitions();
    const old = trendRequest();
    await selectExam('TSH');
    expect(old.cancelled).toBe(true);
    noChart();
    await loadDefinitions([fields[1]], 'TSH');
    trendRequest('TSH', 'SECOND').flush('private', { status: 500, statusText: 'Error' });
    await render();
    await selectExam('RETIRED');
    expect(page.querySelector('[role="alert"]')).toBeNull();
    await loadDefinitions([], 'RETIRED');
    expect(page.textContent).toContain('No result fields are available');
  });

  it('cancels pending initialization requests when the page is destroyed', () => {
    const settings = http.expectOne(settingsUrl),
      types = http.expectOne(catalogUrl);
    fixture.destroy();
    expect(settings.cancelled).toBe(true);
    expect(types.cancelled).toBe(true);
  });
});
