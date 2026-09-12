import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const AUTO_DISMISS_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;

  readonly toasts = signal<Toast[]>([]);

  show(message: string, options?: { actionLabel?: string; onAction?: () => void }): void {
    const id = this.nextId++;
    this.toasts.update((current) => [...current, { id, message, ...options }]);
    setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
  }

  dismiss(id: number): void {
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }

  runAction(toast: Toast): void {
    toast.onAction?.();
    this.dismiss(toast.id);
  }
}
