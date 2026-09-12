import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppSelect, SelectOption } from './select';

describe('AppSelect', () => {
  let fixture: ComponentFixture<AppSelect<'a' | 'b'>>;
  let component: AppSelect<'a' | 'b'>;
  const options: SelectOption<'a' | 'b'>[] = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  beforeEach(() => {
    fixture = TestBed.createComponent(AppSelect<'a' | 'b'>);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('value', 'a');
    fixture.detectChanges();
  });

  it('shows the label of the selected value', () => {
    const trigger: HTMLElement = fixture.nativeElement.querySelector('.app-select-trigger');
    expect(trigger.textContent).toContain('Option A');
  });

  it('opens the menu on trigger click and lists every option', () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.app-select-trigger');
    trigger.click();
    fixture.detectChanges();

    const menuOptions = fixture.nativeElement.querySelectorAll('.app-select-option');
    expect(menuOptions.length).toBe(2);
  });

  it('emits valueChange and closes the menu when a different option is picked', () => {
    const emitted: string[] = [];
    component.valueChange.subscribe((value) => emitted.push(value));

    component.toggle();
    fixture.detectChanges();
    component.select('b');
    fixture.detectChanges();

    expect(emitted).toEqual(['b']);
    expect(component['open']()).toBe(false);
  });

  it('does not emit when the currently selected option is picked again', () => {
    const emitted: string[] = [];
    component.valueChange.subscribe((value) => emitted.push(value));

    component.select('a');

    expect(emitted).toEqual([]);
  });

  it('opens the menu on ArrowDown and closes it on Escape', () => {
    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    component.onTriggerKeydown(downEvent);
    expect(component['open']()).toBe(true);

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    component.onTriggerKeydown(escapeEvent);
    expect(component['open']()).toBe(false);
  });
});
