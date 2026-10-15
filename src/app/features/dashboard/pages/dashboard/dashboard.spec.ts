import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SessionService } from '../../../../core/services/session/session-service';
import { SessionAuthenticatedUser } from '../../../../core/models/session-authenticated-user';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  const user = signal<SessionAuthenticatedUser | null>(null);

  beforeEach(async () => {
    user.set({ id: 'test-user', fullName: '  John   Smith  ', email: 'john@example.com' });
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [{ provide: SessionService, useValue: { user: user.asReadonly() } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('greets the session user by first name and reacts to session changes', async () => {
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('h1')?.textContent).toContain('Hello, John');

    user.set({ id: 'test-user', fullName: 'Maria Silva', email: 'maria@example.com' });
    await fixture.whenStable();

    expect(page.querySelector('h1')?.textContent).toContain('Hello, Maria');
  });

  it('uses a natural greeting when the session or name is unavailable', async () => {
    const page: HTMLElement = fixture.nativeElement;
    user.set(null);
    await fixture.whenStable();
    expect(page.querySelector('h1')?.textContent).toContain('Welcome back');

    user.set({ id: 'test-user', fullName: '   ', email: 'john@example.com' });
    await fixture.whenStable();
    expect(page.querySelector('h1')?.textContent).toContain('Welcome back');
  });

  it('keeps future actions unavailable without adding destinations', () => {
    const page: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(page.querySelectorAll('button'));

    expect(buttons).toHaveLength(2);
    expect(buttons.every((button) => button.disabled)).toBe(true);
    expect(page.querySelector('a')).toBeNull();
    expect(page.textContent).toContain('Coming soon');
  });
});
