import { Component, inject, signal } from '@angular/core';
import { SessionService } from '../../services/session/session-service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  imports: [],
  selector: 'app-app-layout',
  styleUrl: './app-layout.css',
  templateUrl: './app-layout.html',
})
export class AppLayout {
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  protected readonly isLoading = signal(false);

  protected onSubmit(): void {
    this.isLoading.set(true);

    this.sessionService
      .logout()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/auth/login']);
        },
      });
  }
}
