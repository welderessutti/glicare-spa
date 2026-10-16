import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Records } from './records';

describe('Records', () => {
  let fixture: ComponentFixture<Records>;
  let page: HTMLElement;

  function input(id: string): HTMLInputElement {
    const control = page.querySelector<HTMLInputElement>(id);
    if (!control) {
      throw new Error(`Missing input: ${id}`);
    }
    return control;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Records],
    }).compileComponents();

    fixture = TestBed.createComponent(Records);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('shows the fixed exam and explains that saving is not available', () => {
    expect(page.querySelector('h1')?.textContent).toContain('Add exam result');
    expect(page.querySelector('dd')?.textContent).toContain('Hemoglobin A1c');
    expect(page.querySelector('select')).toBeNull();
    expect(page.querySelector('#records-save-hint')?.textContent).toContain(
      'Saving results is not available yet.',
    );
    expect(page.querySelector('[role="status"]')?.textContent?.trim()).toBe('');
  });

  it('requires a percentage and exam date while accepting decimal results', () => {
    const result = input('#records-result');
    const date = input('#records-exam-date');

    expect(result.checkValidity()).toBe(false);
    expect(date.checkValidity()).toBe(false);

    result.value = '6.53';
    date.value = '2026-10-15';
    expect(result.checkValidity()).toBe(true);
    expect(date.checkValidity()).toBe(true);

    result.value = '-1';
    expect(result.validity.rangeUnderflow).toBe(true);
    result.value = '101';
    expect(result.validity.rangeOverflow).toBe(true);
  });

  it('prevents navigation and announces that nothing was saved without clearing the entries', async () => {
    const result = input('#records-result');
    const date = input('#records-exam-date');
    result.value = '6.5';
    date.value = '2026-10-15';

    const event = new Event('submit', { bubbles: true, cancelable: true });
    page.querySelector('form')?.dispatchEvent(event);
    await fixture.whenStable();

    expect(event.defaultPrevented).toBe(true);
    expect(page.querySelector('[role="status"]')?.textContent).toContain(
      'Your result has not been saved.',
    );
    expect(result.value).toBe('6.5');
    expect(date.value).toBe('2026-10-15');
  });
});
