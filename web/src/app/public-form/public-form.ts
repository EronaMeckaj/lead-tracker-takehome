import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { environment } from '../../environments/environment';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-public-form',
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatError, MatInput, MatButton],
  templateUrl: './public-form.html',
  styleUrl: './public-form.css',
})
export class PublicForm {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.maxLength(5000)]],
  });

  protected readonly status = signal<SubmitStatus>('idle');
  protected readonly errorMessage = signal('');

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.status.set('submitting');
    this.errorMessage.set('');

    this.http.post(`${environment.apiUrl}/leads`, this.form.getRawValue()).subscribe({
      next: () => {
        this.status.set('success');
        this.form.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.status.set('error');
        this.errorMessage.set(
          err.status === 429
            ? "You're submitting too quickly. Please wait a moment and try again."
            : 'Something went wrong sending your message. Please try again.',
        );
      },
    });
  }
}
