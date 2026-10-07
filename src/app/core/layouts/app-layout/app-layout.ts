import { Component, inject, signal } from '@angular/core';
import { SessionService } from '../../services/session/session-service';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-app-layout',
  styleUrl: './app-layout.css',
  templateUrl: './app-layout.html',
})
export class AppLayout {
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  protected readonly user = this.sessionService.user;
  protected readonly isLoggingOut = signal(false);
  protected readonly logoutError = signal('');

  protected readonly primaryNavigation = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    },
    { label: 'Records', route: null, icon: 'M8 3H5v18h14V3h-3 M8 2h8v4H8z M8 11h8 M8 16h5' },
    { label: 'History', route: null, icon: 'M3 11a9 9 0 1 1 2.5 7 M3 4v7h7 M12 7v5l3 2' },
    { label: 'Trends', route: null, icon: 'M4 3v17h17 M7 14l4-4 4 3 6-7' },
  ] as const;

  protected readonly secondaryNavigation = [
    {
      label: 'Profile',
      icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
    },
    { label: 'Settings', icon: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6' },
  ] as const;

  protected readonly mobileNavigation = this.primaryNavigation.slice(0, 3);
  protected readonly moreNavigation = [this.primaryNavigation[3], ...this.secondaryNavigation];

  protected onLogout(): void {
    if (this.isLoggingOut()) return;

    this.logoutError.set('');
    this.isLoggingOut.set(true);

    this.sessionService
      .logout()
      .pipe(finalize(() => this.isLoggingOut.set(false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/auth/login']);
        },
        error: () => {
          this.logoutError.set("We couldn't sign you out. Please try again.");
        },
      });
  }
}
