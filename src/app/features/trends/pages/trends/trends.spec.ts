import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '../../../../core/config/api-url';
import { ExamRecord } from '../../../records/models/exam-record';
import { ExamTypeCode, EXAM_UI_CONFIG } from '../../../records/models/exam-type-code';
import { Trends } from './trends';

function record(id: string, code: ExamTypeCode, value: number, date: string): ExamRecord {
  return {
    id,
    userId: 'server-user',
    createdAt: '2026-10-28T10:00:00Z',
    examDate: date,
    examType: { id: code, code, name: EXAM_UI_CONFIG[code].label, active: true },
    examResults: [
      {
        id: `result-${id}`,
        examRecordId: id,
        label: 'Result',
        value,
        unit: EXAM_UI_CONFIG[code].unit,
      },
    ],
  };
}

describe('Trends', () => {
  let fixture: ComponentFixture<Trends>;
  let page: HTMLElement;
  let http: HttpTestingController;

  function request(code: ExamTypeCode = 'HBA1C') {
    const pending = http.expectOne(`${API_URL}/exam-records?type=${code}&sort=examDate,asc`);
    expect(pending.request.method).toBe('GET');
    expect(pending.request.params.keys().sort()).toEqual(['sort', 'type']);
    return pending;
  }

  async function load(records: ExamRecord[], code: ExamTypeCode = 'HBA1C'): Promise<void> {
    request(code).flush(records);
    await fixture.whenStable();
  }

  async function select(code: ExamTypeCode): Promise<void> {
    const select = page.querySelector('select');
    if (!select) throw new Error('Missing exam selector');
    select.value = code;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
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

  it('loads HbA1c by default with a labelled selector and no false empty state', async () => {
    expect(page.querySelector('select')?.value).toBe('HBA1C');
    expect(page.querySelector('label')?.htmlFor).toBe(page.querySelector('select')?.id);
    expect(Array.from(page.querySelectorAll('option'), (option) => option.textContent)).toEqual([
      'Hemoglobin A1c',
      'Blood Glucose',
    ]);
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Loading your records');
    expect(page.querySelector('select')?.disabled).toBe(true);
    expect(page.textContent).not.toContain('No data yet');
    await load([]);
    expect(page.querySelector('select')?.disabled).toBe(false);
  });

  it.each(['HBA1C', 'GLU'] as const)(
    'shows an empty state for %s without a chart or summary',
    async (code) => {
      await load([]);
      if (code === 'GLU') {
        await select(code);
        await load([], code);
      }
      expect(page.textContent).toContain('No data yet');
      expect(page.textContent).toContain('Add exam records to see your trend over time.');
      expect(page.querySelector('figure')).toBeNull();
      expect(page.querySelector('dl')).toBeNull();
    },
  );

  it.each([
    { code: 'HBA1C' as const, value: 6, expected: '6.0 %' },
    { code: 'GLU' as const, value: 105, expected: '105 mg/dL' },
  ])(
    'shows a single $code point and leaves Previous and Change unavailable',
    async ({ code, value, expected }) => {
      if (code === 'GLU') {
        await load([]);
        await select(code);
      }
      await load([record('only', code, value, '2026-10-28')], code);
      expect(summary()).toEqual([expected, '—', '—']);
      expect(page.querySelectorAll('circle')).toHaveLength(1);
      expect(page.querySelector('circle')?.getAttribute('cx')).toBe('320');
      expect(page.querySelector('table')?.textContent).toContain(expected);
      expect(page.querySelector('table')?.textContent).toContain('Oct 28, 2026');
      expect(page.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('uses the two latest HbA1c results and dates spaced by elapsed time', async () => {
    const records = [
      record('first', 'HBA1C', 7, '2026-10-01'),
      record('previous', 'HBA1C', 6.8, '2026-10-02'),
      record('latest', 'HBA1C', 6.5, '2026-10-11'),
    ];
    await load(records);
    expect(summary()).toEqual(['6.5 %', '6.8 %', '-0.3']);
    expect(
      Array.from(page.querySelectorAll('circle'), (point) => Number(point.getAttribute('cx'))),
    ).toEqual([12, 73.6, 628]);
    expect(page.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(records.map((item) => item.id)).toEqual(['first', 'previous', 'latest']);
  });

  it('switches to GLU without showing stale HbA1c data and formats a positive integer change', async () => {
    await load([record('hba1c', 'HBA1C', 6.5, '2026-10-28')]);
    await select('GLU');
    expect(page.querySelector('dl')).toBeNull();
    expect(page.querySelector('figure')).toBeNull();
    await load(
      [record('previous', 'GLU', 100, '2026-10-01'), record('latest', 'GLU', 105, '2026-10-28')],
      'GLU',
    );
    expect(page.querySelector('h2')?.textContent).toContain('Blood Glucose trend');
    expect(summary()).toEqual(['105 mg/dL', '100 mg/dL', '+5']);
    expect(page.querySelectorAll('circle')).toHaveLength(2);
  });

  it('handles equal values on the same date without invalid coordinates or a false change', async () => {
    await load([
      record('previous', 'HBA1C', 6.5, '2026-10-28'),
      record('latest', 'HBA1C', 6.5, '2026-10-28'),
    ]);
    expect(summary()).toEqual(['6.5 %', '6.5 %', '0.0']);
    const points = page.querySelector('polyline')?.getAttribute('points') ?? '';
    expect(points).not.toMatch(/NaN|Infinity/);
    expect(page.querySelectorAll('circle')).toHaveLength(2);
  });

  it('reports GET errors safely and retries the selected exam', async () => {
    await load([]);
    await select('GLU');
    request('GLU').flush(
      { message: 'private database details' },
      { status: 500, statusText: 'Error' },
    );
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Unable to load records.');
    expect(page.textContent).not.toContain('private database');
    expect(page.textContent).not.toContain('No data yet');
    expect(page.querySelector('dl')).toBeNull();
    const retry = page.querySelector('button');
    expect(retry?.textContent).toContain('Try again');
    retry?.click();
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(page.querySelector('[role="status"]')).not.toBeNull();
    await load([record('latest', 'GLU', 105, '2026-10-28')], 'GLU');
    expect(summary()).toEqual(['105 mg/dL', '—', '—']);
    expect(page.querySelector('button')).toBeNull();
  });
});
