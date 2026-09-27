import { Component } from '@angular/core';

type VerificationStatus =
  'loading' | 'success' | 'invalid' | 'expired' | 'already-verified' | 'error';

@Component({
  imports: [],
  selector: 'app-verify-email',
  styleUrl: './verify-email.css',
  templateUrl: './verify-email.html',
})
export class VerifyEmail {}
