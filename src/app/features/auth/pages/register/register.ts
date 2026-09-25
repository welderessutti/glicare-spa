import { Component, inject, signal } from '@angular/core';
import {
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  NonNullableFormBuilder,
} from '@angular/forms';
import { AuthService } from '../../services/auth-service';
import { RegisterRequest } from '../../models/requests/register-request';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-register',
  styleUrl: './register.css',
  templateUrl: './register.html',
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly isLoading = signal(false);
  protected readonly form = this.fb.group(
    {
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: this.passwordMatchValidator(),
    },
  );

  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password')?.value;
      const confirmPassword = control.get('confirmPassword')?.value;

      if (password === confirmPassword) {
        return null;
      }
      return { passwordMismatch: true };
    };
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValues = this.form.getRawValue();
    const request: RegisterRequest = {
      fullName: formValues.fullName,
      email: formValues.email,
      password: formValues.password,
    };

    this.isLoading.set(true);

    this.authService
      .register(request)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          console.log('Registered');
        },
        error: (error: HttpErrorResponse) => {
          console.log(error.status);
          console.log(error.error);
        },
      });
  }
}
