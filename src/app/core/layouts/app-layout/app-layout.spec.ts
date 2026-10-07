import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AppLayout } from './app-layout';
import { SessionService } from '../../services/session/session-service';
import { SessionAuthenticatedUser } from '../../models/session-authenticated-user';

@Component({ template: '<h1>Dashboard content</h1>' })
class TestPage {}

describe('AppLayout', () => {
  let harness: RouterTestingHarness;
  let page: HTMLElement;
  let response: Subject<void>;
  const logout = vi.fn<() => Observable<void>>();
  const user = signal<SessionAuthenticatedUser | null>(null);

  function signOutButton(): HTMLButtonElement {
    const button = page.querySelector<HTMLButtonElement>('header button');
    if (!button) throw new Error('Missing sign-out button');
    return button;
  }

  async function render(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  beforeEach(async () => {
    response = new Subject<void>();
    logout.mockReset().mockReturnValue(response);
    user.set({ id: 'test-user', fullName: 'Test User', email: 'user@example.com' });

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: AppLayout,
            children: [
              { path: 'dashboard', component: TestPage },
              { path: 'dashboard/details', component: TestPage },
            ],
          },
          { path: 'auth/login', component: TestPage },
        ]),
        { provide: SessionService, useValue: { user: user.asReadonly(), logout } },
      ],
    }).compileComponents();

    harness = await RouterTestingHarness.create('/dashboard');
    const element = harness.routeNativeElement;
    if (!element) throw new Error('Missing layout');
    page = element;
  });

  afterEach(() => response.complete());

  it('renders the child page inside a single main with a keyboard skip link', () => {
    expect(page.querySelectorAll('main')).toHaveLength(1);
    expect(page.querySelector('main router-outlet')).not.toBeNull();
    expect(page.querySelector('main h1')?.textContent).toBe('Dashboard content');
    expect(page.querySelector('[href="#app-content"]')).not.toBeNull();
    expect(page.querySelector('#app-content')?.getAttribute('tabindex')).toBe('-1');
  });

  it('focuses main without navigating away when the skip link is activated', async () => {
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    page.querySelector('[href="#app-content"]')?.dispatchEvent(click);
    await render();

    expect(click.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(page.querySelector('main'));
    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });

  it('marks Dashboard as the current page in both navigations, including nested routes', async () => {
    await harness.navigateByUrl('/dashboard/details');
    await render();

    const links = page.querySelectorAll('nav a[aria-current="page"]');
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.getAttribute('href')).toBe('/dashboard');
      expect(link.textContent).toContain('Dashboard');
    }
  });

  it('keeps unavailable destinations disabled without creating broken links', () => {
    const disabled = Array.from(page.querySelectorAll<HTMLButtonElement>('nav button:disabled'));
    for (const label of ['Records', 'History', 'Trends', 'Profile', 'Settings']) {
      expect(disabled.some((button) => button.textContent?.includes(label))).toBe(true);
    }
    expect(disabled.every((button) => button.textContent?.includes('Coming soon'))).toBe(true);
    expect(
      Array.from(page.querySelectorAll('a[href]')).every((link) =>
        ['/dashboard', '#app-content'].includes(link.getAttribute('href') ?? ''),
      ),
    ).toBe(true);
  });

  it('connects More and its close control to a native popover', () => {
    expect(
      page.querySelector('button[popovertarget="app-more-navigation"]')?.textContent,
    ).toContain('More');
    expect(page.querySelector('#app-more-navigation')?.hasAttribute('popover')).toBe(true);
    expect(
      page.querySelector('button[popovertargetaction="hide"]')?.getAttribute('aria-label'),
    ).toBe('Close additional navigation');
  });

  it('reads the existing session user reactively and handles a missing name', async () => {
    expect(page.querySelector('header')?.textContent).toContain('Test User');
    user.set({ id: 'test-user', fullName: 'Updated User', email: 'user@example.com' });
    await render();
    expect(page.querySelector('header')?.textContent).toContain('Updated User');
    user.set(null);
    await render();
    expect(page.querySelector('header')?.textContent).toContain('Your account');
  });

  it('blocks repeated logout clicks, announces progress, and navigates after success', async () => {
    signOutButton().click();
    signOutButton().click();
    await render();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(signOutButton().disabled).toBe(true);
    expect(signOutButton().getAttribute('aria-busy')).toBe('true');
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Signing out');

    response.next();
    response.complete();
    await render();
    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });

  it('shows a safe error and allows retry without leaving the current page', async () => {
    signOutButton().click();
    response.error(new Error('Internal error with sensitive details'));
    await render();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      "We couldn't sign you out. Please try again.",
    );
    expect(page.textContent).not.toContain('sensitive details');
    expect(signOutButton().disabled).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/dashboard');

    response = new Subject<void>();
    logout.mockReturnValue(response);
    signOutButton().click();
    await render();
    expect(logout).toHaveBeenCalledTimes(2);
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });
});
