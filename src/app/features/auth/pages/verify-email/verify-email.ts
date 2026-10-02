import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type VerificationStatus =
  'loading' | 'success' | 'invalid' | 'expired' | 'already-verified' | 'error';

@Component({
  imports: [RouterLink],
  selector: 'app-verify-email',
  styleUrl: './verify-email.css',
  templateUrl: './verify-email.html',
})
export class VerifyEmail {}
