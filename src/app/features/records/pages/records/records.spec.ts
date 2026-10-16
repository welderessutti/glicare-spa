import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Records } from './records';

describe('Records', () => {
  let fixture: ComponentFixture<Records>;
  let page: HTMLElement;
  let dialog: HTMLDialogElement;

  function element<T extends HTMLElement>(selector: string): T {
    const match = page.querySelector<T>(selector);
    if (!match) throw new Error(`Missing element: ${selector}`);
    return match;
  }

  function button(text: string, parent: HTMLElement = page): HTMLButtonElement {
    const match = [...parent.querySelectorAll('button')].find(
      (control) => control.firstChild?.textContent?.trim() === text,
    );
    if (!match) throw new Error(`Missing button: ${text}`);
    return match;
  }

  function rows(): HTMLLIElement[] {
    return [...page.querySelectorAll<HTMLLIElement>('ul > li')];
  }

  async function click(control: HTMLButtonElement): Promise<void> {
    control.click();
    await fixture.whenStable();
  }

  async function submit(result: string, examDate: string): Promise<Event> {
    const form = element<HTMLFormElement>('form');
    element<HTMLInputElement>('form [name="result"]').value = result;
    element<HTMLInputElement>('form [name="examDate"]').value = examDate;
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    await fixture.whenStable();
    return event;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Records] }).compileComponents();
    fixture = TestBed.createComponent(Records);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    dialog = element<HTMLDialogElement>('dialog');

    // jsdom has no native top layer; browser checks cover focus trapping and Escape.
    dialog.showModal = vi.fn(() => {
      dialog.open = true;
    });
    dialog.close = vi.fn(() => {
      dialog.open = false;
      dialog.dispatchEvent(new Event('close'));
    });
  });

  it('shows three dated A1c results and the demo notice with no open form', () => {
    expect(element('h1').textContent).toBe('Records');
    expect(rows()).toHaveLength(3);
    expect(rows().map((row) => row.querySelector('time')?.dateTime)).toEqual([
      '2026-10-10',
      '2026-07-08',
      '2026-04-04',
    ]);
    expect(rows()[0].textContent).toContain('6.5%');
    expect(page.querySelector('form')).toBeNull();
    expect(element('#records-add-section').hidden).toBe(true);
    expect(element('#records-demo-hint').textContent).toContain('Changes reset when you reload.');
    expect(element('[role="status"]').textContent?.trim()).toBe('');
  });

  it('opens and cancels creation, restores focus and discards unsaved entries', async () => {
    const add = button('Add new result');
    await click(add);
    const result = element<HTMLInputElement>('#records-result');
    expect(document.activeElement).toBe(result);
    expect(add.getAttribute('aria-expanded')).toBe('true');
    expect(result.getAttribute('aria-describedby')).toBe('records-result-hint');
    result.value = '8.2';

    await click(button('Cancel', element('form')));
    expect(page.querySelector('form')).toBeNull();
    expect(document.activeElement).toBe(add);
    expect(add.getAttribute('aria-expanded')).toBe('false');
    expect(rows()).toHaveLength(3);

    await click(add);
    expect(element<HTMLInputElement>('#records-result').value).toBe('');
  });

  it('keeps native required fields and percentage bounds without changing the list on invalid submit', async () => {
    await click(button('Add new result'));
    const result = element<HTMLInputElement>('#records-result');
    const date = element<HTMLInputElement>('#records-exam-date');
    expect(result.checkValidity()).toBe(false);
    expect(date.checkValidity()).toBe(false);
    expect(result.getAttribute('inputmode')).toBe('decimal');

    const event = await submit('101', '2026-10-16');
    expect(event.defaultPrevented).toBe(true);
    expect(result.validity.rangeOverflow).toBe(true);
    expect(rows()).toHaveLength(3);
    expect(page.querySelector('form')).not.toBeNull();
    result.value = '-1';
    expect(result.validity.rangeUnderflow).toBe(true);
    result.value = '6.53';
    expect(result.checkValidity()).toBe(true);
  });

  it('adds a decimal result in date order and announces its temporary nature', async () => {
    const add = button('Add new result');
    await click(add);
    const event = await submit('6.53', '2026-08-01');
    expect(event.defaultPrevented).toBe(true);
    expect(page.querySelector('form')).toBeNull();
    expect(rows()).toHaveLength(4);
    expect(rows()[1].querySelector('time')?.dateTime).toBe('2026-08-01');
    expect(rows()[1].textContent).toContain('6.53%');
    expect(document.activeElement).toBe(add);
    expect(element('[role="status"]').textContent).toContain('Result added to this demo.');

    const freshFixture = TestBed.createComponent(Records);
    await freshFixture.whenStable();
    expect((freshFixture.nativeElement as HTMLElement).querySelectorAll('ul > li')).toHaveLength(3);
    freshFixture.destroy();
  });

  it('allows only one creation or edit form at a time and cancels edits without changing results', async () => {
    await click(button('Add new result'));
    const firstEdit = button('Edit', rows()[0]);
    await click(firstEdit);
    expect(element('#records-add-section').hidden).toBe(true);
    expect(page.querySelectorAll('form')).toHaveLength(1);
    expect(element<HTMLInputElement>('form [name="result"]').value).toBe('6.5');
    expect(element<HTMLInputElement>('form [name="examDate"]').value).toBe('2026-10-10');
    element<HTMLInputElement>('form [name="result"]').value = '9';

    const secondEdit = button('Edit', rows()[1]);
    await click(secondEdit);
    expect(page.querySelectorAll('form')).toHaveLength(1);
    expect(firstEdit.getAttribute('aria-expanded')).toBe('false');
    expect(element<HTMLInputElement>('form [name="result"]').value).toBe('6.8');
    expect(document.activeElement).toBe(element('form [name="result"]'));
    await click(button('Cancel', element('form')));
    expect(document.activeElement).toBe(secondEdit);
    expect(rows()[0].textContent).toContain('6.5%');

    await click(firstEdit);
    await click(button('Add new result'));
    expect(page.querySelectorAll('form')).toHaveLength(1);
    expect(firstEdit.getAttribute('aria-expanded')).toBe('false');
    expect(element<HTMLInputElement>('#records-result').value).toBe('');
  });

  it('updates both fields, reorders the record and restores focus to its edit action', async () => {
    const edit = button('Edit', rows()[2]);
    await click(edit);
    await submit('6.2', '2026-10-16');
    expect(rows()).toHaveLength(3);
    expect(rows()[0].querySelector('time')?.dateTime).toBe('2026-10-16');
    expect(rows()[0].textContent).toContain('6.2%');
    expect(page.querySelector('form')).toBeNull();
    expect(document.activeElement).toBe(edit);
    expect(element('[role="status"]').textContent).toContain('Result updated in this demo.');
  });

  it('identifies the deletion target and leaves results unchanged when confirmation is cancelled', async () => {
    await click(button('Delete', rows()[1]));
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('6.8%');
    expect(dialog.textContent).toContain('Jul 08, 2026');
    expect(dialog.textContent).toContain('cannot be undone');
    expect(rows()).toHaveLength(3);

    await click(button('Cancel', dialog));
    expect(dialog.open).toBe(false);
    expect(rows()).toHaveLength(3);
    expect(element('[role="status"]').textContent?.trim()).toBe('');

    await click(button('Delete', rows()[0]));
    expect(dialog.textContent).toContain('6.5%');
    expect(dialog.textContent).not.toContain('6.8%');
  });

  it('deletes only after confirmation and reveals the empty state after the last deletion', async () => {
    await click(button('Edit', rows()[0]));
    for (const remaining of [2, 1, 0]) {
      await click(button('Delete', rows()[0]));
      await click(button('Delete', dialog));
      expect(rows()).toHaveLength(remaining);
      expect(dialog.open).toBe(false);
      expect(document.activeElement).toBe(element('#records-results-title'));
    }
    expect(page.querySelector('form')).toBeNull();
    expect(page.textContent).toContain('No exam results yet.');
    expect(page.textContent).toContain('Add your first hemoglobin A1c result');
    expect(element('[role="status"]').textContent).toContain('Result deleted from this demo.');
    await click(button('Add new result'));
    await submit('6.4', '2026-10-16');
    expect(rows()).toHaveLength(1);
    expect(page.textContent).not.toContain('No exam results yet.');
  });
});
