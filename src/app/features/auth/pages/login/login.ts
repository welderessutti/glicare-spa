import { Component, inject, signal } from '@angular/core';
import { Validators, ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';
import { AuthService } from '../../services/auth-service';
import { LoginRequest } from '../../models/requests/login-request';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64)]],
  });
  protected readonly isLoading = signal(false);

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValues = this.form.getRawValue();
    const request: LoginRequest = {
      email: formValues.email,
      password: formValues.password,
    };

    this.isLoading.set(true);

    this.authService
      .login(request)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          console.log(response);
        },
        error: (error: HttpErrorResponse) => {
          console.log(error.status);
          console.log(error.error);
        },
      });
  }
}
