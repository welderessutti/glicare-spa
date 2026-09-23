import { Component, inject } from '@angular/core';
import { Validators, ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-forgot-password',
  styleUrl: './forgot-password.css',
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = this.form.getRawValue();
    console.log(email);
  }
}
