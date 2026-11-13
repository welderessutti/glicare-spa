import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '../../../../core/config/api-url';
import { ExamRecord } from '../../../records/models/exam-record';
import { ExamResultDefinition } from '../../../records/models/exam-result-definition';
import { ExamResult } from '../../../records/models/exam-result';
import { ExamType } from '../../../records/models/exam-type';
import { Trends } from './trends';

const catalog: ExamType[] = [
  { id: 'type-panel', code: 'PANEL', name: 'Backend panel', active: true, resultSchemas: [] },
  { id: 'type-tsh', code: 'TSH', name: 'Backend thyroid exam', active: true, resultSchemas: [] },
  { id: 'type-old', code: 'RETIRED', name: 'Retired exam', active: false, resultSchemas: [] },
];

const defaultDefinitions: ExamResultDefinition[] = [
  {
    id: 'domain-result',
    code: 'RESULT',
    label: 'Reported measurement',
    unit: 'panel units',
    active: true,
  },
];
const panelDefinitions: ExamResultDefinition[] = [
  { id: 'domain-percent', code: 'PERCENT', label: 'Percentage', unit: '%', active: true },
  {
    id: 'domain-avg',
    code: 'AVG',
    label: 'Estimated average glucose',
    unit: 'mg/dL',
    active: false,
  },
];

function record(
  id: string,
  code: string,
  value: number,
  date: string,
  unit = 'panel units',
): ExamRecord {
  return {
    id,
    userId: 'server-user',
    createdAt: '2026-10-28T10:00:00Z',
    examDate: date,
    examType: { code, name: `Reported ${code}` },
    examResultSchema: { code: 'STANDARD', name: 'Standard', active: true },
    examResults: [
      {
        id: `result-${id}`,
        resultDefinition: {
          id: `definition-${code}`,
          code: 'RESULT',
          label: 'Reported measurement',
          unit,
          active: true,
        },
        value,
      },
    ],
  };
}

function result(
  id: string,
  code: string,
  unit: string,
  value: number,
  label = 'Result',
  active = true,
): ExamResult {
  return {
    id: `result-${id}`,
    resultDefinition: { id, code, label, unit, active },
    value,
  };
}

function panelRecord(id: string, date: string, examResults: ExamResult[]): ExamRecord {
  return { ...record(id, 'PANEL', 0, date), examResults };
}

describe('Trends', () => {
  let fixture: ComponentFixture<Trends>;
  let page: HTMLElement;
  let http: HttpTestingController;
  const recordsUrl = `${API_URL}/exam-records`;
  const settingsUrl = `${API_URL}/settings`;
  const catalogUrl = `${API_URL}/exam-types`;

  function selector(): HTMLSelectElement {
    const select = page.querySelector('select');
    if (!select) throw new Error('Missing exam selector');
    return select;
  }

  function request(code: string) {
    const pending = http.expectOne(`${recordsUrl}?type=${code}&sort=examDate,asc`);
    expect(pending.request.method).toBe('GET');
    expect(pending.request.params.keys().sort()).toEqual(['sort', 'type']);
    return pending;
  }

  async function initialize(defaultCode = 'TSH', types = catalog): Promise<void> {
    const settings = http.expectOne(settingsUrl);
    expect(settings.request.method).toBe('GET');
    settings.flush({ defaultTrendsExam: defaultCode, language: 'en' });
    const exams = http.expectOne(catalogUrl);
    expect(exams.request.method).toBe('GET');
    exams.flush(types);
    await fixture.whenStable();
  }

  function definitionsRequest(code: string) {
    const pending = http.expectOne(
      catalogUrl + '/' + encodeURIComponent(code) + '/result-definitions',
    );
    expect(pending.request.method).toBe('GET');
    return pending;
  }

  async function load(
    records: ExamRecord[],
    code = 'TSH',
    definitions = defaultDefinitions,
  ): Promise<void> {
    request(code).flush(records);
    await fixture.whenStable();
    if (records.some((record) => record.examType.code === code)) {
      definitionsRequest(code).flush(definitions);
      await fixture.whenStable();
    }
  }

  async function select(code: string): Promise<void> {
    selector().value = code;
    selector().dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  function resultSelector(): HTMLSelectElement {
    const select = page.querySelector<HTMLSelectElement>('#trends-result-series');
    if (!select) throw new Error('Missing result selector');
    return select;
  }

  async function selectDefinition(label: string): Promise<void> {
    const select = resultSelector();
    const option = [...select.options].find((option) => option.text === label);
    if (!option) throw new Error(`Missing result option: ${label}`);
    select.value = option.value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function retry(): Promise<void> {
    const button = page.querySelector('button');
    if (!button) throw new Error('Missing retry button');
    expect(button.textContent).toContain('Try again');
    button.click();
    await fixture.whenStable();
  }

  function text(selector: string): string {
    return (page.querySelector(selector)?.textContent ?? '').trim().replace(/\s+/g, ' ');
  }

  function summary(): string[] {
    return Array.from(page.querySelectorAll('dd'), (item) =>
      (item.textContent ?? '').trim().replace(/\s+/g, ' '),
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trends],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Trends);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('waits for settings and catalog, uses the saved default and shows active and inactive catalog options', async () => {
    expect(selector().value).toBe('');
    expect(selector().disabled).toBe(true);
    expect(page.querySelector('label')?.htmlFor).toBe(selector().id);
    expect(page.textContent).not.toContain('No data yet');
    http.expectNone((req) => req.url === recordsUrl);
    http.expectOne(settingsUrl).flush({ defaultTrendsExam: 'TSH', language: 'en' });
    await fixture.whenStable();
    http.expectNone((req) => req.url === recordsUrl);
    http.expectOne(catalogUrl).flush(catalog);
    await fixture.whenStable();
    expect(selector().value).toBe('TSH');
    expect([...selector().options].map((option) => [option.value, option.text])).toEqual([
      ['PANEL', 'Backend panel'],
      ['TSH', 'Backend thyroid exam'],
      ['RETIRED', 'Retired exam'],
    ]);
    expect(selector().disabled).toBe(true);
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Loading your records');
    await load([]);
    expect(selector().disabled).toBe(false);
  });

  it('also waits when the catalog arrives before settings', async () => {
    http.expectOne(catalogUrl).flush(catalog);
    await fixture.whenStable();
    expect(selector().disabled).toBe(true);
    http.expectNone((req) => req.url === recordsUrl);
    http.expectOne(settingsUrl).flush({ defaultTrendsExam: 'PANEL', language: 'en' });
    await fixture.whenStable();
    expect(selector().value).toBe('PANEL');
    await load([], 'PANEL');
  });

  it.each(['UNKNOWN', ''])(
    'falls back to the first catalog exam when the saved default is %s',
    async (defaultCode) => {
      await initialize(defaultCode, [catalog[2], catalog[0], catalog[1]]);
      expect(selector().value).toBe('RETIRED');
      await load([], 'RETIRED');
    },
  );

  it('does not request records when the catalog is empty', async () => {
    await initialize('RETIRED', []);
    expect(selector().value).toBe('');
    expect(selector().disabled).toBe(true);
    expect(page.textContent).toContain('No exams are available.');
    expect(page.textContent).not.toContain('No data yet');
    http.expectNone((req) => req.url === recordsUrl);
  });

  it('respects an inactive saved default and allows selecting another inactive exam', async () => {
    await initialize('RETIRED');
    expect(selector().value).toBe('RETIRED');
    await load([record('historical', 'RETIRED', 2, '2026-10-28')], 'RETIRED');
    expect(summary()).toEqual(['2 panel units', '—', '—']);
    await select('PANEL');
    await load([], 'PANEL');
    await select('RETIRED');
    await load([], 'RETIRED');
  });

  it.each(['PANEL', 'TSH'])('shows the empty state for selected backend exam %s', async (code) => {
    await initialize(code);
    await load([], code);
    expect(page.textContent).toContain('No data yet');
    expect(page.textContent).toContain('Add exam records to see your trend over time.');
    expect(page.querySelector('figure')).toBeNull();
    expect(page.querySelector('dl')).toBeNull();
  });

  it.each([
    { code: 'PANEL', value: 6.25, unit: 'panel units', expected: '6.25 panel units' },
    { code: 'TSH', value: 105, unit: 'mIU/L', expected: '105 mIU/L' },
  ])(
    'shows a single $code point with result metadata and unavailable Previous/Change',
    async ({ code, value, unit, expected }) => {
      await initialize(code);
      await load([record('only', code, value, '2026-10-28', unit)], code, [
        { ...defaultDefinitions[0], unit },
      ]);
      expect(summary()).toEqual([expected, '—', '—']);
      expect(page.querySelector('#trends-result-series')).toBeNull();
      expect(page.querySelectorAll('circle')).toHaveLength(1);
      expect(page.querySelector('circle')?.getAttribute('cx')).toBe('320');
      expect(page.querySelector('table')?.textContent).toContain(expected);
      expect(page.querySelector('table')?.textContent).toContain('Reported measurement');
      expect(page.querySelector('table')?.textContent).toContain('Oct 28, 2026');
      expect(page.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('uses the two latest results and spaces dates by elapsed time without changing the response order', async () => {
    await initialize('PANEL');
    const records = [
      record('first', 'PANEL', 7, '2026-10-01'),
      record('previous', 'PANEL', 6.8, '2026-10-02'),
      record('latest', 'PANEL', 6.5, '2026-10-11'),
    ];
    await load(records, 'PANEL');
    expect(summary()).toEqual(['6.5 panel units', '6.8 panel units', '-0.3 panel units']);
    expect(
      Array.from(page.querySelectorAll('circle'), (point) => Number(point.getAttribute('cx'))),
    ).toEqual([12, 73.6, 628]);
    expect(page.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(records.map((item) => item.id)).toEqual(['first', 'previous', 'latest']);
  });

  it('switches exam by requesting its code and immediately clears the old chart and summary', async () => {
    await initialize();
    await load([record('thyroid', 'TSH', 6.5, '2026-10-28', 'thyroid units')]);
    await select('PANEL');
    expect(selector().value).toBe('PANEL');
    expect(selector().disabled).toBe(true);
    expect(page.querySelector('dl')).toBeNull();
    expect(page.querySelector('figure')).toBeNull();
    expect(page.textContent).not.toContain('thyroid units');
    expect(page.textContent).not.toContain('No data yet');
    await load(
      [
        record('previous', 'PANEL', 100, '2026-10-01'),
        record('latest', 'PANEL', 105, '2026-10-28'),
      ],
      'PANEL',
    );
    expect(text('h2')).toContain('Backend panel — Reported measurement trend');
    expect(summary()).toEqual(['105 panel units', '100 panel units', '+5 panel units']);
    expect(page.querySelectorAll('circle')).toHaveLength(2);
    http.expectNone(settingsUrl);
    http.expectNone(catalogUrl);
  });

  it('does not request records again when selecting the same exam', async () => {
    await initialize();
    await load([record('only', 'TSH', 2, '2026-10-28')]);
    await select('TSH');
    expect(summary()).toEqual(['2 panel units', '—', '—']);
    http.expectNone((req) => req.url === recordsUrl);
  });

  it.each(['UNKNOWN', ''])('ignores exam selection %s outside the catalog', async (code) => {
    await initialize();
    await load([record('only', 'TSH', 2, '2026-10-28')]);
    const option = document.createElement('option');
    option.value = code;
    selector().append(option);
    await select(code);
    expect(text('h2')).toContain('Backend thyroid exam — Reported measurement trend');
    expect(summary()).toEqual(['2 panel units', '—', '—']);
    http.expectNone((req) => req.url === recordsUrl);
  });

  it('handles equal values on the same date without invalid coordinates or a false change', async () => {
    await initialize();
    await load([
      record('previous', 'TSH', 6.5, '2026-10-28'),
      record('latest', 'TSH', 6.5, '2026-10-28'),
    ]);
    expect(summary()).toEqual(['6.5 panel units', '6.5 panel units', '0 panel units']);
    expect(page.querySelector('polyline')?.getAttribute('points')).not.toMatch(/NaN|Infinity/);
    expect(page.querySelectorAll('circle')).toHaveLength(2);
  });

  it('reports record errors safely and retries only the currently selected exam', async () => {
    await initialize();
    await load([]);
    await select('PANEL');
    request('PANEL').flush(
      { message: 'private database details' },
      { status: 500, statusText: 'Error' },
    );
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Unable to load records.');
    expect(page.textContent).not.toContain('private database');
    expect(page.textContent).not.toContain('No data yet');
    expect(page.querySelector('dl')).toBeNull();
    await retry();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(page.querySelector('[role="status"]')).not.toBeNull();
    await load([record('latest', 'PANEL', 105, '2026-10-28')], 'PANEL');
    expect(summary()).toEqual(['105 panel units', '—', '—']);
    expect(page.querySelector('button')).toBeNull();
    http.expectNone(settingsUrl);
    http.expectNone(catalogUrl);
  });

  it.each(['settings first', 'catalog first'])(
    'continues after settings failure and loads the first catalog exam (%s)',
    async (order) => {
      const settings = http.expectOne(settingsUrl);
      const types = http.expectOne(catalogUrl);
      if (order === 'catalog first') {
        types.flush(catalog);
        settings.flush('private details', { status: 500, statusText: 'Error' });
      } else {
        settings.flush('private details', { status: 500, statusText: 'Error' });
        await fixture.whenStable();
        expect(selector().disabled).toBe(true);
        expect(page.querySelector('[role="alert"]')).toBeNull();
        http.expectNone((req) => req.url === recordsUrl);
        types.flush(catalog);
      }
      await fixture.whenStable();
      expect(selector().value).toBe('PANEL');
      expect(page.querySelector('[role="alert"]')).toBeNull();
      expect(page.textContent).not.toContain('private details');
      await load([record('one', 'PANEL', 6, '2026-10-01')], 'PANEL');
      expect(selector().disabled).toBe(false);
      expect(summary()).toEqual(['6 panel units', '—', '—']);
      await select('TSH');
      await load([]);
    },
  );

  it.each(['settings succeeds', 'settings fails'])(
    'blocks on catalog failure and allows retry when %s',
    async (preferenceOutcome) => {
      const settings = http.expectOne(settingsUrl);
      const types = http.expectOne(catalogUrl);
      if (preferenceOutcome === 'settings succeeds') {
        settings.flush({ defaultTrendsExam: 'TSH', language: 'en' });
      } else {
        settings.flush('private preference details', { status: 500, statusText: 'Error' });
      }
      types.flush('private details', { status: 500, statusText: 'Error' });
      await fixture.whenStable();
      expect(selector().disabled).toBe(true);
      expect(text('[role="alert"]')).toBe('Unable to load exam types.');
      expect(page.textContent).not.toContain('Unable to load your preferences and exam types.');
      expect(page.textContent).not.toContain('private details');
      expect(page.textContent).not.toContain('private preference details');
      expect(page.textContent).not.toContain('No data yet');
      http.expectNone((req) => req.url === recordsUrl);
      await retry();
      await initialize();
      await load([]);
      expect(selector().disabled).toBe(false);
    },
  );

  it('shows the empty catalog state after a non-critical settings failure', async () => {
    http.expectOne(settingsUrl).flush('private details', { status: 500, statusText: 'Error' });
    http.expectOne(catalogUrl).flush([]);
    await fixture.whenStable();
    expect(selector().value).toBe('');
    expect(selector().disabled).toBe(true);
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(page.textContent).toContain('No exams are available.');
    http.expectNone((req) => req.url === recordsUrl);
  });

  it('waits for nonempty records before loading definitions and keeps chart hidden while they load', async () => {
    await initialize('PANEL');
    http.expectNone(catalogUrl + '/PANEL/result-definitions');
    request('PANEL').flush([
      panelRecord('one', '2026-10-01', [result('historical', 'PERCENT', 'old unit', 6.2)]),
    ]);
    await fixture.whenStable();
    expect(selector().disabled).toBe(true);
    expect(text('[role="status"]')).toContain('Loading result fields');
    expect(page.querySelector('figure')).toBeNull();
    expect(page.querySelector('dl')).toBeNull();
    expect(page.querySelector('#trends-result-series')).toBeNull();
    definitionsRequest('PANEL').flush(panelDefinitions);
    await fixture.whenStable();
    expect(selector().disabled).toBe(false);
    expect([...resultSelector().options].map((option) => option.value)).toEqual(['PERCENT', 'AVG']);
    expect([...resultSelector().options].map((option) => option.text)).toEqual([
      'Percentage (%)',
      'Estimated average glucose (mg/dL)',
    ]);
    expect(summary()).toEqual(['6.2 %', '—', '—']);
  });

  it('defensively excludes cross-exam records before storing data or requesting definitions', async () => {
    const types: ExamType[] = [
      { id: 'hba', code: 'HBA1C', name: 'Hemoglobin A1c', active: true, resultSchemas: [] },
      { id: 'glu', code: 'GLU', name: 'Blood Glucose', active: true, resultSchemas: [] },
    ];
    await initialize('HBA1C', types);
    await load(
      [record('hba', 'HBA1C', 6.5, '2026-10-01'), record('glu', 'GLU', 108, '2026-10-02')],
      'HBA1C',
    );
    expect(page.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(summary()).toEqual(['6.5 panel units', '—', '—']);
    expect(text('tbody')).not.toContain('108');
    http.expectNone(catalogUrl + '/GLU/result-definitions');
  });

  it('treats a response containing only another exam as empty and does not request definitions', async () => {
    await initialize('PANEL');
    await load([record('wrong', 'TSH', 100, '2026-10-01')], 'PANEL');
    expect(text('main')).not.toContain('100');
    expect(page.textContent).toContain('No data yet');
    http.expectNone(catalogUrl + '/PANEL/result-definitions');
  });

  it('uses endpoint definitions, including inactive fields with no historical values, as the options and metadata', async () => {
    await initialize('PANEL');
    await load(
      [
        panelRecord('one', '2026-10-01', [
          result('historical', 'PERCENT', 'embedded unit', 6.2, 'Embedded label'),
          result('unknown', 'NOT_IN_DOMAIN', 'unknown units', 999, 'Not in domain'),
        ]),
      ],
      'PANEL',
      [panelDefinitions[1], panelDefinitions[0]],
    );
    expect(resultSelector().value).toBe('AVG');
    expect([...resultSelector().options].map((option) => option.value)).toEqual(['AVG', 'PERCENT']);
    expect(page.textContent).toContain('No results are available for this field.');
    expect(page.textContent).not.toContain('No data yet');
    expect(page.querySelector('figure')).toBeNull();
    expect(page.querySelector('dl')).toBeNull();
    await selectDefinition('Percentage (%)');
    expect(summary()).toEqual(['6.2 %', '—', '—']);
    expect(text('thead')).toContain('Percentage (%)');
    expect(text('figcaption')).toContain('Percentage by exam date · %');
    expect(page.textContent).not.toContain('Embedded label');
    expect(page.textContent).not.toContain('embedded unit');
    expect(page.textContent).not.toContain('Not in domain');
    http.expectNone((req) => req.method === 'GET');
  });

  it('groups by definition code across schemas, IDs, labels and units using domain metadata', async () => {
    await initialize('PANEL');
    const standard = panelRecord('standard', '2026-10-01', [
      result('old-id', 'PERCENT', 'obsolete unit', 6.2, 'Old label', false),
    ]);
    standard.examResultSchema = { code: 'STANDARD', name: 'Standard', active: false };
    const extended = panelRecord('extended', '2026-10-11', [
      result('avg-id', 'AVG', 'embedded average unit', 140, 'Historical average'),
      result('new-id', 'PERCENT', '%', 6.5, 'New label'),
    ]);
    extended.examResultSchema = { code: 'EXTENDED', name: 'Extended', active: true };
    await load([standard, extended], 'PANEL', panelDefinitions);
    expect(resultSelector().value).toBe('PERCENT');
    expect(summary()).toEqual(['6.5 %', '6.2 %', '+0.3 %']);
    expect(page.querySelectorAll('circle')).toHaveLength(2);
    expect(page.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(text('h2')).toBe('Backend panel — Percentage trend');
    expect(text('thead')).toContain('Percentage (%)');
    await selectDefinition('Estimated average glucose (mg/dL)');
    expect(summary()).toEqual(['140 mg/dL', '—', '—']);
    expect(page.querySelectorAll('circle')).toHaveLength(1);
    expect(page.querySelectorAll('tbody tr')).toHaveLength(1);
    http.expectNone((req) => req.method === 'GET');
  });

  it('skips records missing the selected code and recalculates all views without another request', async () => {
    await initialize('PANEL');
    await load(
      [
        panelRecord('old', '2026-10-01', [result('p-old', 'PERCENT', '%', 6)]),
        panelRecord('middle', '2026-10-11', [
          result('a-middle', 'AVG', 'mg/dL', 140),
          result('p-middle', 'PERCENT', '%', 6.5),
        ]),
        panelRecord('latest', '2026-10-21', [result('a-latest', 'AVG', 'mg/dL', 150)]),
      ],
      'PANEL',
      panelDefinitions,
    );
    expect(summary()).toEqual(['6.5 %', '6 %', '+0.5 %']);
    expect(page.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(text('tbody')).not.toContain('Oct 21, 2026');
    await selectDefinition('Estimated average glucose (mg/dL)');
    expect(summary()).toEqual(['150 mg/dL', '140 mg/dL', '+10 mg/dL']);
    expect(page.querySelectorAll('circle')).toHaveLength(2);
    expect([...page.querySelectorAll('tbody td')].map((cell) => cell.textContent?.trim())).toEqual([
      '140 mg/dL',
      '150 mg/dL',
    ]);
    expect(text('tbody')).not.toContain('Oct 1, 2026');
    http.expectNone((req) => req.method === 'GET');
  });

  it('shows a distinct message when records exist but no domain definitions are available', async () => {
    await initialize('PANEL');
    await load([record('one', 'PANEL', 6, '2026-10-01')], 'PANEL', []);
    expect(page.textContent).toContain('No result fields are available for this exam.');
    expect(page.textContent).not.toContain('No data yet');
    expect(page.querySelector('#trends-result-series')).toBeNull();
    expect(page.querySelector('figure')).toBeNull();
    expect(page.querySelector('dl')).toBeNull();
  });

  it('handles records with no matching results safely after loading their definitions', async () => {
    await initialize('PANEL');
    await load([panelRecord('empty', '2026-10-01', [])], 'PANEL');
    expect(page.textContent).toContain('No results are available for this field.');
    expect(page.querySelector('#trends-result-series')).toBeNull();
    expect(page.querySelector('figure')).toBeNull();
    expect(page.querySelector('dl')).toBeNull();
  });

  it('retries a safe definitions error without reloading records or the catalog', async () => {
    await initialize('PANEL');
    request('PANEL').flush([record('one', 'PANEL', 6, '2026-10-01')]);
    await fixture.whenStable();
    definitionsRequest('PANEL').flush(
      { message: 'private database details' },
      { status: 500, statusText: 'Error' },
    );
    await fixture.whenStable();
    expect(page.textContent).toContain('Unable to load result fields.');
    expect(page.textContent).not.toContain('private database');
    expect(page.textContent).not.toContain('No data yet');
    expect(page.querySelector('figure')).toBeNull();
    expect(page.querySelector('dl')).toBeNull();
    await retry();
    expect(text('[role="status"]')).toContain('Loading result fields');
    definitionsRequest('PANEL').flush(defaultDefinitions);
    await fixture.whenStable();
    expect(summary()).toEqual(['6 panel units', '—', '—']);
    http.expectNone((req) => req.url === recordsUrl);
    http.expectNone(settingsUrl);
    http.expectNone(catalogUrl);
  });

  it('clears definitions, values and errors when the exam changes, including empty-record responses', async () => {
    await initialize('PANEL');
    await load(
      [
        panelRecord('one', '2026-10-01', [
          result('p', 'PERCENT', '%', 6),
          result('a', 'AVG', 'mg/dL', 140),
        ]),
      ],
      'PANEL',
      panelDefinitions,
    );
    await selectDefinition('Estimated average glucose (mg/dL)');
    await select('TSH');
    expect(page.querySelector('#trends-result-series')).toBeNull();
    expect(page.querySelector('figure')).toBeNull();
    expect(page.querySelector('dl')).toBeNull();
    expect(page.textContent).not.toContain('mg/dL');
    await load([]);
    expect(page.textContent).toContain('No data yet');
    http.expectNone(catalogUrl + '/TSH/result-definitions');
    await select('PANEL');
    request('PANEL').flush([record('one', 'PANEL', 6, '2026-10-01')]);
    await fixture.whenStable();
    definitionsRequest('PANEL').flush('private', { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    await select('TSH');
    expect(page.textContent).not.toContain('Unable to load result fields.');
    await load([record('one', 'TSH', 2, '2026-10-01')]);
    expect(summary()).toEqual(['2 panel units', '—', '—']);
    expect(page.querySelector('#trends-result-series')).toBeNull();
  });

  it('ignores invalid or unchanged definition codes without fetching data', async () => {
    await initialize('PANEL');
    await load(
      [panelRecord('one', '2026-10-01', [result('p', 'PERCENT', '%', 6.5)])],
      'PANEL',
      panelDefinitions,
    );
    await selectDefinition('Percentage (%)');
    const option = document.createElement('option');
    option.value = 'UNKNOWN';
    resultSelector().append(option);
    resultSelector().value = option.value;
    resultSelector().dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(summary()).toEqual(['6.5 %', '—', '—']);
    expect(text('h2')).toBe('Backend panel — Percentage trend');
    http.expectNone((req) => req.method === 'GET');
  });

  it('renders unitless definitions without parentheses or separators in all summary fields', async () => {
    await initialize('PANEL');
    const definitions = [
      { ...defaultDefinitions[0], label: 'Count', unit: '' },
      panelDefinitions[1],
    ];
    await load(
      [record('old', 'PANEL', 2, '2026-10-01'), record('new', 'PANEL', 3, '2026-10-11')],
      'PANEL',
      definitions,
    );
    expect(resultSelector().options[0].text).toBe('Count');
    expect(text('figcaption')).toBe('Count by exam date');
    expect(text('thead')).toContain('Count');
    expect(page.textContent).not.toContain('()');
    expect(summary()).toEqual(['3', '2', '+1']);
  });

  it.each([0, -2, 0.0001])('keeps equal values of %s finite', async (value) => {
    await initialize('PANEL');
    await load(
      [record('old', 'PANEL', value, '2026-10-01'), record('new', 'PANEL', value, '2026-10-01')],
      'PANEL',
    );
    expect(page.querySelectorAll('circle')).toHaveLength(2);
    expect(page.querySelector('polyline')?.getAttribute('points')).not.toMatch(/NaN|Infinity/);
    for (const circle of page.querySelectorAll('circle')) {
      expect(Number.isFinite(Number(circle.getAttribute('cx')))).toBe(true);
      expect(Number.isFinite(Number(circle.getAttribute('cy')))).toBe(true);
    }
    expect(summary().at(-1)).toBe('0 panel units');
  });

  it('pads the selected values proportionally without a fixed exam-specific step', async () => {
    await initialize('PANEL');
    await load(
      [record('old', 'PANEL', 10, '2026-10-01'), record('new', 'PANEL', 30, '2026-10-11')],
      'PANEL',
    );
    const labels = page.querySelector('figure [aria-hidden="true"]')?.textContent;
    expect(labels).toContain('32');
    expect(labels).toContain('8');
    for (const circle of page.querySelectorAll('circle')) {
      const y = Number(circle.getAttribute('cy'));
      expect(y).toBeGreaterThan(12);
      expect(y).toBeLessThan(228);
    }
  });
});
