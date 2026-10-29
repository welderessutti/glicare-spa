import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '../../../../core/config/api-url';
import { SessionService } from '../../../../core/services/session/session-service';
import { Profile as ProfileModel } from '../../models/profile';
import { Profile } from './profile';

const initialProfile: ProfileModel = {
  fullName: 'John Doe',
  email: 'john@example.com',
  createdAt: '2026-10-15T12:00:00Z',
};

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
  let page: HTMLElement;
  let http: HttpTestingController;
  let session: SessionService;

  async function render(): Promise<void> {
    await Promise.resolve();
    await fixture.whenStable();
  }

  function button(label: string, container: HTMLElement = page): HTMLButtonElement {
    const control = [...container.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === label,
    );
    if (!control) throw new Error(`Missing button: ${label}`);
    return control;
  }

  function input(id: string): HTMLInputElement {
    const control = page.querySelector<HTMLInputElement>(`#${id}`);
    if (!control) throw new Error(`Missing input: ${id}`);
    return control;
  }

  async function enter(id: string, value: string): Promise<void> {
    const control = input(id);
    control.value = value;
    control.dispatchEvent(new Event('input'));
    await render();
  }

  function submit(section: string): void {
    page
      .querySelector(`#${section}`)
      ?.closest('section')
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  async function loadProfile(): Promise<void> {
    http.expectOne(`${API_URL}/profile/session-user`).flush(initialProfile);
    await render();
  }

  async function openPasswords(): Promise<void> {
    button('Change password').click();
    await render();
  }

  async function enterPasswords(password = 'new-password', confirmation = password): Promise<void> {
    await enter('profile-current-password', 'current-password');
    await enter('profile-new-password', password);
    await enter('profile-confirm-password', confirmation);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    session.startSession({
      id: 'session-user',
      fullName: 'Session Name',
      email: 'john@example.com',
    });
    fixture = TestBed.createComponent(Profile);
    page = fixture.nativeElement as HTMLElement;
    await render();
  });

  afterEach(() => http.verify());

  it('loads the session user profile and renders only the profile response with a read-only email', async () => {
    expect(page.textContent).toContain('Loading your profile');
    await loadProfile();
    expect(page.textContent).toContain('John Doe');
    expect(page.textContent).toContain('john@example.com');
    expect(page.textContent).toContain('October 2026');
    expect(page.textContent).not.toContain('Session Name');
    expect(page.querySelector('input')).toBeNull();
    expect(page.textContent).toContain('Password hidden');
  });

  it('shows a safe load error and retries the same session ID', async () => {
    http
      .expectOne(`${API_URL}/profile/session-user`)
      .flush('Internal details', { status: 500, statusText: 'Error' });
    await render();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to load your profile.',
    );
    expect(page.textContent).not.toContain('Internal details');
    button('Try again').click();
    await render();
    await loadProfile();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(page.textContent).toContain('John Doe');
  });

  it('requires a name, focuses its error and restores the profile name on cancel without requests', async () => {
    await loadProfile();
    button('Edit profile').click();
    await render();
    expect(document.activeElement).toBe(input('profile-full-name'));
    expect(page.querySelectorAll('input')).toHaveLength(1);
    await enter('profile-full-name', '');
    submit('profile-personal-title');
    await render();
    expect(input('profile-full-name').getAttribute('aria-invalid')).toBe('true');
    expect(page.querySelector('#profile-full-name-error')?.textContent).toContain(
      'Enter your full name.',
    );
    await enter('profile-full-name', 'Unsaved Name');
    button('Cancel').click();
    await render();
    expect(document.activeElement).toBe(button('Edit profile'));
    button('Edit profile').click();
    await render();
    expect(input('profile-full-name').value).toBe(initialProfile.fullName);
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });

  it('blocks duplicate profile submits, preserves errors and values, then uses the returned profile without GET', async () => {
    await loadProfile();
    button('Edit profile').click();
    await render();
    await enter('profile-full-name', 'Updated Name');
    submit('profile-personal-title');
    await render();
    expect(input('profile-full-name').matches(':disabled')).toBe(true);
    expect(button('Saving changes…').disabled).toBe(true);
    expect(button('Cancel').disabled).toBe(true);
    submit('profile-personal-title');
    await render();
    const update = http.expectOne(`${API_URL}/profile/session-user`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ fullName: 'Updated Name' });
    update.flush('Internal details', { status: 500, statusText: 'Error' });
    await render();
    expect(input('profile-full-name').value).toBe('Updated Name');
    expect(button('Save changes').disabled).toBe(false);
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to update your profile.',
    );
    expect(page.textContent).not.toContain('Internal details');
    submit('profile-personal-title');
    await render();
    const updated = { ...initialProfile, fullName: 'Canonical Name' };
    http.expectOne(`${API_URL}/profile/session-user`).flush(updated);
    await render();
    expect(page.querySelector('form')).toBeNull();
    expect(page.textContent).toContain('Canonical Name');
    expect(page.textContent).toContain('Profile updated.');
    expect(session.user()).toEqual({
      id: 'session-user',
      fullName: 'Canonical Name',
      email: 'john@example.com',
    });
    expect(document.activeElement).toBe(button('Edit profile'));
  });

  it('requires all password fields and focuses the first invalid field', async () => {
    await loadProfile();
    await openPasswords();
    expect(document.activeElement).toBe(input('profile-current-password'));
    submit('profile-security-title');
    await render();
    expect(document.activeElement).toBe(input('profile-current-password'));
    for (const id of [
      'profile-current-password',
      'profile-new-password',
      'profile-confirm-password',
    ]) {
      expect(input(id).getAttribute('aria-invalid')).toBe('true');
      expect(input(id).type).toBe('password');
    }
    expect(page.querySelector('#profile-confirm-password-error')?.textContent).not.toContain(
      "Passwords don't match.",
    );
  });

  it('uses the existing password length rules and cross-field confirmation', async () => {
    await loadProfile();
    await openPasswords();
    await enterPasswords('x'.repeat(7));
    submit('profile-security-title');
    await render();
    expect(page.querySelector('#profile-new-password-error')?.textContent).toContain(
      'Use at least 8 characters.',
    );
    await enterPasswords('x'.repeat(65));
    expect(page.querySelector('#profile-new-password-error')?.textContent).toContain(
      'Use no more than 64 characters.',
    );
    await enterPasswords('x'.repeat(8));
    expect(page.querySelector('#profile-new-password-error')).toBeNull();
    await enterPasswords('x'.repeat(64));
    expect(page.querySelector('#profile-new-password-error')).toBeNull();
    await enterPasswords('new-password', 'different-password');
    expect(page.querySelector('#profile-confirm-password-error')?.textContent).toContain(
      "Passwords don't match.",
    );
    await enter('profile-new-password', 'different-password');
    expect(page.querySelector('#profile-confirm-password-error')).toBeNull();
  });

  it('clears every password and validation state on cancel and restores focus', async () => {
    await loadProfile();
    await openPasswords();
    await enterPasswords();
    button('Cancel').click();
    await render();
    expect(page.querySelector('form')).toBeNull();
    expect(document.activeElement).toBe(button('Change password'));
    await openPasswords();
    for (const control of page.querySelectorAll<HTMLInputElement>('input')) {
      expect(control.value).toBe('');
      expect(control.getAttribute('aria-invalid')).toBe('false');
    }
  });

  it('blocks duplicate password submits, preserves values on failure and clears them after success', async () => {
    await loadProfile();
    await openPasswords();
    await enterPasswords();
    submit('profile-security-title');
    await render();
    expect(button('Saving password…').disabled).toBe(true);
    expect(button('Cancel').disabled).toBe(true);
    for (const control of page.querySelectorAll('input'))
      expect(control.matches(':disabled')).toBe(true);
    submit('profile-security-title');
    await render();
    const change = http.expectOne(`${API_URL}/auth/change-password`);
    expect(change.request.method).toBe('POST');
    expect(change.request.body).toEqual({
      currentPassword: 'current-password',
      newPassword: 'new-password',
    });
    change.flush('Internal details', { status: 400, statusText: 'Error' });
    await render();
    expect(input('profile-current-password').value).toBe('current-password');
    expect(input('profile-new-password').value).toBe('new-password');
    expect(input('profile-confirm-password').value).toBe('new-password');
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to change your password.',
    );
    expect(page.textContent).not.toContain('Internal details');
    submit('profile-security-title');
    await render();
    http.expectOne(`${API_URL}/auth/change-password`).flush(null);
    await render();
    expect(page.querySelector('form')).toBeNull();
    expect(page.textContent).toContain('Password changed.');
    expect(Object.keys(session.user() ?? {})).toEqual(['id', 'fullName', 'email']);
    await openPasswords();
    for (const control of page.querySelectorAll<HTMLInputElement>('input'))
      expect(control.value).toBe('');
  });
});
