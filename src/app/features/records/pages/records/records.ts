import { Component, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-records',
  styleUrl: './records.css',
  templateUrl: './records.html',
})
export class Records {
  protected readonly saveAttempted = signal(false);

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.saveAttempted.set(true);
  }
}
