import { Component, inject, signal } from '@angular/core';
import { Validators, ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64)]],
  });
  protected readonly isLoading = signal(false);

  sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);

    const credentials = this.form.getRawValue();
    console.log(credentials);

    await this.sleep(5000);

    this.isLoading.set(false);
  }
}
