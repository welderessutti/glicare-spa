import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth-service';
import { LoginRequest } from '../../models/requests/login-request';
import { firstValueFrom, map } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/services/session/session-service';
import { email, form, required, FormRoot, FormField } from '@angular/forms/signals';

@Component({
  imports: [FormRoot, FormField, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly loginModel = signal<LoginRequest>({ email: '', password: '' });
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);
  protected readonly passwordReset = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((params) => params.get('passwordReset') === 'true'),
    ),
    { initialValue: false },
  );
  protected readonly emailInvalid = computed(
    () => this.loginForm.email().touched() && this.loginForm.email().invalid(),
  );
  protected readonly passwordInvalid = computed(
    () => this.loginForm.password().touched() && this.loginForm.password().invalid(),
  );

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  private handleLoginError(error: HttpErrorResponse): void {
    switch (error.status) {
      case 401:
        this.errorMessage.set('Invalid email or password');
        break;
      case 429:
        this.errorMessage.set('Too many login attempts. Please try again later.');
        break;
      default:
        this.errorMessage.set('Unable to sign in right now. Please try again.');
    }
  }

  protected readonly loginForm = form(
    this.loginModel,
    (schemaPath) => {
      required(schemaPath.email, { message: 'Enter your email address.' });
      email(schemaPath.email, { message: 'Enter a valid email address.' });
      required(schemaPath.password, { message: 'Enter your password.' });
    },
    {
      submission: {
        action: async (field) => {
          this.errorMessage.set(null);

          try {
            const authenticatedUser = await firstValueFrom(this.authService.login(field().value()));
            this.sessionService.startSession(authenticatedUser);
            await this.router.navigate(['/dashboard']);
          } catch (error) {
            const httpError = error as HttpErrorResponse;
            this.handleLoginError(httpError);
          }
        },
        onInvalid: (field) => {
          const firstError = field().errorSummary()[0];
          firstError?.fieldTree().focusBoundControl();
        },
      },
    },
  );
}
