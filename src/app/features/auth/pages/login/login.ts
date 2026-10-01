import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { LoginRequest } from '../../models/requests/login-request';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { SessionService } from '../../../../core/services/session/session-service';
import { email, form, required, FormRoot, FormField } from '@angular/forms/signals';

@Component({
  imports: [FormRoot, FormField],
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
      required(schemaPath.email, { message: 'E-mail is required' });
      email(schemaPath.email, { message: 'Enter a valid email' });
      required(schemaPath.password, { message: 'Password is required' });
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
