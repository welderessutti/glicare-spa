import { Component, inject, signal } from '@angular/core';
import { SessionService } from '../../services/session/session-service';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { APP_NAVIGATION } from '../../config/app-navigation';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-app-layout',
  styleUrl: './app-layout.css',
  templateUrl: './app-layout.html',
})
export class AppLayout {
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  protected readonly appNavigation = APP_NAVIGATION;
  protected readonly user = this.sessionService.user;
  protected readonly isLoggingOut = signal(false);
  protected readonly logoutError = signal('');

  protected readonly primaryNavigation = [
    this.appNavigation.DASHBOARD,
    this.appNavigation.RECORDS,
    this.appNavigation.TRENDS,
  ];

  protected readonly secondaryNavigation = [
    this.appNavigation.PROFILE,
    this.appNavigation.SETTINGS,
  ];

  protected readonly mobileNavigation = this.primaryNavigation.slice(0, 3);
  protected readonly moreNavigation = this.secondaryNavigation;

  protected onLogout(): void {
    if (this.isLoggingOut()) return;

    this.logoutError.set('');
    this.isLoggingOut.set(true);

    this.sessionService
      .logout()
      .pipe(finalize(() => this.isLoggingOut.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/auth/login']);
        },
        error: () => {
          this.logoutError.set("We couldn't sign you out. Please try again.");
        },
      });
  }
}
