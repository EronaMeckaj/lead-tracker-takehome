import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A native <select>'s open dropdown is rendered by the OS, not the page -
 * its highlight color and (in Chrome on Windows) even its font are outside
 * CSS's reach. This is a small themed replacement: same keyboard/click
 * affordances, fully styled with the app's own tokens.
 */
@Component({
  selector: 'app-select',
  templateUrl: './select.html',
  styleUrl: './select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class AppSelect<T extends string> {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly options = input.required<SelectOption<T>[]>();
  readonly value = input.required<T>();
  readonly ariaLabel = input('');
  readonly valueChange = output<T>();

  protected readonly open = signal(false);

  protected readonly selectedLabel = computed(
    () => this.options().find((option) => option.value === this.value())?.label ?? '',
  );

  toggle(): void {
    this.open.update((isOpen) => !isOpen);
  }

  select(value: T): void {
    this.open.set(false);
    if (value !== this.value()) {
      this.valueChange.emit(value);
    }
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open.set(false);
    } else if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.open.set(true);
    }
  }

  onDocumentClick(event: Event): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
