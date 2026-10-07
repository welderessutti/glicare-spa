import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { VerifyEmailStatus } from '../../models/verify-email-status';

@Component({
  imports: [RouterLink],
  selector: 'app-verify-email',
  styleUrl: './verify-email.css',
  templateUrl: './verify-email.html',
})
export class VerifyEmail implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private token: string | null = null;
  protected readonly verifyEmailStatus = signal<VerifyEmailStatus>('loading');
  protected readonly errorMessage = signal<string | null>(null);
  private redirectIntervalId?: ReturnType<typeof setInterval>;
  protected readonly redirectCountdown = signal<number>(0);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.verifyEmailStatus.set('unavailable');
      return;
    }

    void this.verifyEmailWithToken(this.token);
  }

  ngOnDestroy(): void {
    this.clearRedirectCountdown();
  }

  private clearRedirectCountdown(): void {
    if (this.redirectIntervalId !== undefined) {
      clearInterval(this.redirectIntervalId);
      this.redirectIntervalId = undefined;
    }
  }

  private startRedirectCountdown(): void {
    this.clearRedirectCountdown();
    this.redirectCountdown.set(5);

    this.redirectIntervalId = setInterval(() => {
      const current = this.redirectCountdown();

      if (current <= 1) {
        this.clearRedirectCountdown();

        void this.router.navigate(['/auth/login'], { queryParams: { emailVerified: true } });
        return;
      }

      this.redirectCountdown.set(current - 1);
    }, 1000);
  }

  private handleVerifyEmailError(error: HttpErrorResponse): void {
    switch (error.status) {
      case 400:
        this.verifyEmailStatus.set('invalid');
        this.errorMessage.set('This verification link is invalid.');
        break;

      case 409:
        this.verifyEmailStatus.set('already-verified');
        this.errorMessage.set('Your email address has already been verified. You can sign in.');
        break;

      case 410:
        this.verifyEmailStatus.set('expired');
        this.errorMessage.set(
          'This verification link has expired. Request a new verification email.',
        );
        break;

      case 429:
        this.verifyEmailStatus.set('error');
        this.errorMessage.set('Too many attempts. Please wait before trying again.');
        break;

      default:
        this.verifyEmailStatus.set('error');
        this.errorMessage.set("We couldn't verify your email right now. Please try again.");
    }
  }

  private async verifyEmailWithToken(token: string): Promise<void> {
    this.errorMessage.set(null);
    this.verifyEmailStatus.set('loading');

    try {
      await firstValueFrom(this.authService.verifyEmail(token));
      this.verifyEmailStatus.set('success');
      this.startRedirectCountdown();
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      this.handleVerifyEmailError(httpError);
    }
  }

  protected retryVerification(): void {
    if (!this.token) {
      this.verifyEmailStatus.set('unavailable');
      return;
    }
    void this.verifyEmailWithToken(this.token);
  }
}
